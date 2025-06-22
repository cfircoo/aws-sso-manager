import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { SsoService, useSsoService } from '../lib/sso';
import { AwsSsoConfig, AwsAccount, AwsRole, CodeArtifactLoginResponse, EcrLoginResponse, LoginResponse, TokenResponse, FavoriteAccount } from '../types/aws';
import { useSsoQueries } from '../hooks/useSsoQueries';
import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { AppSettings } from '../types/store';
import { formatTimeLeft } from '../utils/formatTimeLeft';
import { useElectron } from './ElectronContext';
import { useStore } from '../lib/store';
import { useFavorites } from '../hooks/useFavorites';

// Initialize with default values, will be updated from store
const ssoConfig: AwsSsoConfig = {
  region: '',
  startUrl: '',
  profile: '',
  defaultEcrAccount: '',
  defaultEcrRole: ''
};

export interface SsoContextType {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  isAuthenticated: boolean;
  login: (params?: { region: string; startUrl: string }) => Promise<void>;
  logout: () => Promise<void>;
  ssoService: SsoService;
  sessionTimeLeft: number | null;
  refreshSessionTime: () => Promise<number>;
  handleAuthExpiration: () => Promise<void>;
  queries: {
    login: UseMutationResult<LoginResponse, Error, void>;
    token: UseQueryResult<TokenResponse, Error>;
    accounts: UseQueryResult<AwsAccount[], Error>;
    roles: UseQueryResult<AwsRole[], Error>;
    ecrLogin: UseMutationResult<EcrLoginResponse, Error, { accountId: string; roleName: string }>;
    ecrStatusCheck: UseQueryResult<EcrLoginResponse | null, Error>;
    codeArtifactLogin: UseMutationResult<CodeArtifactLoginResponse, Error, { accountId: string; roleName: string }>;
    codeArtifactStatusCheck: UseQueryResult<CodeArtifactLoginResponse | null, Error>;
  } | null;
  isInitialized: boolean;
  ecrStatus: EcrLoginResponse | null;
  codeArtifactStatus: CodeArtifactLoginResponse | null;
  favorites: FavoriteAccount[];
  addFavorite: (accountId: string) => Promise<void>;
  removeFavorite: (accountId: string) => Promise<void>;
  appSettings: AppSettings;
  updateAppSettings: (settings: AppSettings) => Promise<void>;
  getCredentials: (accountId: string, roleName: string) => Promise<{
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  }>;
  loginToEcr: (accountId: string, roleName: string) => Promise<EcrLoginResponse>;
  checkEcrStatus: () => Promise<EcrLoginResponse>;
  checkCodeArtifactStatus: () => Promise<CodeArtifactLoginResponse>;
}

export const SsoContext = createContext<SsoContextType | null>(null);

export function useSsoContext() {
  const context = useContext(SsoContext);
  if (!context) {
    throw new Error('useSsoContext must be used within a SsoProvider');
  }
  return context;
}

