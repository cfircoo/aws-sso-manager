// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload] Initializing preload script');

// Add diagnostics to track renderer process startup
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Preload] DOM content loaded');
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronStore', {
  get: async (key) => {
    console.log(`[Preload] Store: Getting ${key}`);
    const result = await ipcRenderer.invoke('store:get', key);
    console.log(`[Preload] Store: Got ${key}`, result);
    return result;
  },
  set: (key, value) => {
    console.log(`[Preload] Store: Setting ${key}`, value);
    return ipcRenderer.invoke('store:set', key, value);
  },
  delete: (key) => {
    console.log(`[Preload] Store: Deleting ${key}`);
    return ipcRenderer.invoke('store:delete', key);
  },
  clear: () => {
    console.log(`[Preload] Store: Clearing store`);
    return ipcRenderer.invoke('store:clear');
  }
});

contextBridge.exposeInMainWorld('awsSso', {
  // Initialize AWS SSO with a region
  init: (region) => {
    console.log(`[Preload] AWS SSO: Initializing with region ${region}`);
    return ipcRenderer.invoke('aws-sso:init', { region });
  },
  
  // Start the SSO login process
  startLogin: (startUrl) => {
    console.log(`[Preload] AWS SSO: Starting login with URL ${startUrl}`);
    return ipcRenderer.invoke('aws-sso:start-login', { startUrl });
  },
  
  // Poll for token during device authorization
  pollToken: (deviceCode) => {
    console.log(`[Preload] AWS SSO: Polling token for device code ${deviceCode}`);
    return ipcRenderer.invoke('aws-sso:poll-token', { deviceCode });
  },
  
  // List AWS accounts
  listAccounts: (accessToken) => ipcRenderer.invoke('aws-sso:list-accounts', { accessToken }),
  
  // List roles for an account
  listAccountRoles: (accessToken, accountId) => ipcRenderer.invoke('aws-sso:list-account-roles', { accessToken, accountId }),
  
  // Get credentials for a specific role
  getRoleCredentials: (accessToken, accountId, roleName) => ipcRenderer.invoke('aws-sso:get-role-credentials', { accessToken, accountId, roleName }),
  
  // Get default profile information
  getDefaultProfile: () => ipcRenderer.invoke('aws-sso:get-default-profile'),
  
  // Set default profile
  setDefaultProfile: (accountId, roleName) => ipcRenderer.invoke('aws-sso:set-default-profile', { accountId, roleName }),
  
  // Run terminal command
  runTerminalCommand: (options) => ipcRenderer.invoke('aws-sso:run-terminal-command', options),
  
  // Open a system terminal window with zsh
  openTerminal: (options) => ipcRenderer.invoke('aws-sso:open-terminal', options),
  
  // Login to ECR
  loginToEcr: (accountId, roleName) => ipcRenderer.invoke('aws-sso:login-ecr', { accountId, roleName }),
  
  // Login to CodeArtifact
  loginToCodeArtifact: (accountId, roleName) => ipcRenderer.invoke('aws-sso:login-codeartifact', { accountId, roleName }),
  
  // Check Docker status
  checkDockerStatus: () => ipcRenderer.invoke('aws-sso:check-docker-status'),
  
  // Logout from AWS SSO
  logout: () => ipcRenderer.invoke('aws-sso:logout')
});

// Shell operations
contextBridge.exposeInMainWorld('electronShell', {
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
});

// App info operations
contextBridge.exposeInMainWorld('electronApp', {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  openSettingsFile: () => ipcRenderer.invoke('app:open-settings-file'),
  openLogsFile: () => ipcRenderer.invoke('app:open-logs-file'),
});

// Set versions when DOM content is loaded
window.addEventListener('DOMContentLoaded', async () => {
  // Replace version information in the UI
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  try {
    // Get app info from main process
    const appInfo = await ipcRenderer.invoke('get-app-info');
    
    // Update version information in the UI
    const { versions } = appInfo;
    for (const type of ['node', 'chrome', 'electron']) {
      replaceText(`${type}-version`, versions[type]);
    }
  } catch (error) {
    console.error('Failed to get app info:', error);
  }
});
