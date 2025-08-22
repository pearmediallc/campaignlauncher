#!/usr/bin/env node

const { spawn } = require('child_process');
const net = require('net');

// List of ports to try in order
const PREFERRED_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

/**
 * Check if a port is available
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port is in use
      } else {
        resolve(false); // Other error, consider port unusable
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true); // Port is available
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find the first available port from the list
 */
async function findAvailablePort() {
  for (const port of PREFERRED_PORTS) {
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      return port;
    }
    console.log(`Port ${port} is in use, trying next...`);
  }
  
  // If all preferred ports are taken, find a random available port
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Start the React app on an available port
 */
async function startApp() {
  try {
    const port = await findAvailablePort();
    
    console.log('\n' + '='.repeat(50));
    console.log(`🚀 Starting React app on port ${port}`);
    console.log(`📱 Access your app at: https://localhost:${port}`);
    console.log('='.repeat(50) + '\n');
    
    // Update the PORT in environment
    process.env.PORT = port;
    process.env.HTTPS = 'true';
    process.env.SSL_CRT_FILE = '../certificates/localhost.crt';
    process.env.SSL_KEY_FILE = '../certificates/localhost.key';
    
    // Start the React app
    const child = spawn('npm', ['start'], {
      env: { ...process.env, PORT: port },
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      console.error('Failed to start the app:', error);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      process.exit(code);
    });
    
  } catch (error) {
    console.error('Error finding available port:', error);
    process.exit(1);
  }
}

// Handle interrupts gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Start the application
startApp();