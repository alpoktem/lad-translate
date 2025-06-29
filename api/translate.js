// api/translate.js - Vercel Serverless Function for Claude API Translation
import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';

// Global cache for system prompt and knowledge base
// These persist between invocations in the same container
let cachedSystemPrompt = null;
let cachedKnowledgeBase = null;

/**
 * Load system prompt from file
 */
async function loadSystemPrompt() {
  // Return cached version if available
  if (cachedSystemPrompt) {
    console.log('Using cached system prompt');
    return cachedSystemPrompt;
  }
  
  try {
    const promptPath = path.join(process.cwd(), 'public', 'prompts', 'system_prompt.txt');
    cachedSystemPrompt = await fs.readFile(promptPath, 'utf-8');
    console.log('System prompt loaded and cached successfully');
    return cachedSystemPrompt;
  } catch (error) {
    console.error('Failed to load system prompt:', error);
    // Fallback system prompt for Ladino translation
    cachedSystemPrompt = `You are an expert Ladino (Judeo-Spanish) translator. Translate text accurately between Ladino, English, Spanish, and Turkish while preserving meaning, cultural context, and appropriate register. 

Key guidelines:
- Maintain the original tone and style
- Preserve cultural and historical context
- Use appropriate Ladino orthography
- Handle both formal and colloquial language
- Provide natural, fluent translations

Respond with only the translation, no explanations unless specifically requested.`;
    return cachedSystemPrompt;
  }
}

/**
 * Load and format knowledge base from resources directory
 * Dynamically loads ALL .txt files, just like your Python bot
 */
async function loadKnowledgeBase() {
  // Return cached version if available
  if (cachedKnowledgeBase) {
    console.log('Using cached knowledge base');
    return cachedKnowledgeBase;
  }
  
  try {
    const resourcesDir = path.join(process.cwd(), 'public', 'resources');
    
    // Check if resources directory exists
    try {
      await fs.access(resourcesDir);
    } catch (error) {
      console.log('No resources directory found, continuing without knowledge base');
      cachedKnowledgeBase = '<knowledge_base>\n<!-- No resources directory found -->\n</knowledge_base>';
      return cachedKnowledgeBase;
    }
    
    // Read all files in resources directory
    const files = await fs.readdir(resourcesDir);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    if (txtFiles.length === 0) {
      console.log('No .txt files found in resources directory');
      cachedKnowledgeBase = '<knowledge_base>\n<!-- No .txt files found -->\n</knowledge_base>';
      return cachedKnowledgeBase;
    }
    
    let knowledgeContent = '<knowledge_base>\n';
    
    // Load all .txt files dynamically
    for (const file of txtFiles) {
      try {
        const filePath = path.join(resourcesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const filename = path.basename(file, '.txt');
        knowledgeContent += `<${filename}>\n${content.trim()}\n</${filename}>\n`;
        console.log(`Loaded knowledge resource: ${file}`);
      } catch (error) {
        console.error(`Failed to load ${file}:`, error);
      }
    }
    
    knowledgeContent += '</knowledge_base>';
    cachedKnowledgeBase = knowledgeContent;
    console.log(`Knowledge base loaded and cached with ${txtFiles.length} resources`);
    return cachedKnowledgeBase;
    
  } catch (error) {
    console.error('Error accessing resources directory:', error);
    cachedKnowledgeBase = '<knowledge_base>\n<!-- Error loading resources -->\n</knowledge_base>';
    return cachedKnowledgeBase;
  }
}

/**
 * Get language name for prompt context
 */
function getLanguageName(code) {
  const languageMap = {
    'lad': 'Ladino (Judeo-Spanish)',
    'en': 'English',
    'es': 'Spanish',
    'tr': 'Turkish'
  };
  return languageMap[code] || code;
}

// Initialize cache on module load
console.log('Translation API initializing...');
Promise.all([loadSystemPrompt(), loadKnowledgeBase()])
  .then(() => console.log('Translation API ready with cached resources'))
  .catch(err => console.error('Failed to preload resources:', err));

/**
 * Main translation handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { source_text, source_language, target_language } = req.body;
    
    // Validation
    if (!source_text || !source_language || !target_language) {
      return res.status(400).json({ 
        error: 'Missing required fields: source_text, source_language, target_language' 
      });
    }

    // Validate character limit
    const maxCharacters = parseInt(process.env.VUE_APP_MAX_CHARACTERS || process.env.MAX_CHARACTERS || '500');
    if (source_text.length > maxCharacters) {
      return res.status(400).json({ 
        error: `Text exceeds maximum length of ${maxCharacters} characters. Current length: ${source_text.length}` 
      });
    }

    // Validate that one language is always Ladino
    if (source_language !== 'lad' && target_language !== 'lad') {
      return res.status(400).json({ 
        error: 'One language must be Ladino (lad)' 
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    // Load system resources
    const systemPrompt = await loadSystemPrompt();
    const knowledgeBase = await loadKnowledgeBase();

    // Prepare the translation prompt
    const translationPrompt = `Translate the following text from ${getLanguageName(source_language)} to ${getLanguageName(target_language)}:

"${source_text}"

Provide only the translation.`;

    // Get model from environment or use default
    const model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022";

    // Make API call to Claude with prompt caching
    // Using system message array format for better caching
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 2048,
      temperature: 0.3,
      system: [
        {
          type: "text",
          text: systemPrompt
        },
        {
          type: "text",
          text: knowledgeBase,
          cache_control: { type: "ephemeral" }  // Cache the knowledge base
        }
      ],
      messages: [
        {
          role: "user",
          content: translationPrompt
        }
      ]
    });

    // Extract translation from response
    if (response.content && response.content.length > 0) {
      const translation = response.content[0].text.trim();
      
      // Log usage stats (similar to your Python bot)
      const usage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens || 0,
        cache_created: response.usage.cache_creation_input_tokens || 0
      };
      
      console.log(`Translation completed - Input: ${usage.input_tokens}, Output: ${usage.output_tokens}, Cache read: ${usage.cache_read}, Cache created: ${usage.cache_created}`);
      
      return res.status(200).json({
        translation: translation,
        usage: usage,
        source_language: source_language,
        target_language: target_language
      });
      
    } else {
      throw new Error('Empty response from Claude API');
    }

  } catch (error) {
    console.error('Translation API error:', error);
    
    // Return user-friendly error
    return res.status(500).json({
      error: 'Translation failed. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}