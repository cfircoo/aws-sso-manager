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
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { showToast } from '../components/toast';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import Footer from '../components/Footer';
import Portal from '../components/Portal';

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

  // Get default profile from app settings
  const defaultProfile = appSettings?.defaultProfile;

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

  // Handle profile change (refresh default profile info)
  const handleProfileChanged = () => {
    console.log('Profile changed - refreshing default profile info');
    // You could add additional logic here if needed to refresh profile data
  };

  // Handle account list refresh
  const handleRefreshAccounts = async () => {
    if (isRefreshingAccounts || !queries?.accounts?.refetch) return;
    
    try {
      setIsRefreshingAccounts(true);
      await queries.accounts.refetch();
      console.log('Accounts: Successfully refreshed account list');
      showToast.success('Account list refreshed successfully', 'Your AWS accounts have been updated with the latest information.');
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      showToast.error('Failed to refresh accounts', 'Please check your connection and try again.');
    } finally {
      setIsRefreshingAccounts(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Component */}
        <Header 
          sessionTimeLeft={sessionTimeLeft} 
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          onSettings={toggleSettings}
          ecrStatus={localEcrStatus}
          codeArtifactStatus={codeArtifactStatus}
          appVersion={appVersion}
          sessionTimeStatus={sessionTimeStatus}
        />

        {/* Action Bar */}
        <div className="glass-card p-4 animate-slide-in">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 min-w-0">
              <SearchBar
                searchTerm={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder="Search accounts and roles..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Refresh Button */}
              <button
                onClick={handleRefreshAccounts}
                disabled={isRefreshingAccounts}
                className={`
                  btn-secondary p-3 hover:scale-110 transition-all duration-200
                  ${isRefreshingAccounts ? '' : 'hover:text-accent'}
                `}
                title="Refresh Accounts"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshingAccounts ? 'animate-spin' : ''}`} />
              </button>

              {/* Renew Session Button */}
              <button
                onClick={handleRenewSession}
                disabled={isRenewingSession}
                className={`
                  btn-primary px-4 py-3 hover:scale-105 transition-all duration-200
                  ${sessionTimeStatus === 'critical' ? 'animate-pulse' : ''}
                `}
                title="Renew Session"
              >
                {isRenewingSession ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Renewing...</span>
                  </div>
                ) : (
                  <span>Renew Session</span>
                )}
              </button>


            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-6">
          {/* Accounts List */}
          <div className="animate-fade-in">
            {queries?.accounts?.isLoading ? (
              <div className="glass-card flex items-center justify-center py-16">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-primary font-medium">Loading your AWS accounts...</span>
                </div>
              </div>
            ) : queries?.accounts?.error ? (
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">Failed to Load Accounts</h3>
                <p className="text-tertiary mb-4">
                  {queries.accounts.error.message || 'An unexpected error occurred'}
                </p>
                <button
                  onClick={handleRefreshAccounts}
                  className="btn-primary hover:scale-105 transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            ) : (
                             <AccountsList
                 accounts={queries?.accounts?.data || []}
                 onRoleSelect={handleRoleSelect}
                 onOpenTerminal={handleOpenTerminal}
                 defaultProfile={defaultProfile}
                 onProfileChanged={handleProfileChanged}
                 searchTerm={searchQuery}
                 accessToken={accessToken}
                 totalAccounts={queries?.accounts?.data?.length}
               />
            )}
          </div>
        </div>
      </div>

      {/* Terminal Modal */}
      {showTerminal && selectedAccount && (
        <Portal>
          <div className="modal-backdrop fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-6xl max-h-[90vh] modal-glass-enhanced modal-content-enhanced overflow-hidden">
              <Terminal
                accountId={selectedAccount.accountId}
                roleName={selectedAccount.roleName}
                credentials={selectedAccount.credentials}
                onClose={() => setShowTerminal(false)}
              />
            </div>
          </div>
        </Portal>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Portal>
          <div className="modal-backdrop fixed inset-0 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-auto modal-glass-enhanced modal-content-enhanced">
              <SettingsForm onClose={toggleSettings} />
            </div>
          </div>
        </Portal>
      )}

      {/* Copyright Footer */}
      <Footer />
    </div>
  );
};

export default Accounts; 