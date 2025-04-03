import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { mockAccounts } from '../lib/mockData';
import { 
  AwsAccount, 
  AwsRole, 
  AwsSession, 
  AwsSsoConfig,
  AwsOrganizationsListAccountsResponse,
  AwsSsoListAccountRolesResponse,
  AwsSsoGetRoleCredentialsResponse
} from '../types/aws';

export const useAwsSso = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [currentSession, setCurrentSession] = useState<AwsSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedAuth = localStorage.getItem('aws_sso_authenticated');
    if (storedAuth === 'true') {
      console.log("Found stored authentication, setting isAuthenticated to true");
      setIsAuthenticated(true);
    } else {
      console.log("No stored authentication found");
    }
  }, []);

  useEffect(() => {
    console.log("Authentication state changed:", isAuthenticated);
    if (isAuthenticated && accounts.length === 0) {
      console.log("Authenticated and no accounts loaded, refreshing accounts");
      refreshAccounts();
    }
  }, [isAuthenticated]);

  const refreshAccounts = useCallback(async () => {
    try {
      console.log("Refreshing accounts...");
      setIsLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setAccounts(mockAccounts);
      
      console.log('Accounts loaded:', mockAccounts);
      return true;
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Failed to load AWS accounts. Please check your AWS permissions.');
      toast.error('Failed to load AWS accounts');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (ssoConfig: AwsSsoConfig) => {
    try {
      console.log("Login attempt with config:", ssoConfig);
      setIsLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsAuthenticated(true);
      localStorage.setItem('aws_sso_authenticated', 'true');
      localStorage.setItem('aws_sso_profile', ssoConfig.profile);
      
      console.log("Login successful, isAuthenticated set to true");
      
      await refreshAccounts();
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      setError('Failed to login via AWS SSO. Check your credentials and try again.');
      toast.error('Failed to login via AWS SSO');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setIsAuthenticated(false);
      setAccounts([]);
      setCurrentSession(null);
      setError(null);
      localStorage.removeItem('aws_sso_authenticated');
      localStorage.removeItem('aws_sso_profile');
      
      toast.success('Successfully logged out');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const assumeRole = async (account: AwsAccount, role: AwsRole) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const session: AwsSession = {
        account,
        role,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        credentials: {
          accessKeyId: 'MOCK_ACCESS_KEY',
          secretAccessKey: 'MOCK_SECRET_KEY',
          sessionToken: 'MOCK_SESSION_TOKEN',
          expiration: new Date(Date.now() + 3600 * 1000)
        }
      };
      
      setCurrentSession(session);
      toast.success(`Assumed role ${role.roleName} in account ${account.accountName}`);
      return true;
    } catch (error) {
      console.error('Assume role error:', error);
      setError(`Failed to assume role ${role.roleName}. Check your permissions.`);
      toast.error(`Failed to assume role ${role.roleName}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const copyCredentials = (session: AwsSession) => {
    if (!session.credentials) {
      toast.error('No credentials available');
      return false;
    }

    try {
      const credentials = {
        AWS_ACCESS_KEY_ID: session.credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: session.credentials.secretAccessKey,
        AWS_SESSION_TOKEN: session.credentials.sessionToken
      };
      
      console.log('Credentials:', credentials);
      toast.success('Credentials copied to clipboard');
      
      return true;
    } catch (error) {
      console.error('Copy credentials error:', error);
      toast.error('Failed to copy credentials');
      return false;
    }
  };

  const launchConsoleSession = async (session: AwsSession) => {
    if (!session.credentials) {
      toast.error('No credentials available');
      return false;
    }

    try {
      toast.success('Would launch AWS Console in a real app');
      return true;
    } catch (error) {
      console.error('Launch console error:', error);
      toast.error('Failed to launch AWS Console');
      return false;
    }
  };

  return {
    isAuthenticated,
    isLoading,
    accounts,
    currentSession,
    error,
    login,
    logout,
    assumeRole,
    copyCredentials,
    launchConsoleSession,
    refreshAccounts
  };
};
