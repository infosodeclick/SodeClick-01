const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Restarting backend server...');

// Kill existing Node.js processes
const killProcesses = () => {
  return new Promise((resolve) => {
    const kill = spawn('taskkill', ['/F', '/IM', 'node.exe'], { 
      shell: true,
      stdio: 'pipe' 
    });
    
    kill.on('close', () => {
      console.log('✅ Killed existing Node.js processes');
      resolve();
    });
  });
};

// Start new server
const startServer = () => {
  console.log('🚀 Starting new backend server...');
  
  const server = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  });
  
  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });
  
  server.on('close', (code) => {
    console.log(`📺 Server process exited with code ${code}`);
  });
};

// Main restart process
const restart = async () => {
  try {
    await killProcesses();
    setTimeout(startServer, 2000); // Wait 2 seconds before starting
  } catch (error) {
    console.error('❌ Error restarting server:', error);
  }
};

restart();
