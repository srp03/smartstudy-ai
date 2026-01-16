// config.js - Centralized configuration management
// Handles both development (secure-config.js) and production (environment variables) environments
// For production on Vercel: Use NEXT_PUBLIC_* environment variables (accessible in browser)

class ConfigManager {
  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  loadConfig() {
    // Priority: Environment variables (NEXT_PUBLIC_) > window.secureConfig (development)
    const config = {
      GEMINI_API_KEY: this.getConfigValue('GEMINI_API_KEY'),
      FIREBASE_CONFIG: {
        apiKey: this.getConfigValue('FIREBASE_API_KEY'),
        authDomain: this.getConfigValue('FIREBASE_AUTH_DOMAIN'),
        projectId: this.getConfigValue('FIREBASE_PROJECT_ID'),
        storageBucket: this.getConfigValue('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.getConfigValue('FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.getConfigValue('FIREBASE_APP_ID')
      },
      SUPABASE_URL: this.getConfigValue('SUPABASE_URL'),
      SUPABASE_ANON_KEY: this.getConfigValue('SUPABASE_ANON_KEY')
    };

    return config;
  }

  getConfigValue(key) {
    // First try environment variables with NEXT_PUBLIC_ prefix (for browser access on Vercel)
    const envKey = `NEXT_PUBLIC_${key}`;
    if (typeof window !== 'undefined' && window[envKey]) {
      console.log(`✅ Loaded ${key} from environment: ${envKey}`);
      return window[envKey];
    }

    // Fallback: check if env var directly accessible (less common but safe)
    if (typeof window !== 'undefined' && window[key]) {
      console.log(`✅ Loaded ${key} from environment (direct)`);
      return window[key];
    }

    // Then try secure-config.js (development only - local file, never committed)
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
          console.log(`✅ Loaded ${key} from secure-config.js`);
          return window.secureConfig.FIREBASE_CONFIG[firebaseKey];
        }
      }
      // Direct property access from secure-config
      if (window.secureConfig[key]) {
        console.log(`✅ Loaded ${key} from secure-config.js`);
        return window.secureConfig[key];
      }
    }

    // For Firebase config object
    if (key === 'FIREBASE_CONFIG' && typeof window !== 'undefined') {
      if (window.FIREBASE_CONFIG) {
        console.log('✅ Loaded FIREBASE_CONFIG from window');
        return window.FIREBASE_CONFIG;
      }
      if (window.secureConfig && window.secureConfig.FIREBASE_CONFIG) {
        console.log('✅ Loaded FIREBASE_CONFIG from secure-config.js');
        return window.secureConfig.FIREBASE_CONFIG;
      }
    }

    return null;
  }

  validateConfig() {
    const required = ['FIREBASE_CONFIG'];
    const missing = [];

    // Check Firebase config
    if (!this.config.FIREBASE_CONFIG || !this.config.FIREBASE_CONFIG.apiKey) {
      missing.push('FIREBASE_CONFIG (Firebase frontend credentials)');
    }

    if (missing.length > 0) {
      const errorMsg = `Missing required configuration: ${missing.join(', ')}\n\n` +
        `For development:\n` +
        `  1. Create js/secure-config.js from .env.example\n` +
        `  2. Include it in HTML before firebase-config.js\n\n` +
        `For production (Vercel):\n` +
        `  1. Set environment variables with NEXT_PUBLIC_ prefix in Vercel dashboard\n` +
        `  2. Required NEXT_PUBLIC_ variables:\n` +
        `     - NEXT_PUBLIC_FIREBASE_API_KEY\n` +
        `     - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n` +
        `     - NEXT_PUBLIC_FIREBASE_PROJECT_ID\n` +
        `     - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n` +
        `     - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n` +
        `     - NEXT_PUBLIC_FIREBASE_APP_ID\n` +
        `     - NEXT_PUBLIC_SUPABASE_URL\n` +
        `     - NEXT_PUBLIC_SUPABASE_ANON_KEY`;

      console.error(errorMsg);
      // Warning but don't crash - some apps may work without these
      console.warn('⚠️ Configuration validation: Some optional values are missing');
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