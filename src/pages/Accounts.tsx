import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSsoContext } from '../contexts/SsoContext';
import AccountsList from '../components/AccountsList';
import Terminal from '../components/Terminal';
import SessionTimer from '../components/SessionTimer';
import HeaderTitle from '../components/HeaderTitle';
import CodeArtifactStatus from '../components/CodeArtifactStatus';
import EcrStatus from '../components/EcrStatus';
import { SettingsForm } from '../components/SettingsForm';
import { useElectron } from '../contexts/ElectronContext';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '../components/ThemeToggle';

const Accounts = () => {
  const navigate = useNavigate();
  const electron = useElectron();
  const [appVersion, setAppVersion] = useState<string>('');
  const { 
    isAuthenticated, 
    accessToken,
    queries,
    getCredentials,
    appSettings,
    logout,
    ecrStatus,
    codeArtifactStatus,
    sessionTimeLeft,
    checkCodeArtifactStatus,
    checkEcrStatus,
    loginToEcr,
    login,
    refreshSessionTime
  } = useSsoContext();
  
  const [isRenewingSession, setIsRenewingSession] = useState(false);
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false);
  
  // Load app version from package.json via Electron
  useEffect(() => {
    async function loadAppVersion() {
      try {
        // Access the window.electronApp.getVersion if it exists
        // @ts-ignore - Ignore TypeScript errors for direct window access
        if (window.electronApp && typeof window.electronApp.getVersion === 'function') {
          // @ts-ignore - Access the method directly
          const version = await window.electronApp.getVersion();
          console.log('Loaded app version:', version);
          setAppVersion(version);
        } else {
          console.warn('electronApp.getVersion not available, using default version');
          setAppVersion('1.0.0'); // Fallback version
        }
      } catch (error) {
        console.error('Error loading app version:', error);
        setAppVersion('1.0.0'); // Fallback version
      }
    }
    
    loadAppVersion();
  }, []);
  
  const statusCheckStartedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{
    accountId: string;
    roleName: string;
    credentials: any;
  } | null>(null);
  const [sessionTimeStatus, setSessionTimeStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [localCodeArtifactStatus, setLocalCodeArtifactStatus] = useState<any>({
    success: false,
    message: 'Checking CodeArtifact connection...',
    timestamp: Date.now()
  });
  const [localEcrStatus, setLocalEcrStatus] = useState<any>(ecrStatus || {
    success: false,
    message: 'Not logged in to ECR',
    timestamp: Date.now()
  });
  const [initialStatusCheckDone, setInitialStatusCheckDone] = useState(false);
  const [isEcrLoggingIn, setIsEcrLoggingIn] = useState(false);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);

  // Initialize local ECR status from context
  useEffect(() => {
    if (ecrStatus) {
      setLocalEcrStatus(ecrStatus);
    }
  }, [ecrStatus]);

  // Update session time status based on time left
  useEffect(() => {
    if (!sessionTimeLeft) {
      setSessionTimeStatus('critical');
      return;
    }
    
    if (sessionTimeLeft < 60 * 60 * 1000) { // Less than 1 hour
      setSessionTimeStatus('critical');
    } else if (sessionTimeLeft < 120 * 60 * 1000) { // Less than 2 hours
      setSessionTimeStatus('warning');
    } else {
      setSessionTimeStatus('normal');
    }
  }, [sessionTimeLeft]);

  // Redirect if not authenticated
  useEffect(() => {
    // Perform the initial check
    if (!initialAuthCheckDone) {
      if (!isAuthenticated || !accessToken) {
        console.log('Accounts: Initial check failed - User is not authenticated, redirecting to login');
        navigate('/login');
      }
      setInitialAuthCheckDone(true);
    } else {
      // After the initial check, only redirect if authentication is lost
      if (!isAuthenticated) {
        console.log('Accounts: Authentication lost, redirecting to login');
        navigate('/login');
      }
    }
  }, [isAuthenticated, accessToken, navigate, initialAuthCheckDone]);

  // Handle authentication errors from queries
  useEffect(() => {
    // Check for authentication errors in the accounts query
    if (queries?.accounts?.error) {
      const error = queries.accounts.error as any;
      if (error?.name === 'AuthenticationExpired' ||
          error?.message?.includes('UnauthorizedException') ||
          error?.message?.includes('Session token not found or invalid')) {
        console.log('Accounts: Authentication error detected from query, redirecting to login');
        navigate('/login');
      }
    }
  }, [queries?.accounts?.error, navigate]);

  // Add periodic session validity check
  useEffect(() => {
    // Only set up the interval if authenticated
    if (!isAuthenticated || !accessToken) return;
    
    console.log('Setting up periodic session check interval');
    
    const checkInterval = setInterval(() => {
      // If session is expired or will expire in the next minute
      if (!sessionTimeLeft || sessionTimeLeft <= 60000) {
        console.log('Session expired or about to expire, redirecting to login');
        clearInterval(checkInterval);
        navigate('/login');
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, accessToken, sessionTimeLeft, navigate]);

  // Trigger CodeArtifact status check when the page loads
  // This will cause the indicator to appear in red initially
  useEffect(() => {
    const initializeCodeArtifactStatus = async () => {
      if (isAuthenticated && accessToken && !statusCheckStartedRef.current) {
        statusCheckStartedRef.current = true;
        console.log('Accounts: Showing initial disconnected CodeArtifact status');
        
        try {
          // First show disconnected status for 3 seconds
          setLocalCodeArtifactStatus({
            success: false,
            message: 'Checking CodeArtifact connection...',
            timestamp: Date.now()
          });
          
          // Wait for 3 seconds to show the red status before fetching the actual status
          setTimeout(async () => {
            try {
              console.log('Accounts: Performing actual CodeArtifact status check');
              // Then perform the actual status check
              await checkCodeArtifactStatus();
              setInitialStatusCheckDone(true);
            } catch (error) {
              console.error('Accounts: Error checking CodeArtifact status:', error);
              setInitialStatusCheckDone(true);
            }
          }, 3000);
        } catch (error) {
          console.error('Accounts: Error setting up CodeArtifact status check:', error);
          setInitialStatusCheckDone(true);
        }
      }
    };

    initializeCodeArtifactStatus();
    // Only depend on authentication status, not on the checkCodeArtifactStatus function
    // to prevent multiple checks
  }, [isAuthenticated, accessToken]);

  // Update local CodeArtifact status with the actual status once check is done
  useEffect(() => {
    if (initialStatusCheckDone && codeArtifactStatus) {
      setLocalCodeArtifactStatus(codeArtifactStatus);
    }
  }, [initialStatusCheckDone, codeArtifactStatus]);

  // Handle role selection
  const handleRoleSelect = async (accountId: string, roleName: string) => {
    try {
      console.log(`Selecting role: ${roleName} in account: ${accountId}`);
      const credentials = await getCredentials(accountId, roleName);
      setSelectedAccount({
        accountId,
        roleName,
        credentials
      });
    } catch (error) {
      console.error('Error getting credentials:', error);
    }
  };

  // Handle terminal open - now uses Electron's openTerminal function
  const handleOpenTerminal = async (accountId: string, roleName: string) => {
    try {
      console.log(`Opening native zsh terminal for role: ${roleName} in account: ${accountId}`);
      const credentials = await getCredentials(accountId, roleName);
      
      // Don't show in-app terminal, instead open native terminal
      // Set up environment variables for the terminal
      const env = {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_SESSION_TOKEN: credentials.sessionToken,
        AWS_ACCOUNT_ID: accountId,
        AWS_ROLE_NAME: roleName,
        AWS_DEFAULT_REGION: appSettings.ssoRegion || 'us-east-1'
      };
      
      // Use Electron's openTerminal function to open a native terminal
      const result = await electron.openTerminal({ env });
      console.log('Terminal open result:', result);
      
      // Don't set showTerminal since we're using a native terminal now
    } catch (error) {
      console.error('Error opening native terminal:', error);
    }
  };

  // Handle session renewal
  const handleRenewSession = async () => {
    if (isRenewingSession) return; // Prevent multiple clicks
    
    try {
      setIsRenewingSession(true);
      console.log('Accounts: Initiating new AWS SSO login session...');
      
      // Directly start a new login flow that will open the browser
      await login(); // Wait for the login process to fully complete
      console.log('Accounts: SSO login process completed.');
      
      // Short delay to allow state updates within context/electron store if needed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now force a session time refresh
      try {
        console.log('Accounts: Attempting to refresh session timer after login...');
        await refreshSessionTime();
        console.log('Accounts: Session timer refresh triggered after login.');
      } catch (refreshError) {
        console.error('Accounts: Error refreshing session timer after login:', refreshError);
      }
      
      // Optional: Refresh settings (if login might change them)
      if (electron.getAppSettings) {
        await electron.getAppSettings();
        console.log('Accounts: Refreshed app settings from store after login');
      }
    } catch (error) {
      console.error('Error initiating SSO login or refreshing state:', error);
    } finally {
      setIsRenewingSession(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleCodeArtifactLogin = async () => {
    try {
      await checkCodeArtifactStatus();
    } catch (error) {
      console.error('Error logging into CodeArtifact:', error);
    }
  };

  const handleEcrLogin = async () => {
    if (isEcrLoggingIn) return; // Prevent multiple clicks
    
    try {
      setIsEcrLoggingIn(true);
      console.log('Accounts: Logging into ECR...');
      
      // Show temporary "logging in" status
      setLocalEcrStatus({
        success: false,
        message: 'Logging in to ECR...',
        timestamp: Date.now()
      });
      
      // Use the correct login function from context
      // If repo and role are directly set in appSettings, use them
      if (appSettings.ecrRepo && appSettings.ecrRole) {
        await loginToEcr(appSettings.ecrRepo, appSettings.ecrRole);
      } else {
        // Otherwise check the status which will find the default
        await checkEcrStatus();
      }
      
      console.log('Accounts: ECR login completed');
    } catch (error) {
      console.error('Error logging into ECR:', error);
      setLocalEcrStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to login to ECR',
        timestamp: Date.now()
      });
    } finally {
      setIsEcrLoggingIn(false);
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Handle account list refresh
  const handleRefreshAccounts = async () => {
    if (isRefreshingAccounts || !queries?.accounts?.refetch) return;
    
    try {
      setIsRefreshingAccounts(true);
      await queries.accounts.refetch();
      console.log('Accounts: Successfully refreshed account list');
      toast.success('Account list refreshed successfully');
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      toast.error('Failed to refresh accounts. Please try again.');
    } finally {
      setIsRefreshingAccounts(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '8px 16px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <HeaderTitle title="AWS SSO Manager" beta={true} appVersion={appVersion} />
          <SessionTimer 
            sessionTimeLeft={sessionTimeLeft ? String(sessionTimeLeft) : null}
            sessionTimeStatus={sessionTimeStatus}
            onRenewSession={handleRenewSession}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <EcrStatus 
            ecrStatus={isEcrLoggingIn ? localEcrStatus : ecrStatus}
            onEcrLogin={handleEcrLogin}
            isAuthenticated={isAuthenticated}
          />
          <CodeArtifactStatus 
            codeArtifactStatus={initialStatusCheckDone ? codeArtifactStatus : localCodeArtifactStatus}
            onCodeArtifactLogin={handleCodeArtifactLogin}
          />
          <ThemeToggle />
          <button
            onClick={toggleSettings}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              fontSize: '0.875rem',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            Settings
          </button>
        </div>
      </div>
      
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            boxShadow: '0 4px 6px var(--color-shadow)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '24px'
          }}>
            <SettingsForm 
              onClose={toggleSettings} 
              onLogout={handleLogout}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      )}
      
      <main style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px' 
        }}>
          <button
            onClick={handleRefreshAccounts}
            disabled={isRefreshingAccounts}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: isRefreshingAccounts ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isRefreshingAccounts ? 0.7 : 1,
              whiteSpace: 'nowrap',
              color: 'var(--color-text-primary)'
            }}
            title="Refresh account list"
          >
            {isRefreshingAccounts ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
            ) : (
              <RefreshCw size={16} />
            )}
            <span>{isRefreshingAccounts ? 'Refreshing...' : 'Refresh Accounts'}</span>
          </button>
          
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)'
            }}
          />
        </div>
        
        <AccountsList 
          accounts={queries?.accounts?.data || []}
          onRoleSelect={handleRoleSelect}
          onOpenTerminal={handleOpenTerminal}
          defaultProfile={appSettings?.defaultProfile ?? undefined}
          onProfileChanged={() => console.log('Profile changed')}
          searchTerm={searchQuery}
          accessToken={accessToken}
          totalAccounts={queries?.accounts?.data?.length || 0}
        />
        
        {/* Add loading indicator while accounts are being loaded */}
        {queries?.accounts?.isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--color-bg-secondary)',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px var(--color-shadow)',
            zIndex: 5
          }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent)' }} />
            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>Loading AWS Accounts...</div>
          </div>
        )}
      </main>
      
      {/* Terminal component is kept for backward compatibility but is no longer used */}
      {/* It's better to use the native terminal through Electron */}
      {showTerminal && selectedAccount && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '300px',
          zIndex: 10
        }}>
          <Terminal
            credentials={selectedAccount.credentials}
            accountId={selectedAccount.accountId}
            roleName={selectedAccount.roleName}
            onClose={() => setShowTerminal(false)}
          />
        </div>
      )}
      
      <footer style={{
        padding: '8px 16px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--color-text-secondary)'
      }}>
        Author: Carmeli Cfir , contact: cfir@carmeli.me | All copyrights reserved to Cfir Carmeli
      </footer>
    </div>
  );
};

export default Accounts; 