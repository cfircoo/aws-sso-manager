process.env.NODE_OPTIONS = '--no-warnings';

// Initialize logger
require('./src/lib/logger.js');

const { app: electronApp, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { SSOOIDCClient, RegisterClientCommand, StartDeviceAuthorizationCommand, CreateTokenCommand } = require('@aws-sdk/client-sso-oidc');
const { SSOClient, ListAccountsCommand, ListAccountRolesCommand, GetRoleCredentialsCommand } = require('@aws-sdk/client-sso');
const { ECRClient, DescribeRepositoriesCommand } = require('@aws-sdk/client-ecr');
const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const paths = require('./src/lib/paths');

// Handle direct execution with Node.js without Electron context
const isElectronApp = !!electronApp;
if (!isElectronApp) {
  console.log('Running in standalone Node.js mode (not in Electron context)');
}

// Add debugging and error logging
console.log('Starting AWS SSO Switcher application...');
console.log('App path:', isElectronApp ? electronApp.getAppPath() : process.cwd());

// Settings file path for manual storage
const settingsFilePath = paths.getSettingsFilePath({ app: electronApp });

// Log settings file information at startup
console.log('Settings file path:', settingsFilePath);
console.log('Settings file exists:', fs.existsSync(settingsFilePath));
if (fs.existsSync(settingsFilePath)) {
  const stats = fs.statSync(settingsFilePath);
  console.log('Settings file size:', stats.size, 'bytes');
  console.log('Settings file last modified:', stats.mtime);
}

// Create application directory if it doesn't exist
const userAppPath = paths.getPlatformAppPath({ app: electronApp });
if (!fs.existsSync(userAppPath)) {
  console.log(`Creating app directory: ${userAppPath}`);
  fs.mkdirSync(userAppPath, { recursive: true });
  console.log('App directory created successfully');
}

// Simple settings management
const getSettings = () => {
  try {
    if (fs.existsSync(settingsFilePath)) {
      // Only log once when loading settings file
      const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      return settings;
    }
  } catch (error) {
    console.error('Error reading settings file:', error);
  }
  console.log('Returning default settings');
  return {
    region: 'us-east-1',
    ssoUrl: '',
    favorites: [],
    ecrAccount: '',
    ecrRole: '',
    codeArtifactAccount: '',
    codeArtifactRole: '',
    session: null,
    defaultProfile: null
  };
};

const saveSettings = (settings) => {
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings file:', error);
    return false;
  }
};

// Ensure settings file exists on startup
if (!fs.existsSync(settingsFilePath)) {
  console.log('Settings file not found, creating with defaults.');
  saveSettings({ // Save default settings to create the file
    region: 'us-east-1',
    ssoUrl: '',
    favorites: [],
    ecrAccount: '',
    ecrRole: '',
    codeArtifactAccount: '',
    codeArtifactRole: '',
    session: null,
    defaultProfile: null
  });
}

// Save session for reuse
const saveSession = (accessToken, expirationTime) => {
  try {
    const settings = getSettings();
    settings.session = {
      accessToken,
      expirationTime: expirationTime || Date.now() + 8 * 60 * 60 * 1000 // Default 8 hour expiration
    };
    saveSettings(settings);
    console.log('Session saved, expires:', new Date(settings.session.expirationTime).toLocaleString());
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
};

// Check if session is valid
const hasValidSession = () => {
  try {
    const settings = getSettings();
    if (!settings.session || !settings.session.accessToken || !settings.session.expirationTime) {
      console.log('No saved session found');
      return false;
    }
    
    const now = Date.now();
    const isValid = settings.session.expirationTime > now;
    console.log('Session validity check:', isValid ? 'Valid' : 'Expired', 
      'Expires:', new Date(settings.session.expirationTime).toLocaleString());
    return isValid;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
};

// Get active session
const getSession = () => {
  try {
    const settings = getSettings();
    if (hasValidSession()) {
      return settings.session;
    }
    return null;
  } catch (error) {
    console.error('Error getting active session:', error);
    return null;
  }
};

// Get default profile
const getDefaultProfile = () => {
  try {
    // First try to get from app settings
    const settings = getSettings();
    
    // Then try to get from AWS config file
    try {
      const homedir = os.homedir();
      const awsConfigPath = path.join(homedir, '.aws', 'config');
      
      // Check if the file exists
      if (fs.existsSync(awsConfigPath)) {
        const configContent = fs.readFileSync(awsConfigPath, 'utf8');
        const lines = configContent.split('\n');
        let inDefaultSection = false;
        let defaultAccountId = '';
        let defaultRoleName = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line === '[default]') {
            inDefaultSection = true;
            continue;
          }
          
          if (inDefaultSection) {
            if (line.startsWith('[')) {
              // We've reached the next section
              break;
            }
            
            if (line.startsWith('sso_account_id')) {
              defaultAccountId = line.split('=')[1].trim();
            }
            
            if (line.startsWith('sso_role_name')) {
              defaultRoleName = line.split('=')[1].trim();
            }
          }
        }
        
        // If we found values in the AWS config file, use them
        if (defaultAccountId && defaultRoleName) {
          // Update the settings to match the AWS config
          if (!settings.defaultProfile || 
              settings.defaultProfile.accountId !== defaultAccountId || 
              settings.defaultProfile.roleName !== defaultRoleName) {
            settings.defaultProfile = {
              accountId: defaultAccountId,
              roleName: defaultRoleName,
              found: true,
              lastUpdated: new Date().toISOString()
            };
            saveSettings(settings);
            console.log('Updated app settings from AWS config file');
          }
          
          return settings.defaultProfile;
        }
      }
    } catch (error) {
      console.error('Error reading AWS config file:', error);
    }
    
    // Return from settings if available
    return settings.defaultProfile || null;
  } catch (error) {
    console.error('Error getting default profile:', error);
    return null;
  }
};

