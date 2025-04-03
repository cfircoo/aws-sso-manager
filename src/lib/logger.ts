import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Get user data path and create logs directory
const userDataPath = app.getPath('userData');
console.log('User Data Path:', userDataPath);

const logsDir = path.join(userDataPath, 'logs');
console.log('Logs Directory Path:', logsDir);

// Create logs directory if it doesn't exist
try {
  if (!fs.existsSync(logsDir)) {
    console.log('Creating logs directory...');
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Logs directory created successfully');
  } else {
    console.log('Logs directory already exists');
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
  // Try to create in a fallback location
  const fallbackLogsDir = path.join(process.env.HOME || '', '.aws-sso-manager', 'logs');
  console.log('Attempting to create logs in fallback location:', fallbackLogsDir);
  try {
    if (!fs.existsSync(fallbackLogsDir)) {
      fs.mkdirSync(fallbackLogsDir, { recursive: true });
    }
    console.log('Successfully created logs in fallback location');
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
const formatLogMessage = (level: string, message: string, ...args: any[]): string => {
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

console.log = (message: string, ...args: any[]) => {
  const formattedMessage = formatLogMessage('INFO', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.log(message, ...args);
};

console.error = (message: string, ...args: any[]) => {
  const formattedMessage = formatLogMessage('ERROR', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.error(message, ...args);
};

console.warn = (message: string, ...args: any[]) => {
  const formattedMessage = formatLogMessage('WARN', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.warn(message, ...args);
};

console.info = (message: string, ...args: any[]) => {
  const formattedMessage = formatLogMessage('INFO', message, ...args);
  logStream.write(formattedMessage);
  originalConsole.info(message, ...args);
};

console.debug = (message: string, ...args: any[]) => {
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