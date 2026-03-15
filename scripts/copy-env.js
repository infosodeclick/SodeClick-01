#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to copy environment files
function copyEnvFile(source, target) {
  try {
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`✅ Copied ${path.basename(source)} to ${path.basename(target)}`);
      return true;
    } else {
      console.warn(`⚠️  Source file ${source} not found`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error copying ${source}:`, error.message);
    return false;
  }
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const frontendDir = path.join(rootDir, 'frontend');
  const backendDir = path.join(rootDir, 'backend');

  console.log('📝 Copying environment files...');
  
  copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
  copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));
  
  console.log('✅ Environment files copied\n');
}

main();

