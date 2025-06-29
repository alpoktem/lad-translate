<template>
  <div class="translation-widget">
    <!-- <h1 v-t="'welcome'"></h1> -->
    <div class="container">
      <WidgetHeader></WidgetHeader>
      <div class="columns">
        <div class="column">
          <div class="tranlation-box">
            <div class="languages is-flex">
              <div
                class="language"
                v-for="(lang, i) in validLanguages"
                :key="i"
              >
                <button
                  class="button zis-warning mr-1"
                  :class="{
                    'is-primary': sourceLang.code === lang.code,
                    'is-warning': sourceLang.code !== lang.code,
                  }"
                  @click="setSouceLang(lang)"
                >{{ lang.name }}</button>
              </div>
            </div>
            <div class="xbox mt-3">
              <div class="area is-relative">
                <textarea
                  v-model="source"
                  class="textarea"
                  :placeholder="$t('Type something to translate...')"
                  :maxlength="maxCharacters"
                ></textarea>
                
                <!-- Character counter -->
                <div class="character-counter" :class="{ 'has-text-danger': source.length > maxCharacters * 0.9 }">
                  {{ source.length }} / {{ maxCharacters }}
                </div>

                <span
                  v-if="sourceLang.code === 'lad' && source"
                  @click="voice(source)"
                  class="voice material-icons"
                  :class="{
                    clickable: !playing,
                    'has-text-grey-darker': !playing,
                    'has-text-grey-light': playing,
                  }"
                  >record_voice_over</span
                >
              </div>
              <!-- Random button removed as requested
              <button
                class="button is-primary mt-3"
                @click="random"
                v-t="'Random'"
              ></button>
              -->
            </div>
          </div>
        </div>
        <div class="column is-1">
          <div class="actions">
            <button class="button is-primary" @click="translate">
              <span class="material-icons" v-if="!translating"
                >keyboard_arrow_right</span
              >
              <span class="material-icons spin" v-if="translating"
                >autorenew</span
              >
            </button>
          </div>
        </div>
        <div class="column">
          <div class="tranlation-box">
            <div class="languages is-flex">
              <div
                class="language"
                v-for="(lang, i) in validLanguages"
                :key="i"
              >
                <button
                  :disabled="!isTargetLangEnabled(lang.code)"
                  class="button zis-warning mr-1"
                  :class="{
                    'is-primary': targetLang.code === lang.code,
                    'is-warning': targetLang.code !== lang.code,
                  }"
                  @click="setTargetLang(lang)"
                >{{ lang.name }}</button>
              </div>
            </div>
            <div class="xbox mt-3">
              <div class="area is-relative">
                <textarea
                  v-model="target"
                  class="textarea"
                  placeholder=""
                  :readonly="!contribute"
                ></textarea>

                <span
                  v-if="targetLang.code === 'lad' && target"
                  @click="voice(target)"
                  class="voice material-icons"
                  :class="{
                    clickable: !playing,
                    'has-text-grey-darker': !playing,
                    'has-text-grey-light': playing,
                  }"
                  >record_voice_over</span
                >
              </div>

              <div class="tags">
                <span class="tag" v-if="contribute"
                  ><span
                    class="material-icons is-size-7"
                    style="color: rgb(209, 16, 16)"
                    >info</span
                  >{{ $t("Contribute") }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
      <WidgetFooter></WidgetFooter>
    </div>

    <!-- Contribution Modal -->
    <div class="modal" :class="{ 'is-active': contribute }">
      <div class="modal-background"></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title" v-t="'Contribute'"></p>
          <button class="delete" aria-label="close" @click="cancelContribute"></button>
        </header>
        <section class="modal-card-body">
          <img :src="require(`@/assets/contributionhelp-${$i18n.locale}.png`)" class="help-image" />
        </section>
        <footer class="modal-card-foot">
          <button class="button is-success" @click="submitContribution" v-t="'Submit'"></button>
          <button class="button" @click="cancelContribute" v-t="'Cancel'"></button>
        </footer>
      </div>
    </div>

    <!-- Help Modal -->
    <div class="modal" :class="{ 'is-active': helpModalActive }">
      <div class="modal-background"></div>
      <div class="modal-content">
        <div class="modal-content">
          <div class="box">
            <img :src="require(`@/assets/contributionhelp-${$i18n.locale}.png`)" class="help-image" />
          </div>
        </div>
      </div>
      <button class="modal-close is-large" aria-label="close"></button>
    </div>
  </div>
</template>

<script>
import { toast } from "bulma-toast";
import WidgetHeader from "./WidgetHeader.vue";
import WidgetFooter from "./WidgetFooter.vue";

export default {
  name: "TranslateWidget",
  components: { WidgetHeader, WidgetFooter },
  props: {
    msg: String,
  },
  data() {
    return {
      // Static language configuration - no longer fetched from API
      languages: [
        { code: "lad", name: "Ladino" },
        { code: "en", name: "English" },
        { code: "es", name: "Spanish" },
        { code: "tr", name: "Turkish" }
      ],
      models: {
        // Static model configuration for language pair validation
        lad: { en: true, es: true, tr: true },
        en: { lad: true },
        es: { lad: true },
        tr: { lad: true }
      },
      sourceLang: "",
      targetLang: "",
      source: "",
      target: "",
      contribute: false,
      translating: false,
      playing: false,
      helpModalActive: false,
      // Character limit - will be set in mounted()
      maxCharacters: 500,
      // Random sentences for the Random button
      randomSentences: [
        "Buenos días, ¿cómo está usted?",
        "Muchas gracias por su ayuda.",
        "¿Puede usted ayudarme, por favor?",
        "Me alegro de conocerle.",
        "Que tenga un buen día."
      ]
    };
  },
  computed: {
    postData() {
      return {
        source_text: this.source,
        source_language: this.sourceLang.code,
        target_language: this.targetLang.code
      };
    },
    validLanguages() {
      return this.languages.filter((l) => l.code !== "xx");
    },
    // Compute the API endpoint based on environment
    apiEndpoint() {
      // In development, proxy through Vue dev server
      if (process.env.NODE_ENV === 'development') {
        return '/api/translate';
      }
      // In production on Vercel, use the full URL
      // This handles both preview deployments and production
      return '/api/translate';
    }
  },
  mounted() {
    // Set max characters from environment variable
    this.maxCharacters = parseInt(process.env.VUE_APP_MAX_CHARACTERS || '500');
    
    this.initializeLanguages();
    this.prepareModal();
  },
  methods: {
    initializeLanguages() {
      // Initialize with default language pair (ensuring one is always Ladino)
      this.sourceLang = this.languages.find((l) => l.code !== "lad");
      this.targetLang = this.languages.find((l) => l.code === "lad");
    },
    
    isTargetLangEnabled(langCode) {
      if (this.sourceLang.code !== "lad" && langCode !== "lad") {
        return false;
      }
      return this.models[this.sourceLang.code]
        ? this.models[this.sourceLang.code][langCode] !== undefined
        : false;
    },
    
    setSouceLang(lang) {
      this.sourceLang = lang;
      if (lang.code === "lad") {
        this.targetLang = this.languages.find((l) => l.code !== "lad");
      }
      if (lang.code !== "lad") {
        this.targetLang = this.languages.find((l) => l.code === "lad");
      }
    },
    
    setTargetLang(lang) {
      this.targetLang = lang;
      if (lang.code === "lad" && this.sourceLang.code === "lad") {
        this.sourceLang = this.languages.find((l) => l.code !== "lad");
      }
      if (lang.code !== "lad") {
        this.sourceLang = this.languages.find((l) => l.code === "lad");
      }
    },
    
    async translate() {
      if (!this.source.trim()) {
        toast({
          message: "Please enter some text to translate",
          type: "is-warning",
          duration: 3000,
          position: "top-center",
        });
        return;
      }

      // Check character limit
      if (this.source.length > this.maxCharacters) {
        toast({
          message: `Text is too long. Maximum ${this.maxCharacters} characters allowed. Current: ${this.source.length}`,
          type: "is-warning",
          duration: 4000,
          position: "top-center",
        });
        return;
      }

      this.translating = true;
      this.target = "";
      
      try {
        const response = await this.axios.post(this.apiEndpoint, this.postData, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.data && response.data.translation) {
          this.target = response.data.translation;
        } else {
          throw new Error('Invalid response format');
        }
        
      } catch (error) {
        console.error('Translation error:', error);
        let errorMessage = "Translation failed. Please try again.";
        
        if (error.response?.status === 404) {
          errorMessage = "Translation service not found. Make sure the API is running.";
        } else if (error.response?.status === 500) {
          errorMessage = error.response?.data?.error || "Server error. Please check your Claude API key configuration.";
        } else if (error.message === 'Network Error') {
          errorMessage = "Network error. Please check your internet connection and API configuration.";
        }
        
        toast({
          message: errorMessage,
          type: "is-danger",
          duration: 5000,
          position: "top-center",
        });
      } finally {
        this.translating = false;
      }
    },
    
    random() {
      const randomIndex = Math.floor(Math.random() * this.randomSentences.length);
      this.source = this.randomSentences[randomIndex];
    },
    
    voice(text) {
      if (this.playing) return;
      
      this.playing = true;
      try {
        // Simple TTS implementation
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = this.sourceLang.code === 'lad' ? 'es-ES' : this.sourceLang.code;
          utterance.onend = () => {
            this.playing = false;
          };
          utterance.onerror = () => {
            this.playing = false;
          };
          speechSynthesis.speak(utterance);
        } else {
          this.playing = false;
          toast({
            message: "Speech synthesis not supported in this browser",
            type: "is-warning",
            duration: 3000,
            position: "top-center",
          });
        }
      } catch (error) {
        this.playing = false;
        console.error('TTS error:', error);
      }
    },
    
    submitContribution() {
      toast({
        message: this.$t("Thank you for your contribution"),
        type: "is-primary",
        duration: 5000,
        position: "top-center",
        closeOnClick: true,
        opacity: 0.7
      });
      this.contribute = false;
    },
    
    cancelContribute() {
      this.contribute = false;
    },
    
    prepareModal() {
      // Modal initialization if needed
    }
  },
};
</script>

<style scoped>
.translation-widget {
  min-height: 500px;
}

.xbox {
  position: relative;
}

.area {
  position: relative;
}

.voice {
  position: absolute;
  bottom: 10px;
  right: 10px;
  cursor: pointer;
  user-select: none;
}

.voice.clickable:hover {
  color: #3273dc !important;
}

.character-counter {
  position: absolute;
  bottom: 10px;
  left: 10px;
  font-size: 0.875rem;
  color: #b5b5b5;
}

.character-counter.has-text-danger {
  color: #ff3860;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.help-image {
  max-width: 100%;
  height: auto;
}

.tags {
  margin-top: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>