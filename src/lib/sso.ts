import { 
  AwsAccount, 
  AwsRole, 
  AwsSsoConfig, 
  LoginResponse, 
  TokenResponse, 
  EcrLoginResponse, 
  CodeArtifactLoginResponse
} from '../types/aws';
import { AppSettings } from '../types/store';
/// <reference path="../types/electron.d.ts" />
import { useElectron } from '../contexts/ElectronContext';

class RateLimiter {
  private lastCallTime: number = 0;
  private minInterval: number;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  async waitForNext(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    if (timeSinceLastCall < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastCall));
    }
    this.lastCallTime = Date.now();
  }
}

// Add a wrapping hook for the SsoService
export const useSsoService = (settings: AppSettings) => {
  const electron = useElectron();
  return new SsoService(settings, electron);
};

export class SsoService {
  private config: AwsSsoConfig;
  private accessToken: string | null = null;
  private static readonly MAX_POLL_ATTEMPTS = 30; // 5 minutes total with exponential backoff
  private static readonly INITIAL_POLL_INTERVAL = 2000; // 2 seconds

  private accountsRateLimiter = new RateLimiter(2000); // 1 request per 2 seconds
  private rolesRateLimiter = new RateLimiter(2000); // 1 request per 2 seconds
  private ecrRateLimiter = new RateLimiter(1000); // 1 second
  private codeArtifactRateLimiter = new RateLimiter(1000); // 1 second
  
  // Store the electron interface to use for API calls
  private electronApi: ReturnType<typeof useElectron> | null = null;

  constructor(settings: AppSettings, electronApi?: ReturnType<typeof useElectron>) {
    // Map relevant settings to internal config
    this.config = {
      region: settings.ssoRegion || '',
      startUrl: settings.ssoUrl || '',
      profile: '', // profile might not be needed directly in service config?
      defaultEcrAccount: settings.ecrRepo || '', 
      defaultEcrRole: settings.ecrRole || '',
      codeArtifactDomain: settings.codeArtifactDomain || '',
      codeArtifactRepo: settings.codeArtifactRepo || ''
    };
    this.electronApi = electronApi || null;
  }
  
  // Helper method to get the electron API
  private getElectronApi(): ReturnType<typeof useElectron> {
    if (!this.electronApi) {
      throw new Error('Electron API not available. This service was not created using the useSsoService hook.');
    }
    return this.electronApi;
  }

