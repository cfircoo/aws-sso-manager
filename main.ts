import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { SSOOIDCClient, RegisterClientCommand, StartDeviceAuthorizationCommand, CreateTokenCommand } from '@aws-sdk/client-sso-oidc';
import { SSOClient, ListAccountsCommand, ListAccountRolesCommand, GetRoleCredentialsCommand } from '@aws-sdk/client-sso';
import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr';
import { exec } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';
import os from 'os';
import fs from 'fs';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoreSchema {
  clientId: string;
  clientSecret: string;
  region: string;
  ssoUrl: string;
  ssoRegion: string;
  ecrRepo: string;
  ecrRole: string;
  codeArtifactAccount: string;
  codeArtifactRole: string;
  defaultProfile?: {
    accountId: string;
    roleName: string;
    found: boolean;
  } | null;
  awsSsoAccessToken?: string | null;
  awsSsoTokenExpiration?: number | null;
  sessionStartTime?: number | null;
  favorites?: Array<{
    accountId: string;
    timestamp: number;
  }>;
}

// Initialize electron store with default values
const store = new Store<StoreSchema>({
  defaults: {
    clientId: '',
    clientSecret: '',
    region: '',
    ssoUrl: '',
    ssoRegion: '',
    ecrRepo: '',
    ecrRole: '',
    codeArtifactAccount: '',
    codeArtifactRole: '',
    defaultProfile: null,
    favorites: []
  }
});

// Log store path
console.log(`[Main] Electron store initialized. Path: ${store.path}`);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  const squirrelStartup = await import('electron-squirrel-startup');
  if (squirrelStartup.default) {
    app.quit();
  }
} catch (e) {
  // Not on Windows or not in squirrel mode
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set Content Security Policy based on environment
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          process.env.NODE_ENV === 'development' 
            ? [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "connect-src 'self' ws://localhost:8080 https://*.amazonaws.com https://*.awsapps.com",
                "font-src 'self' data:",
              ].join('; ')
            : [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "connect-src 'self' https://*.amazonaws.com https://*.awsapps.com",
              ].join('; ')
        ]
      }
    });
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8084');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the built React app - use the correct path for React build
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external URLs
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' } as const;
  });
};

// AWS SSO Service setup
let ssoOidcClient: SSOOIDCClient | null = null;
let ssoClient: SSOClient | null = null;
let clientId: string | null = null;
let clientSecret: string | null = null;
let currentRegion: string | null = null;

// Restore session on app start
const restoreSession = () => {
  const savedClientId = store.get('clientId') as string;
  const savedClientSecret = store.get('clientSecret') as string;
  const savedRegion = store.get('region') as string;
  
  if (savedClientId && savedClientSecret && savedRegion) {
    clientId = savedClientId;
    clientSecret = savedClientSecret;
    currentRegion = savedRegion;
    ssoOidcClient = new SSOOIDCClient({ region: savedRegion });
    ssoClient = new SSOClient({ region: savedRegion });
    console.log('[Main] Restored SSO session state');
  }
};

// Save session data
const saveSession = () => {
  if (clientId && clientSecret && currentRegion) {
    store.set('clientId', clientId);
    store.set('clientSecret', clientSecret);
    store.set('region', currentRegion);
    console.log('[Main] Saved SSO session state');
  }
};

// Clear session data
const clearSession = () => {
  store.clear();
  clientId = null;
  clientSecret = null;
  currentRegion = null;
  ssoOidcClient = null;
  ssoClient = null;
  console.log('[Main] Cleared SSO session state');
};

// IPC Handlers
ipcMain.handle('aws-sso:init', async (_, { region }: { region: string }) => {
  console.log('[Main] Initializing AWS SSO with region:', region);
  currentRegion = region;
  ssoOidcClient = new SSOOIDCClient({ region });
  ssoClient = new SSOClient({ region });
  saveSession();
});