// Set default profile
const setDefaultProfile = (accountId, roleName) => {
  try {
    // Update app settings
    const settings = getSettings();
    settings.defaultProfile = {
      accountId,
      roleName,
      found: true,
      lastUpdated: new Date().toISOString()
    };
    saveSettings(settings);
    console.log('Default profile set in app settings:', settings.defaultProfile);
    
    // Update AWS config file
    const homedir = os.homedir();
    const awsConfigPath = path.join(homedir, '.aws', 'config');
    console.log(`AWS config file path: ${awsConfigPath}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.join(homedir, '.aws'))) {
      fs.mkdirSync(path.join(homedir, '.aws'), { recursive: true });
    }
    
    // Check if the file exists
    let configContent = '';
    try {
      configContent = fs.readFileSync(awsConfigPath, 'utf8');
    } catch (e) {
      // File doesn't exist, will create it
      console.log('AWS config file does not exist, will create it');
    }
    
    // Use a simpler approach with string search
    let newConfigContent = '';
    const defaultProfileMarker = '[default]';
    const profileLines = configContent.split('\n');
    let inDefaultProfile = false;
    let defaultProfileProcessed = false;
    
    // Create the new default profile content
    // Use the configured start URL and region from settings
    const ssoStartUrl = settings.ssoUrl;
    const ssoRegion = settings.region || 'us-east-1';
    const newDefaultProfile = `[default]
sso_start_url = ${ssoStartUrl}
sso_region = ${ssoRegion}
sso_account_id = ${accountId}
sso_role_name = ${roleName}
region = ${ssoRegion}
output = json

`;
    
    // If the file is empty or doesn't exist, just write the new profile
    if (!configContent.trim()) {
      fs.writeFileSync(awsConfigPath, newDefaultProfile, 'utf8');
      console.log('Created new AWS config file with default profile');
    } else {
      // If the default profile exists, replace it
      if (configContent.includes(defaultProfileMarker)) {
        for (let i = 0; i < profileLines.length; i++) {
          const line = profileLines[i];
          if (line.trim() === defaultProfileMarker) {
            // Found the start of the default profile
            inDefaultProfile = true;
            
            // Add the new default profile if we haven't already
            if (!defaultProfileProcessed) {
              newConfigContent += newDefaultProfile;
              defaultProfileProcessed = true;
            }
          } else if (inDefaultProfile && line.trim().startsWith('[')) {
            // We've reached the start of another profile, stop skipping
            inDefaultProfile = false;
            newConfigContent += line + '\n';
          } else if (!inDefaultProfile) {
            // Not in default profile, add the line
            newConfigContent += line + '\n';
          }
          // Skip lines if we're in the default profile section
        }
        
        // If we went through all lines and didn't see any more profile sections,
        // make sure we handle the last line correctly
        if (inDefaultProfile && !profileLines[profileLines.length - 1].trim().startsWith('[')) {
          // We're still in the default profile and at the end of the file
          // Make sure the new profile was added
          if (!defaultProfileProcessed) {
            newConfigContent += newDefaultProfile;
          }
        }
      } else {
        // No default profile exists, add it at the beginning
        newConfigContent = newDefaultProfile + configContent;
      }
      
      // Write the updated config
      console.log(`Writing updated AWS config to: ${awsConfigPath}`);
      fs.writeFileSync(awsConfigPath, newConfigContent, 'utf8');
    }
    
    return true;
  } catch (error) {
    console.error('Error setting default profile:', error);
    return false;
  }
};

// Clear session data
const clearSession = () => {
  try {
    const settings = getSettings();
    settings.session = null;
    saveSettings(settings);
    console.log('Session cleared');
    return true;
  } catch (error) {
    console.error('Error clearing session:', error);
    return false;
  }
};

// Load settings
const settings = getSettings();
let currentRegion = settings.region || 'us-east-1';

const execAsync = promisify(exec);

// AWS SSO Service setup
let ssoOidcClient = null;
let ssoClient = null;
let clientId = null;
let clientSecret = null;

// Helper function to escape a string for shell embedding within double quotes
const shellEscape = (str) => {
  if (typeof str !== 'string') return '';
  // Escape backslashes, double quotes, backticks, and dollar signs
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
};

// Command-line mode specific behavior
if (!isElectronApp) {
  console.log('Running in command-line mode');
  console.log('Available commands:');
  console.log('  --help: Show this help message');
  console.log('  --debug: Show debug information');
  console.log('  --version: Show version information');
  console.log('  --get-default-profile: Show current default profile');
  
  // Process arguments
  const args = process.argv.slice(2);
  if (args.includes('--get-default-profile')) {
    const profile = getDefaultProfile();
    console.log('Default AWS SSO Profile:');
    console.log(profile ? 
      `Account: ${profile.accountId}, Role: ${profile.roleName}` :
      'No default profile set');
  }
  
  if (args.includes('--version')) {
    const packageJson = require('./package.json');
    console.log(`AWS SSO Manager version: ${packageJson.version}`);
  }
  
  if (args.includes('--help')) {
    // Help already shown
  } else if (args.length === 0) {
    console.log('No command specified. Use --help for available commands.');
  }
  
  // Exit after command-line operations
  process.exit(0);
}

// Define createWindow function for Electron mode
function createWindow() {
  console.log('[Main] Starting createWindow function');
  try {
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    console.log('[Main] BrowserWindow created');

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      console.log('[Main] Running in development mode, loading from localhost');
      mainWindow.loadURL('http://localhost:8084');
      mainWindow.webContents.openDevTools();
    } else {
      // In production mode, load from the built files
      console.log('[Main] Running in production mode');
      console.log('[Main] App path:', electronApp.getAppPath());
      console.log('[Main] Current directory:', __dirname);
      console.log('[Main] Resource path:', process.resourcesPath);
      
      // When packaged, index.html should be in the dist directory
      let indexPath;
      
      if (electronApp.isPackaged) {
        // In packaged app, load from the resources/dist directory
        indexPath = path.join(process.resourcesPath, 'dist', 'index.html');
        console.log('[Main] Loading packaged app from:', indexPath);
      } else {
        // In development build, check multiple locations
        const possiblePaths = [
          path.join(__dirname, 'dist', 'index.html'),
          path.join(process.cwd(), 'dist', 'index.html'),
          path.join(electronApp.getAppPath(), 'dist', 'index.html')
        ];

        for (const testPath of possiblePaths) {
          console.log('[Main] Checking path:', testPath);
          if (fs.existsSync(testPath)) {
            indexPath = testPath;
            console.log('[Main] Found index.html at:', indexPath);
            break;
          }
        }
      }

      if (!indexPath || !fs.existsSync(indexPath)) {
        console.error('[Main] Could not find index.html');
        // Load error page from same directory as main.js
        const errorPath = path.join(__dirname, 'error.html');
        console.log('[Main] Loading error page from:', errorPath);
        mainWindow.loadFile(errorPath);
        return;
      }

      try {
        console.log('[Main] Loading from:', indexPath);
        mainWindow.loadFile(indexPath);
      } catch (error) {
        console.error('[Main] Error loading index.html:', error);
        const errorPath = path.join(__dirname, 'error.html');
        console.log('[Main] Loading error page from:', errorPath);
        mainWindow.loadFile(errorPath);
      }
    }
    
    // Set Content Security Policy
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline' data:",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.amazonaws.com https://*.awsapps.com",
            "font-src 'self' data:",
            "worker-src 'self' blob:",
            "frame-src 'self'",
          ].join('; ')
        }
      });
    });

    // Handle external URLs
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Log any load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Main] Failed to load:', errorCode, errorDescription);
      // Try loading error page on load failure
      const errorPath = path.join(__dirname, 'error.html');
      console.log('[Main] Loading error page from:', errorPath);
      mainWindow.loadFile(errorPath);
    });
    
    console.log('[Main] createWindow function completed successfully');
  } catch (error) {
    console.error('[Main] Error in createWindow function:', error);
    console.error('[Main] Error details:', error.message);
    console.error('[Main] Error stack:', error.stack);
    throw error;
  }
}

// Specialized function for handling macOS terminals with proper environment persistence
async function openMacOSTerminal(env, debugLogPath) {
  console.log('[Main] Opening macOS terminal with persistent AWS environment');
  
  try {
    // Create environment file that will be sourced by the terminal
    const envFilePath = path.join(os.tmpdir(), `aws-sso-env-${Date.now()}.sh`);
    
    // Create the environment file content
    let envFileContent = `#!/bin/zsh
# AWS SSO Environment Variables - Created ${new Date().toISOString()}
# Terminal launched for role ${env.AWS_ROLE_NAME || 'unknown'} in account ${env.AWS_ACCOUNT_ID || 'unknown'}
# This file will be sourced by your terminal to set up the AWS environment

`;

    // Add all environment variables
    Object.entries(env).forEach(([key, value]) => {
      // Use single quotes for values with special characters
      const escapedValue = value.replace(/'/g, "'\\''"); // Escape single quotes for shell
      envFileContent += `export ${key}='${escapedValue}'\n`;
    });
    
    // Add helper function
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      const accountId = env.AWS_ACCOUNT_ID || 'unknown';
      const roleName = env.AWS_ROLE_NAME || 'unknown';
      const region = env.AWS_REGION || 'us-east-1';
      const expiration = env.AWS_EXPIRATION ? parseInt(env.AWS_EXPIRATION, 10) : 0;
      
      envFileContent += `
# Helper function to display current AWS identity
aws_who_am_i() {
  echo "--- AWS Identity Info ---"
  echo "AWS Account: ${accountId}"
  echo "AWS Role:    ${roleName}"
  echo "AWS Region:  ${region}"
  if [ -n "${expiration}" ]; then
    echo ""
    # Use a platform-aware date command that works on both macOS and Linux
    echo "Temporary credentials expire at: $(date -r $(( ${expiration} / 1000 )) 2>/dev/null || date -d @$(( ${expiration} / 1000 )) 2>/dev/null || echo 'Unknown expiration time')"
  fi
}

# Display AWS identity information on startup
aws_who_am_i
echo ""
echo "Type 'aws_who_am_i' to see AWS identity information again"
echo ""
`;
    }

    // Write the environment file
    fs.writeFileSync(envFilePath, envFileContent, { mode: 0o755 });
    console.log('[Main] Created AWS environment file:', envFilePath);
    
    // Escape the path for AppleScript
    const escapedEnvFilePath = envFilePath.replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/ /g, '\\ ');
    
    // Create AppleScript command that sources the environment file upon terminal startup
    const command = `osascript -e 'tell application "Terminal"
  do script "source \\"${escapedEnvFilePath}\\"; exec zsh"
  activate
end tell'`;
    
    console.log('[Main] Running AppleScript command to open Terminal');
    await execAsync(command);
    
    // Write to debug log
    fs.appendFileSync(debugLogPath, `
--- MacOS Terminal Launched ---
Environment file: ${envFilePath}
Command: ${command}
`);
    
    return { success: true };
  } catch (error) {
    console.error('[Main] Error opening macOS terminal:', error);
    fs.appendFileSync(debugLogPath, `\n--- ERROR IN MAIN PROCESS (MacOS) --- \n ${error.message} \n ${error.stack} \n`);
    return { success: false, error: error.message || 'Failed to open macOS terminal' };
  }
}

// Open system terminal handler
ipcMain.handle('aws-sso:open-terminal', async (_, options) => {
  console.log('[Main] Opening system terminal');
  const debugLogPath = path.join(os.tmpdir(), 'aws_term_debug.log');
  const shellDebugLogPath = shellEscape(debugLogPath); // Escape for shell usage

  // Clear previous log file
  try { fs.unlinkSync(debugLogPath); } catch (e) { /* ignore */ }
  fs.appendFileSync(debugLogPath, `--- Log Start: ${new Date().toISOString()} ---\n`);

  try {
    const { env = {} } = options;
    const homedir = os.homedir();
    const platform = process.platform;

    // Special handling for macOS for better environment persistence
    if (platform === 'darwin') {
      console.log('[Main] Opening macOS Terminal with zsh');
      return await openMacOSTerminal(env, debugLogPath);
    }

    // Special handling for Windows
    if (platform === 'win32') {
      console.log('[Main] Opening Windows CMD terminal');
      return await openWindowsTerminal(env, debugLogPath);
    }

    // For Linux, continue with the original approach
    console.log('[Main] Opening Linux terminal');
    let command;
    const tempScriptPath = path.join(os.tmpdir(), `aws-sso-terminal-${Date.now()}.sh`);
    const shellTempScriptPath = shellEscape(tempScriptPath); // Escape for shell usage

    // --- Build Script Content ---
    let scriptContent = '#!/bin/zsh\n\n';

    scriptContent += `# Debug log located at: ${debugLogPath}\n`;
    scriptContent += `echo "--- Starting AWS SSO Terminal Script ---\" >> "${shellDebugLogPath}" 2>&1\n`;
    scriptContent += `echo "Script path: ${tempScriptPath}\" >> "${shellDebugLogPath}" 2>&1\n`;
    scriptContent += `echo "Platform: ${platform}\" >> "${shellDebugLogPath}" 2>&1\n`;
    scriptContent += `echo "Timestamp: $(date)\" >> "${shellDebugLogPath}" 2>&1\n`;

    scriptContent += `echo "\n--- Sourcing .zshrc ---\" >> "${shellDebugLogPath}" 2>&1\n`;
    scriptContent += `source ~/.zshrc >> "${shellDebugLogPath}" 2>&1 || echo ".zshrc source failed." >> "${shellDebugLogPath}" 2>&1\n`;

    scriptContent += `echo "\n--- Exporting AWS Environment Variables ---\" >> "${shellDebugLogPath}" 2>&1\n`;
    Object.entries(env).forEach(([key, value]) => {
      const escapedValue = shellEscape(value);
      scriptContent += `echo "Exporting ${key}..." >> "${shellDebugLogPath}" 2>&1\n`;
      // Use double quotes in the shell export command
      scriptContent += `export ${key}="${escapedValue}"\n`;
    });

    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_SESSION_TOKEN) {
      const accountId = shellEscape(env.AWS_ACCOUNT_ID || 'N/A');
      const roleName = shellEscape(env.AWS_ROLE_NAME || 'N/A');
      const region = shellEscape(env.AWS_REGION || 'us-east-1');
      const expiration = env.AWS_EXPIRATION ? parseInt(env.AWS_EXPIRATION, 10) : 0;
      const expirationSeconds = expiration ? Math.floor(expiration / 1000) : 0;

      scriptContent += `echo "\n--- Setting up AWS Context ---\" >> "${shellDebugLogPath}" 2>&1\n`;
      scriptContent += `export AWS_DEFAULT_REGION="${region}"\n`;
      scriptContent += `export AWS_PS1_ENABLED=true\n`;
      scriptContent += `export AWS_PROMPT_ROLE="${roleName}"\n`;
      scriptContent += `export AWS_PROMPT_ACCOUNT="${accountId}"\n`;

      // Define the aws_who_am_i function using standard string concatenation
      // to avoid template literal interpretation issues.
      let awsWhoAmIFunction = '\naws_who_am_i() {\n';
      awsWhoAmIFunction += '  echo "--- AWS Identity Info (from aws_who_am_i) ---";\n';
      // Escape $ for shell, accountId/roleName are already shell-escaped JS variables
      awsWhoAmIFunction += '  echo "AWS Account: \\${AWS_PROMPT_ACCOUNT:-Not Set} (' + accountId + ')";\n'; 
      awsWhoAmIFunction += '  echo "AWS Role:    \\${AWS_PROMPT_ROLE:-Not Set} (' + roleName + ')";\n';
      awsWhoAmIFunction += '  echo "AWS Region:  \\${AWS_REGION:-Not Set}";\n';
      awsWhoAmIFunction += '  echo "";\n';
      awsWhoAmIFunction += '  echo -n "Temporary credentials expire at: ";\n';
      // Cross-platform date command that works on both Linux and macOS
      const dateCommand = `date -d @${expirationSeconds} 2>/dev/null || date -r ${expirationSeconds} 2>/dev/null || echo \'Unknown expiration time\'`;
       // Escape the *result* of the date command execution for the echo
       awsWhoAmIFunction += '  echo "$(' + dateCommand + ')";\n'; 
      awsWhoAmIFunction += '  echo "";\n';
      awsWhoAmIFunction += '  echo "Current AWS Environment Variables (from env):";\n';
      awsWhoAmIFunction += '  env | grep AWS || echo "No AWS variables found in env";\n';
      awsWhoAmIFunction += '  echo "---------------------------------------------";\n';
      awsWhoAmIFunction += '}\n'; // Closing brace

      scriptContent += `echo "\\n--- Defining aws_who_am_i ---" >> "${shellDebugLogPath}" 2>&1\n`;
      // Add the function definition to the script content
      scriptContent += awsWhoAmIFunction;

      scriptContent += `
echo "\n--- Running aws_who_am_i on startup ---\" >> "${shellDebugLogPath}" 2>&1
aws_who_am_i >> "${shellDebugLogPath}" 2>&1 # Also log the function output
echo "" >> "${shellDebugLogPath}" 2>&1
echo "Type 'aws_who_am_i' to see AWS identity information again" # This goes to terminal stdout
echo ""
`;
    } else {
       scriptContent += `echo "\n--- AWS Credentials Missing - Skipping AWS Context Setup ---\" >> "${shellDebugLogPath}" 2>&1\n`;
    }

    scriptContent += `echo "\n--- Executing final zsh (leaving debug log at ${debugLogPath}) ---\" >> "${shellDebugLogPath}" 2>&1\n`;
    scriptContent += `exec /bin/zsh\n`; // Final command replaces the script's shell

    // --- Write and Execute Script ---
    console.log('[Main] Generated Script Content (first 500 chars):\n', scriptContent.substring(0, 500) + '...');
    fs.writeFileSync(tempScriptPath, scriptContent, { mode: 0o755 });
    console.log('[Main] Created temporary shell script:', tempScriptPath);

      command = `x-terminal-emulator -e "sh \\"${shellTempScriptPath}\\""`;

    console.log('[Main] Running command:', command);
    await execAsync(command);
    return { success: true };
  } catch (error) {
    console.error('[Main] Error opening terminal:', error);
    try {
      fs.appendFileSync(debugLogPath, `\n--- ERROR IN MAIN PROCESS --- \n ${error.message} \n ${error.stack} \n`);
    } catch (logError) { console.error("Failed to write error to debug log:", logError); }
    return { success: false, error: error.message || 'Failed to open terminal' };
  }
});

