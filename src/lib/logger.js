const fs = require('fs');
const path = require('path');
const os = require('os');

// Get Electron app if available
let electronApp;
try {
  const electron = require('electron');
  electronApp = electron.app;
  // When running in renderer process, app might be in remote
  if (!electronApp && electron.remote) {
    electronApp = electron.remote.app;
  }
} catch (e) {
  console.log('Running outside of Electron context');
}

const paths = require('./paths');

// Get app data path and create logs directory
const logsDir = paths.getLogsDirectory({ app: electronApp });
console.log('Logs Directory Path:', logsDir);

// Create logs directory if it doesn't exist
try {
  // Get parent directory
  const appDataPath = paths.getPlatformAppPath({ app: electronApp });
  
  if (!fs.existsSync(appDataPath)) {
    console.log('Creating application directory...');
    fs.mkdirSync(appDataPath, { recursive: true });
    console.log('Application directory created successfully');
  }
  
  if (!fs.existsSync(logsDir)) {
    console.log('Creating logs directory...');
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Logs directory created successfully');
  } else {
    console.log('Logs directory already exists');
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
  // Try to create in user's home directory as fallback
  const fallbackLogsDir = paths.getFallbackLogsDirectory();
  console.log('Attempting to create logs in fallback location:', fallbackLogsDir);
  try {
    if (!fs.existsSync(fallbackLogsDir)) {
      fs.mkdirSync(fallbackLogsDir, { recursive: true });
    }
    console.log('Successfully created logs in fallback location');
    // Use fallback location instead
    logsDir = fallbackLogsDir;
  } catch (fallbackError) {
    console.error('Failed to create logs directory in fallback location:', fallbackError);
  }
}

// Create log file with timestamp
const logFile = path.join(logsDir, `aws-sso-manager-${new Date().toISOString().split('T')[0]}.log`);
console.log('Log file path:', logFile);

// Create write stream
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
console.log('Log stream created successfully');

// Format log message with timestamp
const formatLogMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  ).join(' ');
  return `[${timestamp}] [${level}] ${message} ${formattedArgs}\n`;
};

// Override console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

console.log = (message, ...args) => {
  const formattedMessage = formatLogMessage('INFO', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.log(message, ...args);
};

console.error = (message, ...args) => {
  const formattedMessage = formatLogMessage('ERROR', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.error(message, ...args);
};

console.warn = (message, ...args) => {
  const formattedMessage = formatLogMessage('WARN', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.warn(message, ...args);
};

console.info = (message, ...args) => {
  const formattedMessage = formatLogMessage('INFO', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.info(message, ...args);
};

console.debug = (message, ...args) => {
  const formattedMessage = formatLogMessage('DEBUG', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.debug(message, ...args);
};

// Handle process exit to close log stream
process.on('exit', () => {
  logStream.end();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logStream.end();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logStream.end();
  process.exit(1);
}); 