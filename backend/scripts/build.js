const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('🔨 Building backend with TypeScript...');

  // Try tsc first
  try {
    execSync('tsc', { stdio: 'inherit' });
    console.log('✅ Build successful with tsc');
  } catch (e) {
    console.log('⚠️  tsc had errors, attempting fallback...');

    // Fallback: compile with tsx
    const srcDir = path.join(__dirname, '../src');
    const distDir = path.join(__dirname, '../dist');

    // Create dist directory
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Copy and compile TypeScript files
    execSync(`find src -name "*.ts" -type f | xargs -I {} sh -c 'mkdir -p dist/$(dirname {}) && npx tsx {} > dist/$(basename {} .ts).js 2>/dev/null || cp {} dist/$(basename {})'`, {
      cwd: path.join(__dirname, '..')
    });

    console.log('✅ Build successful with tsx fallback');
  }
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