// Function to handle Windows terminal opening
async function openWindowsTerminal(env, debugLogPath) {
  console.log('[Main] Opening Windows CMD terminal');
  
  try {
    // Create batch file for CMD
    const batchFilePath = path.join(os.tmpdir(), `aws-sso-terminal-${Date.now()}.bat`);
    console.log('[Main] Creating Windows batch file at:', batchFilePath);

    // Create the batch file content
    let batchContent = '@echo off\r\n';
    batchContent += 'cls\r\n';
    batchContent += 'echo AWS SSO Manager - Terminal Session\r\n';
    batchContent += 'echo --------------------------------------\r\n';
    batchContent += `echo Timestamp: %DATE% %TIME%\r\n`;
    batchContent += 'echo.\r\n';
    
    // Set environment variables
    batchContent += 'echo Setting up AWS environment variables...\r\n';
    Object.entries(env).forEach(([key, value]) => {
      // Special handling for path-like variables to avoid escaping issues
      if (key === 'PATH' || key === 'Path') {
        batchContent += `set ${key}=${value}\r\n`;
      } else {
        // Properly handle quotes for Windows batch files
        // Double up quotes inside values to escape them
        const escapedValue = value.replace(/"/g, '""');
        batchContent += `set ${key}=${escapedValue}\r\n`;
      }
    });
    
    // Add region variable if exists
      const region = env.AWS_REGION || 'us-east-1';
    batchContent += `set AWS_DEFAULT_REGION=${region}\r\n`;
    
    // Add AWS identity info function
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      const accountId = env.AWS_ACCOUNT_ID || 'N/A';
      const roleName = env.AWS_ROLE_NAME || 'N/A';
      const expiration = env.AWS_EXPIRATION ? new Date(parseInt(env.AWS_EXPIRATION, 10)).toLocaleString() : 'N/A';
      
      batchContent += `\r\n`;
      batchContent += '@echo off\r\n';
      batchContent += 'echo.\r\n';
      batchContent += 'echo --- AWS Identity Info ---\r\n';
      batchContent += `echo AWS Account: ${accountId}\r\n`;
      batchContent += `echo AWS Role:    ${roleName}\r\n`;
      batchContent += `echo AWS Region:  %AWS_DEFAULT_REGION%\r\n`;
      batchContent += 'echo.\r\n';
      batchContent += `echo Credentials expire at: ${expiration}\r\n`;
      batchContent += 'echo.\r\n';
      
      // Create a batch function for displaying AWS info
      batchContent += `\r\n`;
      batchContent += ':aws_info\r\n';
      batchContent += '@echo off\r\n';
      batchContent += 'echo --- AWS Identity Info ---\r\n';
      batchContent += `echo AWS Account: ${accountId}\r\n`;
      batchContent += `echo AWS Role:    ${roleName}\r\n`;
      batchContent += `echo AWS Region:  %AWS_DEFAULT_REGION%\r\n`;
      batchContent += 'echo.\r\n';
      batchContent += `echo Credentials expire at: ${expiration}\r\n`;
      batchContent += 'echo.\r\n';
      batchContent += 'echo Current AWS Environment Variables:\r\n';
      batchContent += 'set AWS_\r\n';
      batchContent += 'goto :eof\r\n';
      
      // Add instruction for the user
      batchContent += '\r\n';
      batchContent += 'echo Type "call :aws_info" to see AWS identity information again\r\n';
      batchContent += 'echo.\r\n';
    }
    
    // Set a custom prompt showing AWS role
    batchContent += '\r\n';
    batchContent += 'echo Setting custom AWS prompt...\r\n';
    if (env.AWS_ROLE_NAME) {
      batchContent += `prompt $E[32m[AWS: %AWS_ROLE_NAME%]$E[0m $P$G\r\n`;
    } else {
      batchContent += `prompt $E[32m[AWS]$E[0m $P$G\r\n`;
    }
    
    // Write log file path for debugging
    batchContent += `echo Debug log location: ${debugLogPath}\r\n`;
    batchContent += 'echo.\r\n';
    
    // Write the batch file
    fs.writeFileSync(batchFilePath, batchContent);
    console.log('[Main] Batch file created successfully');
    
    // Open CMD with the batch file
    const command = `start cmd.exe /k "${batchFilePath}"`;
    console.log('[Main] Running command:', command);
    await execAsync(command);
    
    fs.appendFileSync(debugLogPath, `\n--- Windows CMD Terminal Launched ---\nBatch file: ${batchFilePath}\nCommand: ${command}\n`);
    return { success: true };
  } catch (error) {
    console.error('[Main] Error opening Windows terminal:', error);
    fs.appendFileSync(debugLogPath, `\n--- ERROR IN MAIN PROCESS (Windows) ---\n${error.message}\n${error.stack}\n`);
    return { success: false, error: error.message || 'Failed to open Windows terminal' };
  }
}

