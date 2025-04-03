import { 
  OrganizationsClient, 
  ListAccountsCommand,
  ListAccountsCommandOutput
} from '@aws-sdk/client-organizations';
import {
  SSOClient,
  ListAccountRolesCommand,
  GetRoleCredentialsCommand,
  ListAccountRolesCommandOutput,
  GetRoleCredentialsCommandOutput
} from '@aws-sdk/client-sso';
import { 
  AwsAccount, 
  AwsRole, 
  AwsCredentials, 
  AwsSession,
  AwsSsoConfig,
  AwsOrganizationsListAccountsResponse,
  AwsSsoListAccountRolesResponse,
  AwsSsoGetRoleCredentialsResponse
} from '../types/aws';

export class AwsService {
  private organizationsClient: OrganizationsClient;
  private ssoClient: SSOClient;
  private ssoConfig: AwsSsoConfig;

  constructor(ssoConfig: AwsSsoConfig) {
    this.ssoConfig = ssoConfig;
    this.organizationsClient = new OrganizationsClient({
      region: ssoConfig.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN
      }
    });

    this.ssoClient = new SSOClient({
      region: ssoConfig.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN
      }
    });
  }

  async listAccounts(): Promise<AwsAccount[]> {
    try {
      const accounts: AwsAccount[] = [];
      let nextToken: string | undefined;

      do {
        const command = new ListAccountsCommand({
          NextToken: nextToken
        });

        const response: ListAccountsCommandOutput = await this.organizationsClient.send(command);
        
        if (response.Accounts) {
          const mappedAccounts: AwsAccount[] = response.Accounts.map(account => ({
            accountId: account.Id || '',
            accountName: account.Name || '',
            emailAddress: account.Email || '',
            status: account.Status as 'active' | 'suspended',
            arn: account.Arn,
            joinedMethod: account.JoinedMethod,
            joinedTimestamp: account.JoinedTimestamp,
            roles: [] // Roles will be fetched separately
          }));
          accounts.push(...mappedAccounts);
        }

        nextToken = response.NextToken;
      } while (nextToken);

      return accounts;
    } catch (error) {
      console.error('Error listing AWS accounts:', error);
      throw new Error('Failed to list AWS accounts');
    }
  }

  async listAccountRoles(accountId: string): Promise<AwsRole[]> {
    try {
      const roles: AwsRole[] = [];
      let nextToken: string | undefined;

      do {
        const command = new ListAccountRolesCommand({
          accountId,
          accessToken: process.env.AWS_SSO_ACCESS_TOKEN,
          nextToken
        });

        const response: ListAccountRolesCommandOutput = await this.ssoClient.send(command);
        
        if (response.roleList) {
          const mappedRoles: AwsRole[] = response.roleList.map(role => ({
            roleName: role.roleName,
            accountId: role.accountId
          }));
          roles.push(...mappedRoles);
        }

        nextToken = response.nextToken;
      } while (nextToken);

      return roles;
    } catch (error) {
      console.error('Error listing account roles:', error);
      throw new Error('Failed to list account roles');
    }
  }

  async getRoleCredentials(accountId: string, roleName: string): Promise<AwsCredentials> {
    try {
      const command = new GetRoleCredentialsCommand({
        accountId,
        roleName,
        accessToken: process.env.AWS_SSO_ACCESS_TOKEN
      });

      const response: GetRoleCredentialsCommandOutput = await this.ssoClient.send(command);
      
      if (!response.roleCredentials) {
        throw new Error('No role credentials returned');
      }

      return {
        accessKeyId: response.roleCredentials.accessKeyId,
        secretAccessKey: response.roleCredentials.secretAccessKey,
        sessionToken: response.roleCredentials.sessionToken,
        expiration: new Date(response.roleCredentials.expiration * 1000)
      };
    } catch (error) {
      console.error('Error getting role credentials:', error);
      throw new Error('Failed to get role credentials');
    }
  }

  async createSession(account: AwsAccount, role: AwsRole): Promise<AwsSession> {
    try {
      const credentials = await this.getRoleCredentials(account.accountId, role.roleName);
      const startedAt = new Date();
      const expiresAt = credentials.expiration;

      return {
        account,
        role,
        credentials,
        startedAt,
        expiresAt
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create AWS session');
    }
  }

  async refreshSession(session: AwsSession): Promise<AwsSession> {
    // If the session is still valid for more than 5 minutes, return it as is
    if (session.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
      return session;
    }

    // Otherwise, create a new session
    return this.createSession(session.account, session.role);
  }
} 