  // ADDED: Method to retrieve the current access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  async getDefaultProfile(): Promise<{ accountId: string; roleName: string; found: boolean; }> {
    try {
      return await this.getElectronApi().getDefaultProfile();
    } catch (error) {
      console.error('SsoService: Error getting default profile:', error);
      return { found: false, accountId: '', roleName: '' };
    }
  }

  async login(): Promise<LoginResponse> {
    try {
      console.log('SsoService: Starting login process with start URL:', this.config.startUrl);
      if (!this.config.startUrl) {
        throw new Error('SSO Start URL not configured in SsoService config');
      }
      const response = await this.getElectronApi().startLogin(this.config.startUrl);
      console.log('SsoService: Login initiated successfully');
      return response;
    } catch (error) {
      console.error('SsoService: Error during SSO login:', error);
      throw error;
    }
  }

  async pollForToken(deviceCode: string): Promise<TokenResponse> {
    try {
      let attempts = 0;
      let interval = SsoService.INITIAL_POLL_INTERVAL;

      console.log('SsoService: Starting token polling with exponential backoff...');
      
      while (attempts < SsoService.MAX_POLL_ATTEMPTS) {
        console.log(`SsoService: Polling attempt ${attempts + 1}/${SsoService.MAX_POLL_ATTEMPTS}`);
        const response = await this.getElectronApi().pollToken(deviceCode);
        
        if (response.accessToken) {
          console.log('SsoService: Successfully received access token');
          this.accessToken = response.accessToken;
          console.log(`[SsoService Debug] Stored accessToken internally in pollForToken: ${this.accessToken ? this.accessToken.substring(0, 10) + '...' : 'NULL'}`);
          return {
            accessToken: response.accessToken,
            expiresAt: new Date(Date.now() + 1000 * 60 * 5).toISOString() // Assuming a 5-minute token validity
          };
        }

        if (response.pending) {
          console.log(`SsoService: Authorization pending, waiting ${interval}ms before next attempt`);
          await new Promise(resolve => setTimeout(resolve, interval));
          interval = Math.min(interval * 1.5, 10000); // Exponential backoff, max 10 seconds
          attempts++;
          continue;
        }

        throw new Error('Failed to get access token');
      }

      throw new Error('Token polling timed out after maximum attempts');
    } catch (error) {
      console.error('SsoService: Error polling for token:', error);
      throw error;
    }
  }

  async listAccounts(accessToken: string): Promise<AwsAccount[]> {
    try {
      await this.accountsRateLimiter.waitForNext();
      console.log('SsoService: Listing AWS accounts');
      const response = await this.getElectronApi().listAccounts(accessToken);
      console.log(`SsoService: Retrieved ${response.accounts.length} accounts`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay after successful request
      return response.accounts || [];
    } catch (error: any) {
      if (error?.name === 'TooManyRequestsException') {
        console.log('SsoService: Rate limited, waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.listAccounts(accessToken);
      }
      console.error('SsoService: Error listing accounts:', error);
      throw error;
    }
  }

  async listAccountRoles(accountId: string, accessToken: string): Promise<AwsRole[]> {
    try {
      await this.rolesRateLimiter.waitForNext();
      console.log(`SsoService: Listing roles for account ${accountId}`);
      const response = await this.getElectronApi().listAccountRoles(accessToken, accountId);
      console.log(`SsoService: Retrieved ${response.roles.length} roles for account ${accountId}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay after successful request
      return response.roles || [];
    } catch (error: any) {
      if (error?.name === 'TooManyRequestsException') {
        console.log('SsoService: Rate limited, waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.listAccountRoles(accountId, accessToken);
      }
      console.error(`SsoService: Error listing roles for account ${accountId}:`, error);
      throw error;
    }
  }

  async loginToEcr(accountId: string, roleName: string): Promise<EcrLoginResponse> {
    try {
      await this.ecrRateLimiter.waitForNext();
      console.log(`SsoService: Attempting ECR login for account ${accountId} with role ${roleName}`);
      const response = await this.getElectronApi().loginToEcr(accountId, roleName);
      console.log(`SsoService: ECR login result:`, response);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay after successful request
      return response;
    } catch (error: any) {
      if (error?.name === 'TooManyRequestsException') {
        console.log('SsoService: Rate limited, waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.loginToEcr(accountId, roleName);
      }
      console.error(`SsoService: ECR login failed for account ${accountId} with role ${roleName}:`, error);
      throw error;
    }
  }

  async checkEcrStatus(accountId: string, roleName: string, region: string): Promise<EcrLoginResponse> {
    try {
      console.log(`[DEBUG] Checking ECR status for account ${accountId} role ${roleName} in region ${region}`);
      
      // Get access token - assuming it's available via this.accessToken or another secure way
      if (!this.accessToken) {
        console.log('[DEBUG] No access token available for ECR check');
        throw new Error('No access token available');
      }

      // Get temporary credentials first
      console.log('[DEBUG] Getting temporary credentials for ECR status check');
      const credentials = await this.getElectronApi().getRoleCredentials(this.accessToken, accountId, roleName);
      
      // Run docker pull command to check ECR auth status
      const pullCmd = `docker pull ${accountId}.dkr.ecr.${region}.amazonaws.com/non-existent-image`;
      const result = await this.getElectronApi().runTerminalCommand({ 
        command: pullCmd,
        env: {
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: region
        }
      });
      
      // Check if the error is due to "repository not found" (which means auth is good)
      // rather than authentication issues
      if (result.stderr && (
        result.stderr.includes('repository') && 
        result.stderr.includes('not found')
      )) {
        // Authentication is working
        console.log('[DEBUG] ECR status check: Authentication is working');
        return {
          success: true,
          message: 'ECR authentication is working',
          timestamp: Date.now()
        };
      } else if (result.stderr && (
        result.stderr.includes('no basic auth credentials') || 
        result.stderr.includes('unauthorized')
      )) {
        // Authentication failed
        console.log('[DEBUG] ECR status check: Authentication failed');
        return {
          success: false,
          message: 'ECR authentication failed',
          timestamp: Date.now()
        };
      } else {
        // Unexpected response
        console.log('[DEBUG] ECR status check: Unexpected response');
        // If there's no error, or the error is different, assume auth is working
        // This might need refinement based on observed Docker outputs
        return {
          success: true, 
          message: 'ECR status check: Authentication appears to be working (unexpected response)',
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Error in checkEcrStatus:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error checking ECR status',
        timestamp: Date.now()
      };
    }
  }

  async getRoleCredentials(accessToken: string, accountId: string, roleName: string): Promise<{ 
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration: string;
  }> {
    try {
      console.log(`SsoService: Getting role credentials for account ${accountId} with role ${roleName}`);
      return await this.getElectronApi().getRoleCredentials(accessToken, accountId, roleName);
    } catch (error) {
      console.error(`SsoService: Error getting role credentials for account ${accountId} with role ${roleName}:`, error);
      throw error;
    }
  }

  async loginToCodeArtifact(accessToken: string, accountId: string, roleName: string): Promise<CodeArtifactLoginResponse> {
    try {
      await this.codeArtifactRateLimiter.waitForNext();
      console.log(`SsoService: Attempting CodeArtifact login for account ${accountId} with role ${roleName}`);
      
      // Get credentials for the role
      const credentials = await this.getElectronApi().getRoleCredentials(accessToken, accountId, roleName);
      
      // Check CodeArtifact login status first
      console.log('Checking CodeArtifact login status...');
      const checkResult = await this.getElectronApi().runTerminalCommand({ 
        command: 'pip index versions non-existent-package 2>&1 | grep -q "401" && echo "❌ Not logged in to CodeArtifact" || echo "✅ Logged in to CodeArtifact"',
        env: {
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: this.config.region || 'us-east-1'
        }
      });
      console.log(`[SsoService Debug] CodeArtifact status check result: stdout='${checkResult.stdout}', stderr='${checkResult.stderr}'`);

      // If not logged in, perform login
      if (checkResult.stdout.includes('❌')) {
        console.log('Logging into CodeArtifact...');
        console.log(`[SsoService Debug] Running aws codeartifact login command...`);
        console.log(`[SsoService Debug] Using domain: ${this.config.codeArtifactDomain || 'default-domain'}, repo: ${this.config.codeArtifactRepo || 'default-repo'}`);
        
        const loginResult = await this.getElectronApi().runTerminalCommand({
          command: `aws codeartifact login --tool pip --domain ${this.config.codeArtifactDomain || 'default-domain'} --domain-owner ${accountId} --repository ${this.config.codeArtifactRepo || 'default-repo'} --region ${this.config.region || 'us-east-1'}`,
          env: {
            AWS_ACCESS_KEY_ID: credentials.accessKeyId,
            AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
            AWS_SESSION_TOKEN: credentials.sessionToken,
            AWS_REGION: this.config.region || 'us-east-1'
          }
        });
        console.log(`[SsoService Debug] CodeArtifact login command result: stdout='${loginResult.stdout}', stderr='${loginResult.stderr}'`);

        if (loginResult.stderr) {
          console.log(`[SsoService Debug] CodeArtifact login command failed (stderr exists).`);
          throw new Error(loginResult.stderr);
        }

        console.log(`[SsoService Debug] CodeArtifact login successful, returning success object.`);
        return {
          success: true,
          message: 'Successfully logged in to CodeArtifact',
          timestamp: Date.now()
        };
      }

      // Already logged in
      console.log(`[SsoService Debug] Already logged in to CodeArtifact, returning success object.`);
      return {
        success: true,
        message: 'Already logged in to CodeArtifact',
        timestamp: Date.now()
      };
    } catch (error: any) {
      // Handle rate limiting
      if (error?.name === 'TooManyRequestsException') {
        console.log('SsoService: Rate limited, waiting 5 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.loginToCodeArtifact(accessToken, accountId, roleName);
      }
      console.error(`SsoService: CodeArtifact login failed for account ${accountId} with role ${roleName}:`, error);
      console.log(`[SsoService Debug] CodeArtifact login failed in catch block, returning failure object.`);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to login to CodeArtifact',
        timestamp: Date.now()
      };
    }
  }

  async logout(): Promise<void> {
    console.log('SsoService: Signing out of AWS SSO...');
    
    try {
      // Run AWS SSO logout command using our electron API
      await this.getElectronApi().runTerminalCommand({
        command: 'aws sso logout'
      });
      
      // Clear token
      console.log("[SsoService Debug] LOGOUT: Setting this.accessToken to null");
      this.accessToken = null;
      
      // Clear session in store
      await this.getElectronApi().clearSession();
      
      console.log('SsoService: Successfully signed out of AWS SSO');
    } catch (error) {
      console.error('SsoService: Error signing out:', error);
      throw error;
    }
  }
}
