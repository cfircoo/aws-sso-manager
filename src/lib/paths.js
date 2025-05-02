const path = require('path');
const os = require('os');

/**
 * Safely checks if a function exists and can be called
 * @param {*} obj - The object to check
 * @param {string} prop - The property name that should be a function
 * @returns {boolean} - True if the property exists and is a function
 */
const canCall = (obj, prop) => {
  return obj && typeof obj[prop] === 'function';
};

/**
 * Resolves platform-specific application data paths for AWS SSO Manager
 * @param {Object} options - Options for path resolution
 * @param {Object} options.app - Optional Electron app object 
 * @param {string} options.subdir - Optional subdirectory to append to the app path
 * @returns {string} - The resolved platform-specific path
 */
const getPlatformAppPath = (options = {}) => {
  const { app, subdir = '' } = options;
  const platform = process.platform;
  let appDataPath;

  try {
    // For Electron app
    if (app && canCall(app, 'getPath')) {
      const userDataPath = app.getPath('userData');
      console.log(`Using Electron app.getPath for app data path: ${userDataPath}`);
      return path.join(userDataPath, subdir);
    }
  } catch (error) {
    console.error('Error getting app path from Electron:', error);
  }

  // Fallback path resolution by platform
  if (platform === 'win32') {
    // Windows: Use AppData/Roaming
    appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'aws-sso-manager');
  } else if (platform === 'darwin') {
    // macOS: Use Library folder
    appDataPath = path.join(os.homedir(), 'Library', 'aws-sso-manager');
  } else {
    // Linux/Unix: Use .config
    appDataPath = path.join(os.homedir(), '.config', 'aws-sso-manager');
  }

  console.log(`Platform-specific app data path for ${platform}:`, appDataPath);
  return subdir ? path.join(appDataPath, subdir) : appDataPath;
};

/**
 * Gets the path to the settings file
 * @param {Object} options - Options for path resolution
 * @param {Object} options.app - Optional Electron app object
 * @returns {string} - Path to settings.json
 */
const getSettingsFilePath = (options = {}) => {
  const appPath = getPlatformAppPath(options);
  return path.join(appPath, 'settings.json');
};

/**
 * Gets the path to the logs directory
 * @param {Object} options - Options for path resolution
 * @param {Object} options.app - Optional Electron app object
 * @returns {string} - Path to logs directory
 */
const getLogsDirectory = (options = {}) => {
  return getPlatformAppPath({ ...options, subdir: 'logs' });
};

/**
 * Gets a fallback path for logs in case the primary location fails
 * @returns {string} - Path to fallback logs directory
 */
const getFallbackLogsDirectory = () => {
  return path.join(os.homedir(), '.aws-sso-manager', 'logs');
};

/**
 * Gets path to AWS config directory
 * @returns {string} - Path to .aws directory
 */
const getAwsConfigDirectory = () => {
  return path.join(os.homedir(), '.aws');
};

/**
 * Gets path to AWS config file
 * @returns {string} - Path to AWS config file
 */
const getAwsConfigFilePath = () => {
  return path.join(getAwsConfigDirectory(), 'config');
};

/**
 * Gets path to AWS credentials file
 * @returns {string} - Path to AWS credentials file
 */
const getAwsCredentialsFilePath = () => {
  return path.join(getAwsConfigDirectory(), 'credentials');
};

module.exports = {
  getPlatformAppPath,
  getSettingsFilePath,
  getLogsDirectory,
  getFallbackLogsDirectory,
  getAwsConfigDirectory,
  getAwsConfigFilePath,
  getAwsCredentialsFilePath
}; 