#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

// Function to clear macOS quarantine attributes and fix permissions for binaries
function clearQuarantineAttributes(dir) {
  if (process.platform !== 'darwin') return; // Only needed on macOS
  
  try {
    const { execSync } = require('child_process');
    console.log(`   Fixing permissions in ${path.basename(dir)}...`);
    
    // Clear quarantine attributes from all files (not just .node files)
    // This includes esbuild binaries and other native executables
    try {
      execSync(`find "${dir}" -type f \\( -name "*.node" -o -name "esbuild" -o -name "esbuild.exe" -o -path "*/bin/*" \\) -exec xattr -d com.apple.quarantine {} \\; 2>/dev/null || true`, {
        stdio: 'ignore'
      });
    } catch (e) {
      // Ignore - some files might not have quarantine attributes
    }
    
    // Set execute permissions for binary files
    try {
      // Fix esbuild binaries specifically
      execSync(`find "${dir}" -type f -name "esbuild" -exec chmod +x {} \\; 2>/dev/null || true`, {
        stdio: 'ignore'
      });
      // Fix all files in bin directories
      execSync(`find "${dir}" -type f -path "*/bin/*" -exec chmod +x {} \\; 2>/dev/null || true`, {
        stdio: 'ignore'
      });
      // Fix .node files (native modules)
      execSync(`find "${dir}" -type f -name "*.node" -exec chmod +x {} \\; 2>/dev/null || true`, {
        stdio: 'ignore'
      });
    } catch (e) {
      // Ignore permission errors
    }
  } catch (error) {
    // Ignore errors - this is just a helper to prevent Gatekeeper issues
    console.warn(`   ⚠️  Warning: Could not fix all permissions (this is usually okay)`);
  }
}

// Function to get concurrently binary path
function getConcurrentlyBin(rootDir) {
  const concurrentlyBin = path.join(rootDir, 'node_modules', 'concurrently', 'dist', 'bin', 'concurrently.js');
  if (fs.existsSync(concurrentlyBin)) {
    return concurrentlyBin;
  }
  return null;
}

async function main() {
  // Ensure clean exit on uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    const rootDir = path.resolve(__dirname, '..');
    const frontendDir = path.join(rootDir, 'frontend');
    const backendDir = path.join(rootDir, 'backend');
    const isWindows = process.platform === 'win32';

    console.log('🚀 Starting development environment...\n');
    console.log(`Platform: ${os.platform()} (${os.arch()})\n`);

    // Check if directories exist
    if (!fs.existsSync(frontendDir)) {
      console.error('❌ Frontend directory not found');
      process.exit(1);
    }

    if (!fs.existsSync(backendDir)) {
      console.error('❌ Backend directory not found');
      process.exit(1);
    }

    // Copy environment files
    console.log('📝 Copying environment files...');
    copyEnvFile(path.join(frontendDir, 'env.development'), path.join(frontendDir, '.env'));
    copyEnvFile(path.join(backendDir, 'env.development'), path.join(backendDir, '.env'));

    // Clear macOS quarantine attributes from native modules (prevents Gatekeeper warnings)
    if (process.platform === 'darwin') {
      console.log('🔓 Clearing macOS quarantine attributes...');
      clearQuarantineAttributes(frontendDir);
      clearQuarantineAttributes(backendDir);
    }

    console.log('\n🚀 Starting servers with concurrently...');
    console.log('Backend will run on http://localhost:5000');
    console.log('Frontend will run on http://localhost:5173');
    console.log('Press Ctrl+C to stop all servers\n');
    
    // Use concurrently binary directly via node to avoid permission issues
    // This avoids shell: true deprecation warnings and permission denied errors
    const concurrentlyBin = getConcurrentlyBin(rootDir);
    
    if (concurrentlyBin) {
      // Use concurrently binary directly via node - no shell needed, no permission issues
      // Add -k to kill other processes if one exits or dies
      const concurrently = spawn('node', [
        concurrentlyBin,
        '-n', 'backend,frontend',
        '-c', 'blue,green',
        '-k',
        'npm run dev:backend',
        'npm run dev:frontend'
      ], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: false // No shell needed when using node directly
      });

      let isExiting = false;

      // Handle process termination
      const cleanup = () => {
        if (isExiting) return;
        isExiting = true;
        console.log('\n🛑 Stopping development servers...');
        try {
          // Send signal to concurrently process
          if (isWindows) {
            concurrently.kill('SIGTERM');
          } else {
            concurrently.kill('SIGINT');
          }
          // Force kill after 2 seconds if still running
          setTimeout(() => {
            try {
              if (!concurrently.killed) {
                concurrently.kill('SIGKILL');
              }
            } catch (e) {
              // Ignore
            }
            process.exit(0);
          }, 2000);
        } catch (e) {
          process.exit(0);
        }
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Track if concurrently has exited
      let hasExited = false;

      concurrently.on('exit', (code) => {
        hasExited = true;
        if (!isExiting) {
          // Exit immediately without waiting
          process.exit(code || 0);
        }
      });

      concurrently.on('error', (error) => {
        console.error('❌ Error starting concurrently:', error.message);
        console.error('Please make sure concurrently is installed: npm install concurrently --save-dev');
        process.exit(1);
      });

      // Note: We don't need a timeout here because concurrently will exit naturally
      // when all processes exit or when user presses Ctrl+C
    } else {
      // Fallback: use npx concurrently if binary not found
      const concurrently = spawn('npx', [
        '--yes',
        'concurrently',
        '-n', 'backend,frontend',
        '-c', 'blue,green',
        '-k',
        'npm run dev:backend',
        'npm run dev:frontend'
      ], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: false // No shell needed for simple commands
      });

      let isExiting = false;

      // Handle process termination
      const cleanup = () => {
        if (isExiting) return;
        isExiting = true;
        console.log('\n🛑 Stopping development servers...');
        try {
          // Send signal to concurrently process
          if (isWindows) {
            concurrently.kill('SIGTERM');
          } else {
            concurrently.kill('SIGINT');
          }
          // Force kill after 2 seconds if still running
          setTimeout(() => {
            try {
              if (!concurrently.killed) {
                concurrently.kill('SIGKILL');
              }
            } catch (e) {
              // Ignore
            }
            process.exit(0);
          }, 2000);
        } catch (e) {
          process.exit(0);
        }
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Track if concurrently has exited
      let hasExited = false;

      concurrently.on('exit', (code) => {
        hasExited = true;
        if (!isExiting) {
          // Exit immediately without waiting
          process.exit(code || 0);
        }
      });

      concurrently.on('error', (error) => {
        console.error('❌ Error starting concurrently:', error.message);
        console.error('Please make sure concurrently is installed: npm install concurrently --save-dev');
        process.exit(1);
      });

      // Note: We don't need a timeout here because concurrently will exit naturally
      // when all processes exit or when user presses Ctrl+C
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

