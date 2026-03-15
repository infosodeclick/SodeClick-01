#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to check if directory exists
function checkDirectory(dir) {
  return fs.existsSync(dir);
}

// Function to run npm install in a directory
function runNpmInstall(dir) {
  return new Promise((resolve, reject) => {
    console.log(`Installing dependencies in ${dir}...`);
    const npm = spawn('npm', ['install'], { 
      cwd: dir, 
      stdio: 'inherit',
      shell: false 
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Dependencies installed in ${dir}`);
        resolve();
      } else {
        reject(new Error(`Failed to install dependencies in ${dir}`));
      }
    });
  });
}

// Function to run dev server
function runDevServer(dir, script) {
  console.log(`Starting ${script} in ${dir}...`);
  return spawn('npm', ['run', script], { 
    cwd: dir, 
    stdio: 'inherit',
    shell: false 
  });
}

async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');

    // Check if directories exist
    if (!checkDirectory(frontendDir)) {
      console.error('❌ Frontend directory not found');
      process.exit(1);
    }

    if (!checkDirectory(backendDir)) {
      console.error('❌ Backend directory not found');
      process.exit(1);
    }

    // Install dependencies if node_modules doesn't exist
    const frontendNodeModules = path.join(frontendDir, 'node_modules');
    const backendNodeModules = path.join(backendDir, 'node_modules');

    if (!checkDirectory(frontendNodeModules)) {
      await runNpmInstall(frontendDir);
    }

    if (!checkDirectory(backendNodeModules)) {
      await runNpmInstall(backendDir);
    }

    // Start both servers
    console.log('🚀 Starting development servers...');
    
    const frontendProcess = runDevServer(frontendDir, 'dev');
    const backendProcess = runDevServer(backendDir, 'dev');

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping development servers...');
      frontendProcess.kill('SIGINT');
      backendProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Stopping development servers...');
      frontendProcess.kill('SIGTERM');
      backendProcess.kill('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
