#!/usr/bin/env node

/**
 * Production Build Script
 * Injects environment variables into HTML for static hosting platforms
 * Run with: node build.js
 */

const fs = require('fs');
const path = require('path');

function buildForProduction() {
  console.log('🔨 Building Smart Health Assistant for production...\n');

  // Environment variables to inject
  const envVars = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID
  };

  // Check for missing environment variables
  const missing = Object.entries(envVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\n   Set them using: export KEY=value');
    console.log('   Or run: KEY=value node build.js\n');
    process.exit(1);
  }

  // HTML files to process
  const htmlFiles = [
    'index.html',
    'login.html',
    'register.html',
    'dashboard.html',
    'profile.html',
    'exercise.html',
    'reports.html'
  ];

  // Create dist directory
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }

  // Copy all files to dist
  console.log('📁 Copying files to dist directory...');
  copyDirRecursive(__dirname, distDir, ['node_modules', '.git', 'dist', '.env']);

  // Inject environment variables into HTML files
  console.log('🔧 Injecting environment variables into HTML files...');
  htmlFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');

      // Inject environment variables as global window variables
      const envScript = `<script>
  // Environment variables injected at build time
  ${Object.entries(envVars).map(([key, value]) => `window.${key} = "${value}";`).join('\n  ')}
</script>`;

      // Insert before the first script tag or at the end of head
      if (content.includes('<script')) {
        content = content.replace(/(<script[^>]*>)/, envScript + '\n    $1');
      } else {
        content = content.replace('</head>', '  ' + envScript + '\n  </head>');
      }

      fs.writeFileSync(filePath, content);
      console.log(`   ✅ ${file}`);
    }
  });

  // Remove secure-config.js from dist (not needed in production)
  const secureConfigPath = path.join(distDir, 'js', 'secure-config.js');
  if (fs.existsSync(secureConfigPath)) {
    fs.unlinkSync(secureConfigPath);
    console.log('🗑️  Removed secure-config.js from production build');
  }

  console.log('\n✅ Production build complete!');
  console.log('📦 Files ready for deployment in ./dist directory');
  console.log('🚀 Deploy the ./dist folder to your hosting platform\n');
}

function copyDirRecursive(src, dest, exclude = []) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (exclude.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      copyDirRecursive(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (require.main === module) {
  buildForProduction();
}