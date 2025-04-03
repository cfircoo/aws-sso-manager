import React, { useState, useEffect } from 'react';
import { useElectron } from './contexts/ElectronContext';
import AccountsList from './components/AccountsList';
import Terminal from './components/Terminal';
import Header from './components/Header';
import { EcrLoginResponse } from './types/aws';
import SearchBar from './components/SearchBar';
import { useSsoContext } from './contexts/SsoContext';

const SimpleApp = () => {
  const electron = useElectron();
  const { 
    login: contextLogin, 
    logout: contextLogout, 
    isAuthenticated, 
    accessToken: contextAccessToken, 
    queries,
    ecrStatus: contextEcrStatus,
    codeArtifactStatus: contextCodeArtifactStatus
  } = useSsoContext();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [ssoConfig, setSsoConfig] = useState({
    region: 'us-east-1',
    startUrl: '',
    profile: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<string>('00:00:00');
  const [sessionExpirationTime, setSessionExpirationTime] = useState<number | null>(null);
  const [sessionTimeStatus, setSessionTimeStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [showRenewButton, setShowRenewButton] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalAccountId, setTerminalAccountId] = useState<string | null>(null);
  const [terminalRoleName, setTerminalRoleName] = useState<string | null>(null);
  const [terminalCredentials, setTerminalCredentials] = useState<any>(null);
  const [appVersion, setAppVersion] = useState<string>('');

  // Check if we have a saved session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get app version
        if (window.electronApp && window.electronApp.getVersion) {
          try {
            const version = await window.electronApp.getVersion();
            setAppVersion(version);
          } catch (versionError) {
            console.error('Error fetching app version:', versionError);
          }
        }
        
        // Load settings
        const settings = await electron.getAppSettings();
        setSsoConfig({
          region: settings.ssoRegion || 'us-east-1',
          startUrl: settings.ssoUrl || '',
          profile: 'default'
        });
        
        // Fetch the default profile
        if (window.awsSso && window.awsSso.getDefaultProfile) {
          try {
            const profile = await window.awsSso.getDefaultProfile();
            if (profile && profile.found) {
              setSsoConfig(prev => ({
                ...prev,
                profile: `${profile.accountId} (${profile.roleName})`
              }));
            }
          } catch (profileError) {
            console.error('Error fetching default profile:', profileError);
          }
        }
        
        // Check for saved session
        const session = await electron.getSession();
        if (session.accessToken && session.expiration && session.expiration > Date.now()) {
          // Start session timer
          updateSessionTimer(session.expiration);
          // Load accounts if we have a token
          // fetchAccounts(session.accessToken);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, [electron]);

  // Session timer update
  const updateSessionTimer = (expirationTime: number) => {
    // Store the expiration time for potential renewal
    setSessionExpirationTime(expirationTime);
    
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const timeLeft = expirationTime - now;
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        setSessionTimeLeft('00:00:00');
        setSessionTimeStatus('critical');
        // Session expired, logout
        handleLogout();
        return;
      }
      
      // Format time left as HH:MM:SS
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const formattedSeconds = seconds.toString().padStart(2, '0');
      
      setSessionTimeLeft(`${formattedHours}:${formattedMinutes}:${formattedSeconds}`);
      
      // Set visual indicators based on time remaining
      if (timeLeft < 5 * 60 * 1000) { // Less than 5 minutes
        setSessionTimeStatus('critical');
        setShowRenewButton(true);
      } else if (timeLeft < 15 * 60 * 1000) { // Less than 15 minutes
        setSessionTimeStatus('warning');
        setShowRenewButton(true);
      } else {
        setSessionTimeStatus('normal');
        setShowRenewButton(false);
      }
    }, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(timerInterval);
  };
  
  // Format time for UI display
  const getFormattedSessionTime = () => {
    if (!sessionTimeLeft) return 'No session';
    
    // Parse the HH:MM:SS format
    const [hours, minutes, seconds] = sessionTimeLeft.split(':').map(part => parseInt(part, 10));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Handle session renewal
  const handleRenewSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!contextAccessToken) {
        console.error('No access token available for renewal');
        return;
      }
      
      // Re-initialize AWS SSO with region
      await window.awsSso.init(ssoConfig.region);
      
      // Start login process
      const { deviceCode, userCode, verificationUriComplete } = await window.awsSso.startLogin(ssoConfig.startUrl);
      
      // Open the verification URL
      alert(`To renew your session, your verification code is: ${userCode}\nA browser window will open. Enter this code when prompted.`);
      await electron.openExternal(verificationUriComplete || 'https://device.sso.amazonaws.com');
      
      // Poll for token with retry logic (simplified for renewal)
      let attempts = 0;
      let maxAttempts = 40;
      let tokenResponse = null;
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          tokenResponse = await window.awsSso.pollToken(deviceCode);
          
          if (tokenResponse.accessToken) {
            // Success!
            break;
          }
          
          if (tokenResponse.pending) {
            // Still waiting for user to complete auth, wait 15 seconds
            await new Promise(resolve => setTimeout(resolve, 15000));
            continue;
          }
          
          // If we get here, something went wrong
          setError('Session renewal failed. Please try again.');
          setIsLoading(false);
          return;
        } catch (error) {
          if (attempts >= maxAttempts) {
            console.error('Max polling attempts reached:', error);
            setError('Session renewal timed out. Please login again.');
            setIsLoading(false);
            return;
          }
          
          // Wait before trying again
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
      }
      
      if (tokenResponse && tokenResponse.accessToken) {
        // Save session to electron store with new expiration
        const newExpirationTime = Date.now() + (tokenResponse.expiresIn || 28800) * 1000;
        await electron.saveSession(tokenResponse.accessToken, newExpirationTime);
        
        // Update session timer
        updateSessionTimer(newExpirationTime);
        
        // Show success notification
        alert('Your AWS SSO session has been renewed successfully!');
      } else {
        setError('Session renewal failed. Please try again.');
      }
    } catch (error) {
      console.error('Session renewal error:', error);
      setError(`Session renewal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // First try to call AWS SSO logout to clean cache files
      if (window.awsSso && window.awsSso.logout) {
        const result = await window.awsSso.logout();
        if (result && result.success) {
          console.log('AWS SSO cache files cleared successfully');
        } else {
          console.error('Failed to clear AWS SSO cache files:', result?.error || 'unknown error');
        }
      }
      
      // Clear the session in electron store
      await electron.clearSession();
      // setAccounts([]);
      
      // Show logout notification
      alert('You have been logged out. AWS SSO cache files have been cleared.');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRoleSelect = async (accountId: string, roleName: string) => {
    if (!contextAccessToken) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const credentials = await window.awsSso.getRoleCredentials(contextAccessToken, accountId, roleName);
      
      // Create temporary environment variables for the terminal
      const envVars = {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_SESSION_TOKEN: credentials.sessionToken,
        AWS_DEFAULT_REGION: ssoConfig.region
      };
      
      // Show credentials notification
      alert(`Temporary credentials obtained for:\nAccount: ${accountId}\nRole: ${roleName}`);
      
      // Try to login to ECR
      try {
        const ecrResult = await window.awsSso.loginToEcr(accountId, roleName);
      } catch (ecrError) {
        console.error('ECR login error:', ecrError);
      }
      
      // Try to login to CodeArtifact
      try {
        const artifactResult = await window.awsSso.loginToCodeArtifact(accountId, roleName);
      } catch (artifactError) {
        console.error('CodeArtifact login error:', artifactError);
      }
      
      // Log to console for debugging
      console.log('Credentials:', {
        accessKeyId: credentials.accessKeyId.substring(0, 5) + '...',
        secretAccessKey: credentials.secretAccessKey.substring(0, 5) + '...',
        sessionToken: credentials.sessionToken.substring(0, 5) + '...',
      });
    } catch (error) {
      console.error('Error getting credentials:', error);
      setError(`Failed to get credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountClick = (accountId: string) => {
    setExpandedAccountId(expandedAccountId === accountId ? null : accountId);
  };

  // Filter accounts based on search query
  const filteredAccounts = (queries?.accounts?.data || []).filter(account => 
    account.accountName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.accountId?.includes(searchQuery)
  );

  const handleProfileChanged = async () => {
    try {
      // Fetch the updated default profile
      if (window.awsSso && window.awsSso.getDefaultProfile) {
        const profile = await window.awsSso.getDefaultProfile();
        if (profile && profile.found) {
          // Update the displayed profile
          setSsoConfig(prev => ({
            ...prev,
            profile: `${profile.accountId || 'unknown'} (${profile.roleName || 'unknown'})`
          }));
          
          console.log('Default profile updated:', profile);
        }
      }
    } catch (error) {
      console.error('Error refreshing default profile:', error);
    }
  };

  const handleOpenTerminal = async (accountId: string, roleName: string, useSystemTerminal = false) => {
    try {
      setIsLoading(true);
      
      if (!contextAccessToken) {
        console.error('No access token available');
        return;
      }
      
      // Get credentials for the terminal
      const credentials = await window.awsSso.getRoleCredentials(contextAccessToken, accountId, roleName);
      
      if (credentials) {
        if (useSystemTerminal) {
          // Open system terminal with zsh and AWS credentials
          console.log('Opening system terminal with zsh for account:', accountId, 'role:', roleName);
          try {
            // Use region from credentials if available, otherwise default to configuration
            const region = credentials.region || ssoConfig.region || 'us-east-1';
            
            const result = await window.awsSso.openTerminal({
              env: {
                // Core AWS credential variables
                AWS_ACCESS_KEY_ID: credentials.accessKeyId,
                AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
                AWS_SESSION_TOKEN: credentials.sessionToken,
                AWS_REGION: region,
                AWS_DEFAULT_REGION: region,
                
                // Additional context variables
                AWS_ACCOUNT_ID: credentials.accountId || accountId,
                AWS_ROLE_NAME: credentials.roleName || roleName,
                AWS_EXPIRATION: credentials.expiration?.toString() || '',
                
                // Optional SDK variables
                AWS_SDK_LOAD_CONFIG: '1'
              }
            });
            
            if (!result.success) {
              console.error('Failed to open system terminal:', result.error);
              alert(`Failed to open terminal: ${result.error}`);
            }
          } catch (error) {
            console.error('Error opening system terminal:', error);
            alert('Error opening system terminal. See console for details.');
          }
        } else {
          // Use in-app terminal
          setTerminalAccountId(accountId);
          setTerminalRoleName(roleName);
          setTerminalCredentials(credentials);
          setTerminalOpen(true);
        }
      } else {
        console.error('Failed to get credentials for terminal');
      }
    } catch (error) {
      console.error('Error opening terminal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      position: 'relative'
    }}>
      <Header 
        sessionTimeLeft={sessionTimeLeft}
        isAuthenticated={isAuthenticated}
        onLogout={contextLogout}
        ecrStatus={contextEcrStatus}
        codeArtifactStatus={contextCodeArtifactStatus}
        appVersion={appVersion}
        sessionTimeStatus={sessionTimeStatus}
      />

      <main style={{
        flex: 1,
        padding: '24px',
        backgroundColor: '#ffffff',
        overflowY: 'auto'
      }}>
        {!isAuthenticated ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px'
          }}>
            <h2>Login to AWS SSO</h2>
            
            <div style={{ marginBottom: '20px', width: '100%', maxWidth: '400px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>
                Region:
                <input 
                  type="text" 
                  value={ssoConfig.region}
                  onChange={(e) => setSsoConfig({...ssoConfig, region: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px', width: '100%', maxWidth: '400px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>
                Start URL:
                <input 
                  type="text" 
                  value={ssoConfig.startUrl}
                  onChange={(e) => setSsoConfig({...ssoConfig, startUrl: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}
                />
              </label>
            </div>
            
            <button 
              onClick={() => contextLogin({
                region: ssoConfig.region,
                startUrl: ssoConfig.startUrl
              })}
              disabled={isLoading}
              style={{
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        ) : (
          <>
            <SearchBar 
              value={searchQuery} 
              onChange={setSearchQuery} 
              placeholder="Search accounts or roles..." 
            />
            <AccountsList
              accounts={filteredAccounts}
              onRoleSelect={handleRoleSelect}
              onOpenTerminal={handleOpenTerminal}
              defaultProfile={{ 
                accountId: ssoConfig.profile, 
                roleName: 'AWSAdministratorAccess',
                found: true 
              }}
              onProfileChanged={handleProfileChanged}
              searchTerm={searchQuery}
              accessToken={contextAccessToken}
            />
          </>
        )}
      </main>

      {terminalOpen && terminalCredentials && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '300px',
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #333',
          zIndex: 1000
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: '#333',
            color: 'white'
          }}>
            <div>
              Terminal: {terminalAccountId} / {terminalRoleName}
            </div>
            <button
              onClick={() => setTerminalOpen(false)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          <Terminal 
            credentials={terminalCredentials}
            accountId={terminalAccountId || ''}
            roleName={terminalRoleName || ''}
            onClose={() => setTerminalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default SimpleApp; 