// Only set up IPC handlers when in Electron context
if (isElectronApp && ipcMain) {
  // IPC handlers for settings
  ipcMain.handle('settings:get', async (_, key) => {
    const settings = getSettings();
    return settings[key];
  });

  ipcMain.handle('settings:set', async (_, key, value) => {
    const settings = getSettings();
    settings[key] = value;
    return { success: saveSettings(settings) };
  });

  ipcMain.handle('settings:get-all', async () => {
    return getSettings();
  });

  ipcMain.handle('settings:set-all', async (_, newSettings) => {
    const settings = getSettings();
    
    // Update all provided settings
    Object.assign(settings, newSettings);
    
    return { success: saveSettings(settings) };
  });

  // Session management IPC handlers
  ipcMain.handle('session:check', async () => {
    return { 
      valid: hasValidSession(),
      session: getSession()
    };
  });

  ipcMain.handle('session:clear', async () => {
    return { success: clearSession() };
  });

  // Add a cached settings object
  let cachedSettings = null;

  // Modify the store handlers
  ipcMain.handle('store:get', async (_, key) => {
    if (!cachedSettings) {
      console.log('[Main] Loading settings from file');
      cachedSettings = getSettings();
    }
    return cachedSettings[key] || null;
  });

  ipcMain.handle('store:set', async (_, key, value) => {
    if (!cachedSettings) {
      cachedSettings = getSettings();
    }
    cachedSettings[key] = value;
    return saveSettings(cachedSettings);
  });

  ipcMain.handle('store:delete', async (_, key) => {
    if (!cachedSettings) {
      cachedSettings = getSettings();
    }
    if (key in cachedSettings) {
      delete cachedSettings[key];
      return saveSettings(cachedSettings);
    }
    return true;
  });

  ipcMain.handle('store:clear', async () => {
    cachedSettings = {};
    return saveSettings(cachedSettings);
  });

  // Shell operations handler
  ipcMain.handle('shell:open-external', async (_, url) => {
    console.log(`[Main] Opening external URL: ${url}`);
    return shell.openExternal(url);
  });

  // Terminal command handler
  ipcMain.handle('aws-sso:run-terminal-command', async (_, options) => {
    try {
      console.log(`[Main] Running terminal command: ${options.command}`);
      const { command, env = {} } = options;
      
      // Combine with current environment
      const commandEnv = { ...process.env, ...env };
      
      const { stdout, stderr } = await execAsync(command, {
        env: commandEnv,
        shell: true
      });
      
      return { stdout, stderr };
    } catch (error) {
      console.error(`[Main] Terminal command error:`, error);
      return { 
        stdout: '', 
        stderr: error.message || 'Unknown error executing command'
      };
    }
  });

// IPC Handlers
ipcMain.handle('aws-sso:init', async (_, { region }) => {
  try {
    console.log('[Main] Initializing AWS SSO with region:', region);
    
    if (!region) {
      throw new Error('Region is required');
    }
    
    currentRegion = region;
    
    // Create new AWS SDK clients with proper error handling
    try {
      ssoOidcClient = new SSOOIDCClient({ region });
      ssoClient = new SSOClient({ region });
      console.log('[Main] AWS SDK clients created successfully');
    } catch (sdkError) {
      console.error('[Main] Error creating AWS SDK clients:', sdkError);
      throw new Error(`Failed to initialize AWS SDK: ${sdkError.message}`);
    }
    
    // Save region to settings
    const settings = getSettings();
    settings.region = region;
    saveSettings(settings);
    console.log('[Main] Region saved to settings:', region);
    
    return { success: true };
  } catch (error) {
    console.error('[Main] Error in aws-sso:init:', error);
    throw error; // Propagate error back to renderer
  }
});

ipcMain.handle('aws-sso:start-login', async (_, { startUrl }) => {
  try {
    if (!ssoOidcClient) {
      throw new Error('SSO client not initialized');
    }

    // Save startUrl to settings
    const settings = getSettings();
    settings.ssoUrl = startUrl;
    saveSettings(settings);

    // Register client if not already registered
    if (!clientId || !clientSecret) {
      const registerCommand = new RegisterClientCommand({
        clientName: 'aws-sso-switcher',
        clientType: 'public'
      });
      const response = await ssoOidcClient.send(registerCommand);
      clientId = response.clientId;
      clientSecret = response.clientSecret;
    }

    // Start device authorization
    const startAuthCommand = new StartDeviceAuthorizationCommand({
      clientId,
      clientSecret,
      startUrl
    });

    const deviceAuth = await ssoOidcClient.send(startAuthCommand);
    return {
      verificationUriComplete: deviceAuth.verificationUriComplete,
      deviceCode: deviceAuth.deviceCode,
      userCode: deviceAuth.userCode
    };
  } catch (error) {
    console.error('Error starting SSO login:', error);
    throw error;
  }
});

ipcMain.handle('aws-sso:poll-token', async (_, { deviceCode }) => {
  try {
    if (!ssoOidcClient || !clientId || !clientSecret) {
      throw new Error('SSO client not initialized or missing client credentials');
    }

    const tokenCommand = new CreateTokenCommand({
      clientId,
      clientSecret,
      grantType: 'urn:ietf:params:oauth:grant-type:device_code',
      deviceCode
    });

    const tokenResponse = await ssoOidcClient.send(tokenCommand);
    const accessToken = tokenResponse.accessToken;
    
    // Save the session for future use
    const expirationTime = tokenResponse.expiresAt ? 
      new Date(tokenResponse.expiresAt).getTime() : 
      Date.now() + 8 * 60 * 60 * 1000; // Default 8 hour expiration
    
    saveSession(accessToken, expirationTime);

    // Create SSO cache file
    try {
      const settings = getSettings();
      const homedir = os.homedir();
      const ssoCacheDir = path.join(homedir, '.aws', 'sso', 'cache');
      
      // Create cache directory if it doesn't exist
      if (!fs.existsSync(ssoCacheDir)) {
        fs.mkdirSync(ssoCacheDir, { recursive: true });
      }

      // Create a hash of the start URL to use as the filename
      const startUrl = settings.ssoUrl;
      const hash = require('crypto').createHash('sha1').update(startUrl).digest('hex');
      const cacheFile = path.join(ssoCacheDir, `${hash}.json`);

      // Create the cache file content
      const cacheContent = {
        startUrl: settings.ssoUrl,
        region: settings.region,
        accessToken: accessToken,
        expiresAt: new Date(expirationTime).toISOString(),
        clientId: clientId,
        clientSecret: clientSecret
      };

      // Write the cache file
      fs.writeFileSync(cacheFile, JSON.stringify(cacheContent, null, 2));
      console.log('Created SSO cache file:', cacheFile);
    } catch (error) {
      console.error('Error creating SSO cache file:', error);
      // Don't throw the error, just log it since this is not critical
    }
    
    return { accessToken };
  } catch (error) {
    if (error.name === 'AuthorizationPendingException') {
      return { pending: true };
    }
    throw error;
  }
});

ipcMain.handle('aws-sso:list-accounts', async (_, { accessToken }) => {
  try {
    if (!ssoClient) throw new Error('SSO client not initialized');
    
    let nextToken;
    const allAccounts = [];
    
    do {
      const command = new ListAccountsCommand({ 
        accessToken,
        nextToken
      });
      const response = await ssoClient.send(command);
      
      if (response.accountList) {
        allAccounts.push(...response.accountList);
      }
      
      nextToken = response.nextToken;
    } while (nextToken);
    
    console.log(`[Main] Retrieved total ${allAccounts.length} accounts`);
    return { accounts: allAccounts };
  } catch (error) {
    console.error('Error listing accounts:', error);
    throw error;
  }
});

ipcMain.handle('aws-sso:list-account-roles', async (_, { accessToken, accountId }) => {
  try {
    if (!ssoClient) throw new Error('SSO client not initialized');
    const command = new ListAccountRolesCommand({ accessToken, accountId });
    const response = await ssoClient.send(command);
    return { roles: response.roleList || [] };
  } catch (error) {
    console.error('Error listing roles:', error);
    throw error;
  }
});

ipcMain.handle('aws-sso:get-role-credentials', async (_, { accessToken, accountId, roleName }) => {
  try {
    if (!ssoClient) throw new Error('SSO client not initialized');
    console.log(`Getting credentials for account ${accountId} and role ${roleName}`);
    
    const command = new GetRoleCredentialsCommand({ 
      accessToken, 
      accountId, 
      roleName 
    });
    
    const response = await ssoClient.send(command);
    
    if (!response.roleCredentials) {
      throw new Error('No role credentials returned');
    }
    
    return {
      accessKeyId: response.roleCredentials.accessKeyId,
      secretAccessKey: response.roleCredentials.secretAccessKey,
      sessionToken: response.roleCredentials.sessionToken,
      expiration: response.roleCredentials.expiration,
      // Include these additional properties for helpful context in the terminal
      accountId: accountId,
      roleName: roleName,
      region: currentRegion
    };
  } catch (error) {
    console.error('Error getting role credentials:', error);
    throw error;
  }
});

ipcMain.handle('aws-sso:logout', async () => {
  try {
    // Reset state
    clientId = null;
    clientSecret = null;
    currentRegion = null;
    ssoOidcClient = null;
    ssoClient = null;
    
    // Clear the saved session
    clearSession();
    
    // Delete AWS SSO cache files
    const homedir = os.homedir();
    const ssoCacheDir = path.join(homedir, '.aws', 'sso', 'cache');
    
    // Check if directory exists
    if (fs.existsSync(ssoCacheDir)) {
      console.log(`Deleting AWS SSO cache files from ${ssoCacheDir}`);
      
      try {
        // Read all files in the directory
        const files = fs.readdirSync(ssoCacheDir);
        
        // Delete each file
        for (const file of files) {
          const filePath = path.join(ssoCacheDir, file);
          fs.unlinkSync(filePath);
          console.log(`Deleted cache file: ${filePath}`);
        }
        
        console.log('Successfully cleared AWS SSO cache');
      } catch (error) {
        console.error('Error deleting SSO cache files:', error);
      }
    } else {
      console.log('AWS SSO cache directory does not exist');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    return { success: false, error: error.message };
  }
});

// Handler for getting default profile
ipcMain.handle('aws-sso:get-default-profile', async () => {
  return getDefaultProfile();
});

// Handler for setting default profile
ipcMain.handle('aws-sso:set-default-profile', async (_, { accountId, roleName }) => {
  await setDefaultProfile(accountId, roleName);
  return { success: true };
});

// Add ECR login handler
ipcMain.handle('aws-sso:login-ecr', async (_, { accountId, roleName }) => {
  console.log('[Main] ECR login requested:', { accountId, roleName });
  
  if (!currentRegion) {
    throw new Error('Region not initialized');
  }

  try {
    // First check if Docker is running
    try {
      console.log('[Main] Checking if Docker is running');
      await execAsync('docker info');
    } catch (dockerError) {
      console.error('[Main] Docker is not running:', dockerError.message);
      return {
        success: false,
        message: 'Docker is not running. Please start Docker and try again.',
        timestamp: Date.now()
      };
    }

    // Get the current session
    const session = getSession();
    if (!session || !session.accessToken) {
      throw new Error('No active session. Please authenticate first.');
    }

    // Get credentials for the role
    console.log('[Main] Getting role credentials for ECR login');
    const command = new GetRoleCredentialsCommand({ 
      accessToken: session.accessToken, 
      accountId, 
      roleName 
    });
    
    const response = await ssoClient.send(command);
    
    if (!response.roleCredentials) {
      throw new Error('No role credentials returned');
    }

    // Get ECR login password using subprocess with credentials as environment variables
    console.log('[Main] Getting ECR login password with credentials');
    const { stdout: password, stderr: passError } = await execAsync(
      `aws ecr get-login-password --region ${currentRegion}`,
      {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: response.roleCredentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: response.roleCredentials.secretAccessKey,
          AWS_SESSION_TOKEN: response.roleCredentials.sessionToken
        }
      }
    );

    if (passError) {
      throw new Error(`Failed to get ECR password: ${passError}`);
    }

    // Login to ECR using docker
    console.log('[Main] Executing docker login');
    const loginCmd = `echo ${password.trim()} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${currentRegion}.amazonaws.com`;
    
    try {
      const { stdout, stderr } = await execAsync(loginCmd);
      console.log('[Main] Docker login stdout:', stdout);
      console.log('[Main] Docker login stderr:', stderr);

      // Check stdout for success message (newer Docker versions)
      const isSuccessInStdout = stdout && (
        stdout.includes('Login Succeeded') || 
        stdout.includes('login succeeded')
      );

      // Check stderr for known messages that aren't actually errors
      const isInformationalInStderr = stderr && (
        stderr.includes('Login Succeeded') || 
        stderr.includes('login succeeded') ||
        stderr.includes('Logging in with your password grants') || 
        stderr.includes('access-tokens')
      );

      // Docker login might succeed even with stderr output containing informational messages
      // Login will succeed if the stderr only contains informational messages about
      // password authentication security or tokens
      const onlyHasInfoMessages = stderr && 
        (stderr.includes('Logging in with your password grants') || 
         stderr.includes('access-tokens')) &&
        !stderr.includes('error') && 
        !stderr.includes('Error') && 
        !stderr.includes('failed') && 
        !stderr.includes('Failed');

      // If we have an error message that's not just informational, fail
      if (stderr && !isInformationalInStderr && !isSuccessInStdout && !onlyHasInfoMessages) {
        throw new Error(`Docker login failed: ${stderr}`);
      }

      // If we get here, docker login succeeded
      console.log('[Main] ECR login successful');
      
      // If we have informational messages but login succeeded, include them in the response
      // so the user can see them
      let successMessage = 'Successfully logged in to ECR';
      if (onlyHasInfoMessages) {
        successMessage = `Successfully logged in to ECR (with notifications from Docker)`;
      }
      
      return {
        success: true,
        message: successMessage,
        timestamp: Date.now()
      };
    } catch (dockerLoginError) {
      console.error('[Main] Docker login error:', dockerLoginError);
      return {
        success: false,
        message: `Docker login failed: ${dockerLoginError.message}`,
        timestamp: Date.now()
      };
    }
  } catch (error) {
    console.error('[Main] ECR login failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to login to ECR',
      timestamp: Date.now()
    };
  }
});

// Add CodeArtifact login handler
ipcMain.handle('aws-sso:login-codeartifact', async (_, { accountId, roleName }) => {
  console.log('[Main] CodeArtifact login requested:', { accountId, roleName });
  
  if (!currentRegion) {
    throw new Error('Region not initialized');
  }

  try {
    // First get the current session
    const session = getSession();
    if (!session || !session.accessToken) {
      throw new Error('No active session. Please authenticate first.');
    }

    // Get credentials for the role
    console.log('[Main] Getting role credentials for CodeArtifact login');
    const command = new GetRoleCredentialsCommand({ 
      accessToken: session.accessToken, 
      accountId, 
      roleName 
    });
    
    const response = await ssoClient.send(command);
    
    if (!response.roleCredentials) {
      throw new Error('No role credentials returned');
    }

    // Setup credentials environment
    const credentialsEnv = {
      ...process.env,
      AWS_ACCESS_KEY_ID: response.roleCredentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: response.roleCredentials.secretAccessKey,
      AWS_SESSION_TOKEN: response.roleCredentials.sessionToken,
      AWS_REGION: currentRegion
    };

    // Check CodeArtifact login status first
    console.log('[Main] Checking CodeArtifact login status...');
    const { stdout: checkResult, stderr: checkError } = await execAsync(
      'pip index versions non-existent-package 2>&1 | grep -q "401" && echo "❌ Not logged in to CodeArtifact" || echo "✅ Logged in to CodeArtifact"',
      { env: credentialsEnv }
    );

    if (checkError) {
      throw new Error(`Failed to check CodeArtifact status: ${checkError}`);
    }

    // If not logged in, perform login
    if (checkResult.includes('❌')) {
      console.log('[Main] Logging into CodeArtifact...');
      const { stderr: loginError } = await execAsync(
        `aws codeartifact login --tool pip --domain your-domain --domain-owner ${accountId} --region ${currentRegion}`,
        { env: credentialsEnv }
      );

      if (loginError) {
        throw new Error(`CodeArtifact login failed: ${loginError}`);
      }

      console.log('[Main] CodeArtifact login successful');
      return {
        success: true,
        message: 'Successfully logged in to CodeArtifact',
        timestamp: Date.now()
      };
    }

    // Already logged in
    return {
      success: true,
      message: 'Already logged in to CodeArtifact',
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('[Main] CodeArtifact login failed:', error);
    return {
      success: false,
      message: error.message || 'Failed to login to CodeArtifact',
      timestamp: Date.now()
    };
  }
});

// Add Docker status check handler
ipcMain.handle('aws-sso:check-docker-status', async () => {
  try {
    console.log('[Main] Checking Docker status');
    await execAsync('docker info');
    
    console.log('[Main] Docker is running');
    return {
      running: true,
      message: 'Docker is running'
    };
  } catch (error) {
    console.error('[Main] Docker is not running:', error.message);
    
    let errorMessage = 'Docker is not running';
    if (error.message.includes('connection refused')) {
      errorMessage = 'Docker daemon connection refused';
    } else if (error.message.includes('Cannot connect')) {
      errorMessage = 'Cannot connect to Docker daemon';
    }
    
    return {
      running: false,
      message: errorMessage
    };
  }
});

// IPC handler for getting app info
ipcMain.handle('get-app-info', () => {
  return {
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron
    }
  };
});

// IPC handler for getting app version
ipcMain.handle('app:version', () => {
    return electronApp.getVersion();
  });

// Add these to the IPC handlers section
ipcMain.handle('app:open-settings-file', async () => {
  try {
    const settingsPath = paths.getSettingsFilePath({ app: electronApp });
    console.log('[Main] Opening settings file:', settingsPath);
    await shell.openPath(settingsPath);
    return { success: true };
  } catch (error) {
    console.error('[Main] Error opening settings file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:open-logs-file', async () => {
  try {
    const logsDir = paths.getLogsDirectory({ app: electronApp });
    console.log('[Main] Opening logs directory:', logsDir);
    await shell.openPath(logsDir);
    return { success: true };
  } catch (error) {
    console.error('[Main] Error opening logs directory:', error);
    return { success: false, error: error.message };
  }
});
}

// Initialize app when in Electron mode
if (isElectronApp) {
  electronApp.whenReady().then(() => {
    try {
      console.log('[Main] Creating application window...');
  createWindow();
      console.log('[Main] Window created successfully');

      electronApp.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
          console.log('[Main] No windows found, creating new window');
          createWindow();
        }
      });
    } catch (error) {
      console.error('[Main] Error creating window:', error);
      console.error('[Main] Error details:', error.message);
      console.error('[Main] Error stack:', error.stack);
      throw error; // Re-throw to be caught by the catch below
    }
}).catch(err => {
    console.error('[Main] Error during app initialization:', err);
    console.error('[Main] Error message:', err.message);
    console.error('[Main] Error stack:', err.stack);
});

// Global error handler
process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught Exception:', error);
    console.error('[Main] Error message:', error.message);
    console.error('[Main] Error stack:', error.stack);
});

  electronApp.on('window-all-closed', function () {
    if (process.platform !== 'darwin') electronApp.quit();
}); 
} 