ipcMain.handle('aws-sso:start-login', async (_, { startUrl }: { startUrl: string }) => {
  try {
    if (!ssoOidcClient) {
      // Try to restore session first
      restoreSession();
      if (!ssoOidcClient) {
        throw new Error('SSO client not initialized');
      }
    }

    // Register client if not already registered
    if (!clientId || !clientSecret) {
      const registerCommand = new RegisterClientCommand({
        clientName: 'aws-sso-switcher',
        clientType: 'public'
      });
      const response = await ssoOidcClient.send(registerCommand);
      clientId = response.clientId!;
      clientSecret = response.clientSecret!;
      saveSession();
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

ipcMain.handle('aws-sso:poll-token', async (_, { deviceCode }: { deviceCode: string }) => {
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
    return { accessToken: tokenResponse.accessToken };
  } catch (error: any) {
    if (error.name === 'AuthorizationPendingException') {
      return { pending: true };
    }
    throw error;
  }
});

ipcMain.handle('aws-sso:list-accounts', async (_, { accessToken }: { accessToken: string }) => {
  try {
    if (!ssoClient) throw new Error('SSO client not initialized');
    
    let nextToken: string | undefined;
    const allAccounts: any[] = [];
    
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

ipcMain.handle('aws-sso:list-account-roles', async (_, { accessToken, accountId }: { accessToken: string, accountId: string }) => {
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

ipcMain.handle('aws-sso:get-role-credentials', async (_, { accessToken, accountId, roleName }: { accessToken: string, accountId: string, roleName: string }) => {
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
      expiration: response.roleCredentials.expiration
    };
  } catch (error) {
    console.error('Error getting role credentials:', error);
    throw error;
  }
});

ipcMain.handle('aws-sso:set-default-profile', async (_, { accountId, roleName }: { accountId: string, roleName: string }) => {
  try {
    console.log(`Setting default profile for account ${accountId} and role ${roleName}`);
    
    // Get home directory
    const homedir = os.homedir();
    const awsConfigPath = path.join(homedir, '.aws', 'config');
    console.log(`AWS config file path: ${awsConfigPath}`);
    
    // Create directory if it doesn't exist
    await fs.promises.mkdir(path.join(homedir, '.aws'), { recursive: true });
    
    // Check if the file exists
    let configContent = '';
    try {
      configContent = await fs.promises.readFile(awsConfigPath, 'utf8');
    } catch (e) {
      // File doesn't exist, will create it
    }
    
    // Instead of complex regex parsing, use a simpler approach with string search
    let newConfigContent = '';
    const defaultProfileMarker = '[default]';
    const profileLines = configContent.split('\n');
    let inDefaultProfile = false;
    let defaultProfileProcessed = false;
    
    // Create the new default profile content
    const settings = getSettings();
    const ssoStartUrl = settings.ssoUrl || '';
    const ssoRegion = settings.ssoRegion || 'us-east-1';
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
      await fs.promises.writeFile(awsConfigPath, newDefaultProfile, 'utf8');
      return { success: true, message: 'Default profile created successfully' };
    }
    
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
    } else {
      // No default profile exists, add it at the beginning
      newConfigContent = newDefaultProfile + configContent;
    }
    
    // Write the updated config
    console.log(`Writing updated AWS config to: ${awsConfigPath}`);
    await fs.promises.writeFile(awsConfigPath, newConfigContent, 'utf8');
    
    return { success: true, message: 'Default profile updated successfully' };
  } catch (error) {
    console.error('Error setting default profile:', error);
    return { success: false, message: String(error) };
  }
});

ipcMain.handle('aws-sso:login-ecr', async (_, { accountId, roleName }: { accountId: string; roleName: string }) => {
  console.log('[Main] ECR login requested:', { accountId, roleName });
  
  if (!currentRegion) {
    throw new Error('Region not initialized');
  }

  try {
    // Get ECR login password using subprocess
    console.log('[Main] Getting ECR login password');
    const { stdout: password, stderr: passError } = await execAsync(
      `aws ecr get-login-password --region ${currentRegion} --profile ${accountId}_${roleName}`
    );

    if (passError) {
      throw new Error(`Failed to get ECR password: ${passError}`);
    }

    // Login to ECR using docker
    console.log('[Main] Executing docker login');
    const loginCmd = `echo ${password.trim()} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${currentRegion}.amazonaws.com`;
    const { stderr } = await execAsync(loginCmd);

    if (stderr && !stderr.includes('Login Succeeded')) {
      throw new Error(`Docker login failed: ${stderr}`);
    }

    // If we get here, docker login succeeded
    console.log('[Main] ECR login successful');
    return {
      success: true,
      message: 'Successfully logged in to ECR',
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[Main] ECR login failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to login to ECR',
      timestamp: Date.now()
    };
  }
});

ipcMain.handle('aws-sso:login-codeartifact', async (_, { accountId, roleName }) => {
  console.log('[Main] CodeArtifact login requested:', { accountId, roleName });
  
  if (!currentRegion) {
    throw new Error('Region not initialized');
  }

  try {
    // Check CodeArtifact login status first
    console.log('[Main] Checking CodeArtifact login status...');
    const { stdout: checkResult, stderr: checkError } = await execAsync(
      'pip index versions non-existent-package 2>&1 | grep -q "401" && echo "❌ Not logged in to CodeArtifact" || echo "✅ Logged in to CodeArtifact"'
    );

    if (checkError) {
      throw new Error(`Failed to check CodeArtifact status: ${checkError}`);
    }

    // If not logged in, perform login
    if (checkResult.includes('❌')) {
      console.log('[Main] Logging into CodeArtifact...');
      const { stderr: loginError } = await execAsync(
        `aws codeartifact login --tool pip --domain your-domain --domain-owner your-account-id --region ${currentRegion}`
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
      message: error instanceof Error ? error.message : 'Failed to login to CodeArtifact',
      timestamp: Date.now()
    };
  }
});

// Add logout handler
ipcMain.handle('aws-sso:logout', async () => {
  clearSession();
  return { success: true };
});

// Add terminal command handler
ipcMain.handle('aws-sso:run-terminal-command', async (_, { command, env = {} }: { command: string, env?: Record<string, string> }) => {
  console.log('[Main] Running terminal command:', command);
  
  try {
    // Create environment variables for the command
    const cmdEnv = {
      ...process.env,
      ...env,
      // Force using zsh
      SHELL: '/bin/zsh'
    };
    
    // Create a zsh command that sources the user's profile to ensure all paths are available
    const fullCommand = `source ~/.zshrc > /dev/null 2>&1 || true; ${command}`;
    
    // Run the command in zsh for better compatibility
    const { stdout, stderr } = await execAsync(fullCommand, { 
      env: cmdEnv,
      shell: '/bin/zsh',
      // Make sure we have enough buffer for command output
      maxBuffer: 5 * 1024 * 1024 // 5MB
    });
    
    return { stdout, stderr };
  } catch (error: any) {
    console.error('[Main] Terminal command error:', error);
    
    return {
      stdout: '',
      stderr: error.message || 'Command execution failed',
      exitCode: error.code || -1
    };
  }
});

// Add a handler to get the current default AWS profile
ipcMain.handle('aws-sso:get-default-profile', async () => {
  try {
    // Get home directory
    const homedir = os.homedir();
    const awsConfigPath = path.join(homedir, '.aws', 'config');
    
    // Check if the file exists
    let configContent = '';
    try {
      configContent = await fs.promises.readFile(awsConfigPath, 'utf8');
    } catch (e) {
      // File doesn't exist
      return { found: false };
    }
    
    // Parse the config file to find the default profile
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
    
    return {
      found: !!(defaultAccountId && defaultRoleName),
      accountId: defaultAccountId,
      roleName: defaultRoleName
    };
  } catch (error) {
    console.error('Error getting default profile:', error);
    return { found: false };
  }
});

// IPC Handlers for store operations
ipcMain.handle('store:get', async (_, key) => {
  const value = store.get(key);
  if (key === 'favorites') {
    console.log(`[Main] Retrieved favorites from store:`, value);
  }
  return value;
});

ipcMain.handle('store:set', async (_, key, value) => {
  if (key === 'favorites') {
    console.log(`[Main] Saving favorites to store:`, value);
  }
  store.set(key, value);
  
  // For favorites, verify they were saved
  if (key === 'favorites') {
    const savedValue = store.get(key);
    console.log(`[Main] Verified favorites saved:`, savedValue);
  }
});

ipcMain.handle('store:delete', async (_, key) => {
  if (key === 'favorites') {
    console.log(`[Main] Deleting favorites from store`);
  }
  store.delete(key);
});

ipcMain.handle('store:clear', async () => {
  console.log(`[Main] Clearing entire store`);
  store.clear();
});

// IPC handlers for shell operations
ipcMain.handle('shell:open-external', async (_, url) => {
  return shell.openExternal(url);
});

// IPC handlers for app info
ipcMain.handle('app:info', async () => {
  return {
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron
    }
  };
});

ipcMain.handle('app:version', async () => {
  return app.getVersion();
});

// Add a handler to open a system terminal with zsh shell
ipcMain.handle('aws-sso:open-terminal', async (_, { env = {} }: { env?: Record<string, string> }) => {
  console.log('[Main] Opening system terminal with zsh');
  
  try {
    const homedir = os.homedir();
    const platform = process.platform;
    
    // Create custom environment variables to be passed to the terminal
    const envVarsString = Object.entries(env)
      .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
      .join('; ');
    
    // Command to source .zshrc and set environment variables
    const setupCommand = `source ~/.zshrc > /dev/null 2>&1; ${envVarsString}`;
    
    let command;
    
    if (platform === 'darwin') {
      // macOS - use osascript to open Terminal.app with zsh
      command = `osascript -e 'tell application "Terminal" to do script "${setupCommand}"' -e 'tell application "Terminal" to activate'`;
    } else if (platform === 'linux') {
      // Linux - try to detect the default terminal
      // This is a simple approach - might need to be expanded for different distros
      command = `x-terminal-emulator -e "zsh -c '${setupCommand}; exec zsh'"`;
    } else if (platform === 'win32') {
      // Windows with WSL - if zsh is available
      command = `start wsl -e zsh -c "${setupCommand}; exec zsh"`;
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    // Run the command
    await execAsync(command);
    return { success: true };
  } catch (error) {
    console.error('[Main] Error opening terminal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to open terminal' 
    };
  }
});

// Initialize session on app ready
app.whenReady().then(() => {
  restoreSession();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});