// config.js - Centralized configuration management
// Handles both development (secure-config.js) and production (environment variables) environments

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  loadConfig() {
    // Priority: Environment variables (production) > window.secureConfig (development)
    const config = {
      GEMINI_API_KEY: this.getConfigValue('GEMINI_API_KEY'),
      FIREBASE_CONFIG: {
        apiKey: this.getConfigValue('FIREBASE_API_KEY'),
        authDomain: this.getConfigValue('FIREBASE_AUTH_DOMAIN'),
        projectId: this.getConfigValue('FIREBASE_PROJECT_ID'),
        storageBucket: this.getConfigValue('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.getConfigValue('FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.getConfigValue('FIREBASE_APP_ID')
      }
    };

    return config;
  }

  getConfigValue(key) {
    // First try environment variables (injected by hosting platforms)
    if (typeof window !== 'undefined' && window[key]) {
      return window[key];
    }

    // Then try secure-config.js (development)
    if (typeof window !== 'undefined' && window.secureConfig) {
      // Handle nested Firebase config properties
      if (key.startsWith('FIREBASE_') && key !== 'FIREBASE_CONFIG') {
        const firebaseKeyMap = {
          'FIREBASE_API_KEY': 'apiKey',
          'FIREBASE_AUTH_DOMAIN': 'authDomain',
          'FIREBASE_PROJECT_ID': 'projectId',
          'FIREBASE_STORAGE_BUCKET': 'storageBucket',
          'FIREBASE_MESSAGING_SENDER_ID': 'messagingSenderId',
          'FIREBASE_APP_ID': 'appId'
        };
        const firebaseKey = firebaseKeyMap[key];
        if (firebaseKey && window.secureConfig.FIREBASE_CONFIG && window.secureConfig.FIREBASE_CONFIG[firebaseKey]) {
          return window.secureConfig.FIREBASE_CONFIG[firebaseKey];
        }
      }
      // Direct property access
      if (window.secureConfig[key]) {
        return window.secureConfig[key];
      }
    }

    // For Firebase config object
    if (key === 'FIREBASE_CONFIG' && typeof window !== 'undefined') {
      if (window.FIREBASE_CONFIG) {
        return window.FIREBASE_CONFIG;
      }
      if (window.secureConfig && window.secureConfig.FIREBASE_CONFIG) {
        return window.secureConfig.FIREBASE_CONFIG;
      }
    }

    return null;
  }

  validateConfig() {
    const required = ['GEMINI_API_KEY'];
    const missing = [];

    required.forEach(key => {
      if (!this.config[key]) {
        missing.push(key);
      }
    });

    // Check Firebase config
    if (!this.config.FIREBASE_CONFIG || !this.config.FIREBASE_CONFIG.apiKey) {
      missing.push('FIREBASE_CONFIG');
    }

    if (missing.length > 0) {
      const errorMsg = `Missing required configuration: ${missing.join(', ')}\n\n` +
        `For development: Create js/secure-config.js from .env.example\n` +
        `For production: Set environment variables on your hosting platform\n\n` +
        `Required environment variables:\n` +
        `- GEMINI_API_KEY\n` +
        `- FIREBASE_API_KEY\n` +
        `- FIREBASE_AUTH_DOMAIN\n` +
        `- FIREBASE_PROJECT_ID\n` +
        `- FIREBASE_STORAGE_BUCKET\n` +
        `- FIREBASE_MESSAGING_SENDER_ID\n` +
        `- FIREBASE_APP_ID`;

      console.error(errorMsg);
      throw new Error(`Configuration validation failed: ${missing.join(', ')}`);
    }
  }

  get(key) {
    return this.config[key];
  }

  getFirebaseConfig() {
    return this.config.FIREBASE_CONFIG;
  }
}

// Create global instance
const config = new ConfigManager();

// Export for use in other files
window.appConfig = config;