export const SsoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  
  // State for SSO authentication
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const [sessionExpiration, setSessionExpiration] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [ecrStatus, setEcrStatus] = useState<EcrLoginResponse | null>(null);
  const [codeArtifactStatus, setCodeArtifactStatus] = useState<CodeArtifactLoginResponse | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    ssoUrl: '',
    ssoRegion: '',
    ecrRepo: '',
    ecrRole: '',
    codeArtifactAccount: '',
    codeArtifactRole: '',
    codeArtifactDomain: '',
    codeArtifactRepo: ''
  });
  
  // Get the Electron functions
  const electron = useElectron();
  
  // Use the SsoService via our React hook, memoized
  const ssoService = useMemo(() => {
    console.log("[SsoContext] Creating/Recreating SsoService instance"); // Add log
    return useSsoService(appSettings); // Use appSettings state directly
  }, [appSettings, electron]); // Depend on appSettings state and electron context
  
  // Pass the memoized service instance to useSsoQueries
  const queries = useSsoQueries(ssoService, isInitialized, isAuthenticated, accessToken);
  
  // Track session start time in memory as well
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  // Load settings and session on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[SsoContext] Loading app settings and session data...');
        
        // Load app settings
        const settings = await electron.getAppSettings();
        setAppSettings(settings);
        
        // Update SSO config with settings
        ssoConfig.region = settings.ssoRegion || '';
        ssoConfig.startUrl = settings.ssoUrl || '';
        
        // Load session data
        const session = await electron.getSession();
        if (session.accessToken) {
          setAccessToken(session.accessToken);
          setSessionExpiration(session.expiration || null);
          
          // Calculate session time remaining
          if (session.expiration) {
            const timeLeft = session.expiration - Date.now();
            setSessionTimeLeft(timeLeft > 0 ? timeLeft : null);
            setIsAuthenticated(timeLeft > 0);
          }
        }
        
        console.log('[SsoContext] Data loading complete');
      } catch (error) {
        console.error('Error loading data from store:', error);
      }
    };
    
    loadData();
  }, [electron]);

  // Initialize AWS SSO only once
  useEffect(() => {
    console.log('[SsoContext Debug] Initialize effect running. Deps:', { isInitialized, appSettingsRegion: appSettings.ssoRegion });
    const initializeSso = async () => {
      try {
        console.log('[SsoContext Debug] Calling electron.init with region:', appSettings.ssoRegion);
        await electron.init(appSettings.ssoRegion);
        console.log('AWS SSO service initialized successfully (electron.init finished)');
        console.log('[SsoContext Debug] Setting isInitialized = true');
        setIsInitialized(true);
      } catch (error) {
        console.error('[SsoContext Debug] Failed to initialize AWS SSO service via electron.init:', error);
      }
    };

    if (!isInitialized && appSettings.ssoRegion) {
      console.log('[SsoContext Debug] Condition met: !isInitialized && appSettings.ssoRegion is truthy. Calling initializeSso.');
      initializeSso();
    } else {
      console.log('[SsoContext Debug] Condition NOT met for initialization:', { isInitialized, appSettingsRegion: appSettings.ssoRegion });
    }
  }, [isInitialized, appSettings.ssoRegion, electron]);

  // Refresh session time function
  const refreshSessionTime = async () => {
    try {
      console.log('[SsoContext] Refreshing session time...');
      
      // Get the current session from store to check if it's valid
      const session = await electron.getSession();
      if (!session.accessToken || !session.expiration) {
        console.log('[SsoContext] No valid session found during refresh, marking as not authenticated');
        setSessionTimeLeft(null);
        setIsAuthenticated(false);
        return 0;
      }
      
      // Calculate current time left
      const timeLeft = session.expiration - Date.now();
      console.log(`[SsoContext] Session time left: ${timeLeft}ms`);
      
      // Check if session is expired
      if (timeLeft <= 0) {
        console.log('[SsoContext] Session expired during refresh');
        setSessionTimeLeft(null);
        setIsAuthenticated(false);
        return 0;
      }
      
      // Update the session start time in the store
      const newStartTime = await electron.updateSessionStartTime();
      
      // Update state with current values
      setSessionTimeLeft(timeLeft);
      setIsAuthenticated(true);
      return timeLeft;
    } catch (error) {
      console.error('Error refreshing session time:', error);
      setIsAuthenticated(false);
      setSessionTimeLeft(null);
      return 0;
    }
  };

  // Session timer effect
  useEffect(() => {
    // If we have a session start time, we should consider ourselves authenticated
    // regardless of the other checks
    if (sessionStartTime) {
      console.log('SsoContext: Using existing session start time to initialize timer');
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - sessionStartTime;
        const SESSION_DURATION = 8 * 60 * 60 * 1000;
        const remaining = SESSION_DURATION - elapsed;
        
        if (remaining <= 0) {
          setSessionTimeLeft(null);
          return;
        }
        
        setSessionTimeLeft(remaining);
      };
      
      // Update immediately and every second
      updateTimer();
      const timerRef = setInterval(updateTimer, 1000);
      return () => clearInterval(timerRef);
    }
    
    // No session start time yet, check other conditions
    if (!isAuthenticated && (!queries?.accounts?.data || queries.accounts.data.length === 0)) {
      console.log('SsoContext: No session detected, not starting timer');
      // Don't clear sessionTimeLeft if it's already set by the Header component
      if (!sessionTimeLeft) {
        setSessionTimeLeft(null);
      }
      return;
    }

    console.log('SsoContext: Starting session timer with a new session start time');
    
    // Set initial default value to avoid "Loading..." state
    if (!sessionTimeLeft) {
      setSessionTimeLeft(8 * 60 * 60 * 1000); // 8 hours default
    }
    
    // First try to load from electron
    const loadSessionStartTime = async () => {
      try {
        const session = await electron.getSession();
        
        if (session.startTime) {
          // Found a start time
          setSessionStartTime(session.startTime);
          return session.startTime;
        }
        
        // No start time found
        const newStartTime = Date.now();
        setSessionStartTime(newStartTime);
        
        // Try to persist it
        try {
          await electron.updateSessionStartTime();
        } catch (e) {
          console.error('Failed to save session start time:', e);
        }
        
        return newStartTime;
      } catch (error) {
        console.error('Error loading/setting session start time:', error);
        const fallbackTime = Date.now();
        setSessionStartTime(fallbackTime);
        return fallbackTime;
      }
    };
    
    // Set up a simple in-memory timer right away to avoid "Loading..." state
    const tempStartTime = Date.now();
    const tempTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - tempStartTime;
      const SESSION_DURATION = 8 * 60 * 60 * 1000;
      const remaining = SESSION_DURATION - elapsed;
      
      if (remaining <= 0) {
        setSessionTimeLeft(null);
      } else {
        setSessionTimeLeft(remaining);
      }
    }, 1000);
    
    // Then set up the real timer with the proper start time
    let realTimerRef: NodeJS.Timeout | null = null;
    loadSessionStartTime().then(startTime => {
      // Clear temporary timer
      clearInterval(tempTimer);
      
      // Set up the real timer
      const SESSION_DURATION = 8 * 60 * 60 * 1000;
      
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = SESSION_DURATION - elapsed;
        
        if (remaining <= 0) {
          setSessionTimeLeft(null);
          return;
        }
        
        setSessionTimeLeft(remaining);
      };
      
      // Update immediately and then every second
      updateTimer();
      realTimerRef = setInterval(updateTimer, 1000);
    }).catch(error => {
      console.error('SsoContext: Error setting up real timer:', error);
      // Keep using the temp timer, don't clear it if we failed to set up real timer
      realTimerRef = tempTimer;
    });
    
    return () => {
      clearInterval(tempTimer);
      if (realTimerRef) {
        clearInterval(realTimerRef);
      }
    };
  }, [isAuthenticated, queries?.accounts?.data, sessionStartTime, electron]);

  const handleUpdateAppSettings = async (settings: AppSettings): Promise<void> => {
    try {
      await electron.saveAppSettings(settings);
      setAppSettings(settings);
      
      // Update SSO config with new settings
      ssoConfig.region = settings.ssoRegion;
      ssoConfig.startUrl = settings.ssoUrl;
      
      // Re-initialize if region changed
      if (settings.ssoRegion && settings.ssoRegion !== ssoConfig.region) {
        setIsInitialized(false);
      }
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  };

  const handleAddFavorite = async (accountId: string) => {
    try {
      console.log(`[SsoContext] Adding favorite ${accountId} via toggleFavorite`);
      if (!isFavorite(accountId)) {
        await toggleFavorite(accountId);
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  };

  const handleRemoveFavorite = async (accountId: string) => {
    try {
      console.log(`[SsoContext] Removing favorite ${accountId} via toggleFavorite`);
      if (isFavorite(accountId)) {
        await toggleFavorite(accountId);
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  // Implement a proper ECR login function
  const loginToEcr = async (accountId: string, roleName: string): Promise<EcrLoginResponse> => {
    // Check authentication status in a more robust way
    try {
      // First check if we have a valid token
      const session = await electron.getSession();
      const hasValidToken = session && session.accessToken && session.expiration && session.expiration > Date.now();
      
      if (!hasValidToken) {
        return {
          success: false,
          message: 'Not authenticated. Please log in first.',
          displayMessage: 'Not authenticated',
          timestamp: Date.now()
        };
      }
      
      // We have a valid token, proceed with ECR login
      const result = await ssoService.loginToEcr(accountId, roleName);
      setEcrStatus(result);
      return result;
    } catch (error) {
      console.error('Failed to login to ECR:', error);
      
      // Create a proper error response
      const errorResponse: EcrLoginResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        displayMessage: 'ECR login failed',
        timestamp: Date.now()
      };
      
      setEcrStatus(errorResponse);
      return errorResponse;
    }
  };

  // Implement a proper ECR status check function
  const checkEcrStatus = async (): Promise<EcrLoginResponse> => {
    if (!isAuthenticated || !accessToken) {
      return {
        success: false,
        message: 'Not authenticated',
        displayMessage: 'Not authenticated',
        timestamp: Date.now()
      };
    }
    
    try {
      // Use the ecrStatusCheck query to retrieve current status
      if (queries?.ecrStatusCheck?.data) {
        // Check if the error is related to Docker not running
        let message = queries.ecrStatusCheck.data.message || '';
        let displayMessage = message;
        let success = queries.ecrStatusCheck.data.success;
        
        // Handle Docker informational messages that aren't errors
        if (message.includes('Logging in with your password grants') || 
            message.includes('access-tokens')) {
          // This is actually a successful login despite the error format
          if (message.includes('Login Succeeded') || message.includes('login succeeded')) {
            success = true;
            displayMessage = 'Logged in to ECR';
          }
        } else if (message.includes('Docker is not running')) {
          displayMessage = 'Docker not running';
        } else if (message.includes('connection refused')) {
          displayMessage = 'Docker connection refused';
        } else if (message.includes('Cannot connect to the Docker daemon')) {
          displayMessage = 'Docker daemon unavailable';
        } else if (message.includes('docker') || message.includes('Docker')) {
          displayMessage = 'Docker issue detected';
        }
        
        const newStatus = {
          ...queries.ecrStatusCheck.data,
          success: success,
          displayMessage: displayMessage
        };
        
        // Only update state if the status has changed
        // if (!ecrStatus || // REMOVED setEcrStatus call
        //     ecrStatus.success !== newStatus.success || 
        //     ecrStatus.message !== newStatus.message) {
        //   setEcrStatus(newStatus);
        // }
        return newStatus;
      }
      
      // If no status available, assume not logged in
      const defaultStatus: EcrLoginResponse = {
        success: false,
        message: 'Not logged in to ECR',
        displayMessage: 'Not logged in to ECR',
        timestamp: Date.now()
      };
      
      // Only update state if the status has changed
      // if (!ecrStatus || // REMOVED setEcrStatus call
      //     ecrStatus.success !== defaultStatus.success || 
      //     ecrStatus.message !== defaultStatus.message) {
      //   setEcrStatus(defaultStatus);
      // }
      return defaultStatus;
    } catch (error) {
      console.error('Failed to check ECR status:', error);
      
      // Try to detect Docker-related errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking ECR status';
      let displayMessage = 'Error checking ECR status';
      
      if (errorMessage.includes('Docker is not running') || 
          errorMessage.includes('docker daemon') ||
          errorMessage.includes('connection refused')) {
        displayMessage = 'Docker not available';
      }
      
      const errorStatus: EcrLoginResponse = {
        success: false,
        message: errorMessage,
        displayMessage: displayMessage,
        timestamp: Date.now()
      };
      
      // Only update state if the error is different
      // if (!ecrStatus || // REMOVED setEcrStatus call
      //     ecrStatus.success !== errorStatus.success || 
      //     ecrStatus.message !== errorStatus.message) {
      //   setEcrStatus(errorStatus);
      // }
      return errorStatus;
    }
  };

  // Update ECR status from the ecrStatusCheck query result
  // useEffect(() => { // REMOVED - This can overwrite explicit login results
  //   if (queries?.ecrStatusCheck?.data) {
  //     console.log('ECR status auto-check:', queries.ecrStatusCheck.data);
  //     setEcrStatus(queries.ecrStatusCheck.data);
  //   }
  // }, [queries?.ecrStatusCheck?.data]);

  // Initial ECR login after SSO login, if configured
  useEffect(() => {
    // ADDED DEBUG LOG
    console.log('[SsoContext Debug] Initial ECR login effect check:', {
      isInitialized,
      isAuthenticated,
      ecrRepo: appSettings.ecrRepo,
      ecrRole: appSettings.ecrRole,
      conditionMet: isInitialized && isAuthenticated && !!appSettings.ecrRepo && !!appSettings.ecrRole
    });
    
    if (isInitialized && isAuthenticated && appSettings.ecrRepo && appSettings.ecrRole) {
      console.log('[SsoContext] Performing automatic ECR login after SSO authentication.');
      loginToEcr(appSettings.ecrRepo, appSettings.ecrRole).catch(error => {
        console.error("[SsoContext] Failed to perform initial ECR login:", error);
      });
    }
  }, [isInitialized, isAuthenticated, appSettings.ecrRepo, appSettings.ecrRole]);

  const handleCodeArtifactLogin = async (accountId: string, roleName: string): Promise<CodeArtifactLoginResponse> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Not authenticated', timestamp: Date.now() };
    }
    if (!queries?.codeArtifactLogin) {
      console.error("CodeArtifact login mutation not available in context.");
      return { success: false, message: 'CodeArtifact login function not ready', timestamp: Date.now() };
    }

    try {
      console.log(`[SsoContext] Triggering CodeArtifact login for ${accountId}/${roleName}`);
      const result = await queries.codeArtifactLogin.mutateAsync({ accountId, roleName });
      setCodeArtifactStatus(result); // Update context state on success/failure
      return result;
    } catch (error) {
      console.error("Error during handleCodeArtifactLogin:", error);
      const errorResponse: CodeArtifactLoginResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error logging into CodeArtifact',
        timestamp: Date.now()
      };
      setCodeArtifactStatus(errorResponse); // Update context state on error
      return errorResponse;
    }
  };

  // Update codeArtifactStatus from the query result
  useEffect(() => {
    if (queries?.codeArtifactStatusCheck?.data) {
      console.log('[SsoContext] CodeArtifact status check result:', queries.codeArtifactStatusCheck.data);
      
      // Only update state if the data has actually changed
      const newData = queries.codeArtifactStatusCheck.data;
      if (!codeArtifactStatus || 
          codeArtifactStatus.success !== newData.success || 
          codeArtifactStatus.message !== newData.message ||
          codeArtifactStatus.timestamp !== newData.timestamp) {
        setCodeArtifactStatus(newData);
      }
    }
  }, [queries?.codeArtifactStatusCheck?.data, codeArtifactStatus]);

  // ADDED: Initial Code Artifact login after SSO login, if configured
  useEffect(() => {
    if (isInitialized && isAuthenticated && appSettings.codeArtifactAccount && appSettings.codeArtifactRole) {
      console.log('[SsoContext] Performing automatic CodeArtifact login after SSO authentication.');
      handleCodeArtifactLogin(appSettings.codeArtifactAccount, appSettings.codeArtifactRole).catch(error => {
        console.error("[SsoContext] Failed to perform initial CodeArtifact login:", error);
      });
    }
  }, [isInitialized, isAuthenticated, appSettings.codeArtifactAccount, appSettings.codeArtifactRole]);

  // Function to update access token (separate from the state setter)
  const updateAccessToken = async (token: string | null) => {
    // Set token in state
    setAccessToken(token);
    
    // Set authentication state based on token
    if (token) {
      // Calculate expiration (8 hours from now)
      const expiration = Date.now() + (8 * 60 * 60 * 1000); // 8 hours
      const startTime = Date.now(); // Record the start time of the new session
      
      // Save the new session details (token, expiration, start time)
      await electron.saveSession(token, expiration);
      
      // Update context state
      setAccessToken(token);
      setSessionExpiration(expiration); // <-- Ensure this state is updated
      setSessionStartTime(startTime); // <-- Update start time for the new session
      console.log('[SsoContext Debug] Setting isAuthenticated = true');
      setIsAuthenticated(true);
      
      // Manually trigger timer update calculation immediately
      const timeLeft = expiration - Date.now();
      setSessionTimeLeft(timeLeft > 0 ? timeLeft : null);
      
    } else {
      await electron.clearSession();
      setAccessToken(null);
      setSessionExpiration(null); // Clear expiration on logout
      setSessionStartTime(null); // Clear start time on logout
      setSessionTimeLeft(null); // Clear time left on logout
      console.log('[SsoContext Debug] Setting isAuthenticated = false');
      setIsAuthenticated(false);
    }
  };

  const login = async (params?: { region: string; startUrl: string }) => {
    console.log('[SsoContext Debug] Login function called.');
    try {
      console.log('[AWS SSO] Starting login process...');

      // Use provided params or fall back to app settings
      const currentRegion = params?.region || appSettings.ssoRegion;
      const currentStartUrl = params?.startUrl || appSettings.ssoUrl;

      if (!currentRegion) {
        console.error('[AWS SSO] Region not configured in app settings');
        throw new Error('SSO region not configured');
      }

      if (!currentStartUrl) {
        console.error('[AWS SSO] Start URL not configured in app settings');
        throw new Error('SSO start URL not configured');
      }

      // --- Explicit Initialization --- 
      console.log('[AWS SSO] Ensuring service is initialized with region:', currentRegion);
      try {
        await electron.init(currentRegion);
        console.log('[AWS SSO] Service initialized successfully via electron.init within login function.');
        // Set initialized state here to allow subsequent operations
        setIsInitialized(true); 
      } catch (initError) {
        console.error('[AWS SSO] Failed to initialize service during login:', initError);
        throw new Error(`Failed to initialize AWS SSO service: ${initError instanceof Error ? initError.message : initError}`);
      }
      // --- End Explicit Initialization ---

      console.log('[AWS SSO] Using start URL:', currentStartUrl); // Use current state value
      console.log('[AWS SSO] Using region:', currentRegion); // Use current state value

      console.log('[AWS SSO] Initiating device authorization...');
      // Use current state value for the start URL
      const response = await electron.startLogin(currentStartUrl); 
      
      // Show the user code in an alert for them to copy
      const userCode = response.userCode;
      
      console.log('[AWS SSO] Device code received. User code:', userCode);
      
      // Show the user code in an alert as a backup
      alert(`Please enter this code: ${userCode}\n\nA browser window will open next. Enter this code at the prompt if needed.`);
      
      // Open the correct verification URI (with fallback)
      await electron.openExternal(response.verificationUriComplete || 'https://device.sso.amazonaws.com'); 
      
      console.log('[AWS SSO] Starting token polling via SsoService...');
      
      // Call the service's polling method which handles storing the token internally
      // and includes its own timeout/retry logic.
      const tokenResponse = await ssoService.pollForToken(response.deviceCode); 
      
      // Check the result from ssoService.pollForToken
      if (tokenResponse && tokenResponse.accessToken) {
        console.log('[AWS SSO] Successfully received access token (via ssoService.pollForToken)');
        await updateAccessToken(tokenResponse.accessToken);
        console.log('[AWS SSO] Login process completed successfully');
      } else {
        console.warn('[AWS SSO] No access token received from ssoService.pollForToken response');
        // Throw an error if pollForToken finished without a token (it should throw internally if it times out)
        throw new Error('Login failed: Did not receive access token after polling.'); 
      }
    } catch (error) {
      console.error('[AWS SSO] Error during login:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('SsoContext: Starting logout process');

      // First try to clear the session via SsoService which includes AWS SSO logout and cache clearing
      try {
        await ssoService.logout();
        console.log('SsoContext: SsoService logout completed');
      } catch (error) {
        console.error('SsoContext: Error in SsoService logout:', error);
        // Continue with the local logout despite SsoService errors
      }
      
      // Then reset all local state
      setAccessToken(null);
      setIsAuthenticated(false);
      setEcrStatus(null);
      setCodeArtifactStatus(null);
      console.log('SsoContext: Local state reset');
      
      // Try to clear session store
      try {
        await electron.clearSession();
        console.log('SsoContext: Session store cleared');
      } catch (storeError) {
        console.error('SsoContext: Error clearing session store:', storeError);
      }
      
      // Reload the app to clear all state
      console.log('SsoContext: Reloading page');
      window.location.reload();
    } catch (error) {
      console.error('SsoContext: Error during logout:', error);
      throw error;
    }
  };

  // Add periodic polling for session status
  useEffect(() => {
    if (!isAuthenticated) return;

    console.log('[SsoContext] Setting up periodic session validity check');
    
    const checkSessionValidity = async () => {
      console.log('[SsoContext] Performing periodic session validity check');
      await refreshSessionTime();
    };
    
    // Check immediately on mount
    checkSessionValidity();
    
    // Then set up interval
    const interval = setInterval(checkSessionValidity, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Trigger immediate ECR status check when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      console.log('[SsoContext] Authentication detected, checking ECR status immediately');
      // Small delay to ensure other initialization is complete
      const timer = setTimeout(() => {
        checkEcrStatus().catch(err => {
          console.error('[SsoContext] Initial ECR status check failed:', err);
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, accessToken]);

  const handleAuthExpiration = async () => {
    // Implement the logic to handle authentication expiration
    console.log('SsoContext: Handling authentication expiration');
    await logout();
  };

  const contextValue = {
    accessToken,
    setAccessToken: updateAccessToken,
    isAuthenticated,
    login,
    logout,
    ssoService,
    sessionTimeLeft,
    refreshSessionTime,
    handleAuthExpiration,
    queries,
    isInitialized,
    ecrStatus,
    codeArtifactStatus,
    favorites,
    addFavorite: handleAddFavorite,
    removeFavorite: handleRemoveFavorite,
    appSettings,
    updateAppSettings: handleUpdateAppSettings,
    getCredentials: async (accountId: string, roleName: string) => {
      // Get credentials for the role
      if (!accessToken) throw new Error("Not authenticated");
      const credentials = await ssoService.getRoleCredentials(accessToken, accountId, roleName);
      return {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      };
    },
    loginToEcr,
    checkEcrStatus,
    checkCodeArtifactStatus: async () => {
      if (!isAuthenticated) {
        return { success: false, message: 'Not authenticated', timestamp: Date.now() };
      }
      if (!queries?.codeArtifactStatusCheck) {
        console.error("CodeArtifact status check not available in context.");
        return { success: false, message: 'CodeArtifact status check function not ready', timestamp: Date.now() };
      }

      try {
        console.log(`[SsoContext] Checking CodeArtifact status for ${appSettings.codeArtifactAccount}/${appSettings.codeArtifactRole}`);
        await queries.codeArtifactStatusCheck.refetch();
        if (queries.codeArtifactStatusCheck.data) {
          console.log('[SsoContext] CodeArtifact status check result:', queries.codeArtifactStatusCheck.data);
          setCodeArtifactStatus(queries.codeArtifactStatusCheck.data);
          return queries.codeArtifactStatusCheck.data;
        } else {
          console.warn('[SsoContext] No data found in codeArtifactStatusCheck query');
          return { success: false, message: 'No data found in codeArtifactStatusCheck query', timestamp: Date.now() };
        }
      } catch (error) {
        console.error('[SsoContext] Error during checkCodeArtifactStatus:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error checking CodeArtifact status', timestamp: Date.now() };
      }
    }
  };

  return <SsoContext.Provider value={contextValue}>{children}</SsoContext.Provider>;
};

export const useSso = () => {
  const context = useContext(SsoContext);
  if (!context) {
    throw new Error('useSso must be used within an SsoProvider');
  }
  return context;
}; 
