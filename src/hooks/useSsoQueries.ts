import { useQuery, useMutation } from '@tanstack/react-query';
import { SsoService } from '../lib/sso';
import { AwsAccount, AwsRole, LoginResponse, TokenResponse, EcrLoginResponse, CodeArtifactLoginResponse } from '../types/aws';
import { toast } from 'sonner';
import { useElectron } from '../contexts/ElectronContext';
/// <reference path="../types/electron.d.ts" />

// Query keys
export const ssoKeys = {
  all: ['sso'] as const,
  accounts: () => [...ssoKeys.all, 'accounts'] as const,
  accountRoles: (accountId: string) => [...ssoKeys.all, 'roles', accountId] as const,
  ecrStatus: (accountId: string, roleName: string) => [...ssoKeys.all, 'ecr', accountId, roleName] as const,
  ecrStatusCheck: () => [...ssoKeys.all, 'ecrStatusCheck'] as const,
  codeArtifactStatus: (accountId: string, roleName: string) => [...ssoKeys.all, 'codeartifact', accountId, roleName] as const,
  codeArtifactStatusCheck: () => [...ssoKeys.all, 'codeArtifactStatusCheck'] as const,
};

export function useSsoQueries(ssoService: SsoService, isInitialized: boolean, isAuthenticated: boolean, accessToken: string | null) {
  // Get electron functions
  const electron = useElectron();
  
  // Load settings from local storage or store
  const getAppSettings = async () => {
    try {
      // Try to get from electron store first
      return await electron.getAppSettings();
    } catch (e) {
      console.error('Failed to load settings from electron store:', e);
      // Fall back to localStorage if electron fails
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          return JSON.parse(savedSettings);
        } catch (e) {
          console.error('Failed to parse saved settings:', e);
        }
      }
      
      // Default settings if all else fails
      return {
        ssoUrl: '',
        ssoRegion: 'us-east-1',
        ecrRepo: '',
        ecrRole: '',
        codeArtifactAccount: '',
        codeArtifactRole: '',
        codeArtifactDomain: '',
        codeArtifactRepo: ''
      };
    }
  };

  const login = useMutation<LoginResponse, Error>({
    mutationFn: () => ssoService.login(),
    retry: 1,
    retryDelay: 1000
  });

  const token = useQuery<TokenResponse, Error>({
    queryKey: ['token'],
    queryFn: () => ssoService.pollForToken(login.data?.deviceCode || ''),
    enabled: isInitialized && !!login.data?.deviceCode,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  });

  const accounts = useQuery<AwsAccount[], Error>({
    queryKey: ['accounts', accessToken],
    queryFn: () => ssoService.listAccounts(accessToken!),
    enabled: isInitialized && !!accessToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: true, // Continue refreshing even when tab is in background
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000)
  });

  const roles = useQuery<AwsRole[], Error>({
    queryKey: ['roles'],
    queryFn: () => ssoService.listAccountRoles(accounts.data?.[0]?.accountId || '', token.data?.accessToken || ''),
    enabled: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  });

  const ecrLogin = useMutation<EcrLoginResponse, Error, { accountId: string; roleName: string }>({
    mutationFn: ({ accountId, roleName }) => ssoService.loginToEcr(accountId, roleName),
    retry: 1,
    retryDelay: 1000
  });

  // Add automated ECR status check that runs every 10 seconds
  const ecrStatusCheck = useQuery<EcrLoginResponse, Error>({
    queryKey: ssoKeys.ecrStatusCheck(),
    queryFn: async () => {
      console.log('[DEBUG] Running ECR status check query at:', new Date().toISOString());
      
      // Get settings for ECR
      const settings = await getAppSettings();
      const accountId = settings.ecrRepo;
      const roleName = settings.ecrRole;
      const region = settings.ssoRegion || 'us-east-1'; // Get region from settings

      if (!accountId || !roleName) {
        console.log('[DEBUG] ECR Account ID or Role Name not configured for status check.');
        return {
          success: false,
          message: 'ECR not configured for status check',
          timestamp: Date.now()
        };
      }

      // Call the dedicated service method
      return await ssoService.checkEcrStatus(accountId, roleName, region);
    },
    enabled: isInitialized && (!!token.data?.accessToken || !!localStorage.getItem('sso_access_token')),
    refetchInterval: 1000 * 60, // Check every 60 seconds
    refetchIntervalInBackground: true,
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: false // Don't retry failed checks
  });

  const codeArtifactLogin = useMutation<CodeArtifactLoginResponse, Error, { accountId: string; roleName: string }>({
    mutationFn: ({ accountId, roleName }) => {
      if (!accessToken) {
        console.error('[useSsoQueries] Cannot login to CodeArtifact, accessToken is null.');
        return Promise.reject(new Error('Access token not available'));
      }
      return ssoService.loginToCodeArtifact(accessToken, accountId, roleName);
    },
    retry: 1,
    retryDelay: 1000
  });

  // Add automated CodeArtifact status check that runs every 10 seconds
  const codeArtifactStatusCheck = useQuery<CodeArtifactLoginResponse, Error>({
    queryKey: ssoKeys.codeArtifactStatusCheck(),
    queryFn: async () => {
      console.log('[DEBUG] Running CodeArtifact status check at:', new Date().toISOString());
      
      // Get settings for CodeArtifact
      const settings = await getAppSettings();
      
      // Get default profile settings
      const defaultProfile = await ssoService.getDefaultProfile();
      
      // Use settings values with fallbacks to default profile or empty values
      const accountId = settings.codeArtifactAccount || 
          (defaultProfile && defaultProfile.found ? defaultProfile.accountId : '');
      const roleName = settings.codeArtifactRole || 
          (defaultProfile && defaultProfile.found ? defaultProfile.roleName : '');
      
      // If we don't have account and role info, can't proceed
      if (!accountId || !roleName) {
        console.log('[DEBUG] No account or role configured for CodeArtifact check');
        return {
          success: false,
          message: 'No account or role configured for CodeArtifact',
          timestamp: Date.now()
        };
      }

      try {
        // Get access token with priority: 1) function parameter, 2) token data, 3) localStorage
        let tokenSource = 'parameter';
        let effectiveToken: string | null = accessToken;
        
        if (!effectiveToken) {
          const tokenDataAccessToken = token.data?.accessToken || null;
          effectiveToken = tokenDataAccessToken;
          if (effectiveToken) {
            tokenSource = 'token.data';
          } else {
            effectiveToken = localStorage.getItem('sso_access_token');
            if (effectiveToken) {
              tokenSource = 'localStorage';
            }
          }
        }
        
        if (!effectiveToken) {
          console.log('[DEBUG] No access token available for CodeArtifact check');
          throw new Error('No access token available');
        }

        // Get temporary credentials first
        console.log(`[DEBUG] Getting temporary credentials for CodeArtifact check using token from ${tokenSource}`);
        const credentials = await electron.getRoleCredentials(effectiveToken, accountId, roleName);
        
        // Check CodeArtifact status
        const checkResult = await electron.runTerminalCommand({ 
          command: 'pip index versions non-existent-package 2>&1 | grep -q "401" && echo "❌ Not logged in to CodeArtifact" || echo "✅ Logged in to CodeArtifact"',
          env: {
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken,
            AWS_REGION: 'us-east-1'
          }
        });

        console.log('[DEBUG] CodeArtifact status check result:', checkResult.stdout);

        if (checkResult.stdout.includes('❌')) {
          console.log('[DEBUG] CodeArtifact status check: Not logged in, attempting login...');
          // Need to login
          const loginResult = await electron.runTerminalCommand({
            command: `aws codeartifact login --tool pip --domain ${settings.codeArtifactDomain || 'default-domain'} --repository ${settings.codeArtifactRepo || 'default-repo'} --domain-owner ${accountId} --region ${settings.ssoRegion || 'us-east-1'}`,
            env: {
              AWS_ACCESS_KEY_ID: credentials.accessKeyId,
              AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
              AWS_SESSION_TOKEN: credentials.sessionToken,
              AWS_REGION: settings.ssoRegion || 'us-east-1'
            }
          });

          if (loginResult.stderr) {
            throw new Error(loginResult.stderr);
          }

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
        console.error('Error in CodeArtifact status check:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Error checking CodeArtifact status',
          timestamp: Date.now()
        };
      }
    },
    enabled: isInitialized && (!!accessToken || !!token.data?.accessToken || !!localStorage.getItem('sso_access_token')),
    refetchInterval: 1000 * 60, // Check every 60 seconds
    refetchIntervalInBackground: true,
    staleTime: 5000, // Consider data stale after 5 seconds
    retry: false // Don't retry failed checks
  });

  return {
    login,
    token,
    accounts,
    roles,
    ecrLogin,
    ecrStatusCheck,
    codeArtifactLogin,
    codeArtifactStatusCheck
  };
}
