module.exports = {
  // i18n plugin configuration
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableInSFC: false
    }
  },

  devServer: {
    // Fix WebSocket issues
    host: 'localhost',
    hot: false, // Disable hot reload to avoid WebSocket errors
    liveReload: false, // Disable live reload
    webSocketServer: false, // Disable WebSocket server
    
    // API proxy for development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        logLevel: 'debug'
      }
    }
  },
  
  // Disable source maps in production for smaller builds
  productionSourceMap: false,
  
  // Configure public path for Vercel deployment
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/'
}