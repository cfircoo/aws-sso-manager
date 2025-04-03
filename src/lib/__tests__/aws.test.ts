import { AwsService } from '../aws';
import { OrganizationsClient, ListAccountsCommand } from '@aws-sdk/client-organizations';
import { SSOClient, ListAccountRolesCommand, GetRoleCredentialsCommand } from '@aws-sdk/client-sso';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-organizations');
jest.mock('@aws-sdk/client-sso');

describe('AwsService', () => {
  let awsService: AwsService;
  const mockSsoConfig = {
    startUrl: 'https://test.awsapps.com/start',
    region: 'us-east-1',
    profile: 'default'
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of AwsService for each test
    awsService = new AwsService(mockSsoConfig);
  });

  describe('listAccounts', () => {
    it('should list all AWS accounts', async () => {
      const mockAccounts = [
        {
          Id: '123456789012',
          Name: 'Test Account 1',
          Email: 'test1@example.com',
          Status: 'ACTIVE',
          Arn: 'arn:aws:organizations::123456789012:account/o-1234567890/123456789012'
        },
        {
          Id: '234567890123',
          Name: 'Test Account 2',
          Email: 'test2@example.com',
          Status: 'ACTIVE',
          Arn: 'arn:aws:organizations::123456789012:account/o-1234567890/234567890123'
        }
      ];

      // Mock the OrganizationsClient send method
      (OrganizationsClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        Accounts: mockAccounts,
        NextToken: undefined
      });

      const accounts = await awsService.listAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0]).toEqual({
        id: '123456789012',
        name: 'Test Account 1',
        email: 'test1@example.com',
        status: 'active',
        arn: 'arn:aws:organizations::123456789012:account/o-1234567890/123456789012',
        roles: []
      });
      expect(OrganizationsClient.prototype.send).toHaveBeenCalledWith(
        expect.any(ListAccountsCommand)
      );
    });

    it('should handle pagination when listing accounts', async () => {
      const mockAccounts1 = [{
        Id: '123456789012',
        Name: 'Test Account 1',
        Email: 'test1@example.com',
        Status: 'ACTIVE'
      }];
      const mockAccounts2 = [{
        Id: '234567890123',
        Name: 'Test Account 2',
        Email: 'test2@example.com',
        Status: 'ACTIVE'
      }];

      // Mock two pages of results
      (OrganizationsClient.prototype.send as jest.Mock)
        .mockResolvedValueOnce({
          Accounts: mockAccounts1,
          NextToken: 'next-token'
        })
        .mockResolvedValueOnce({
          Accounts: mockAccounts2,
          NextToken: undefined
        });

      const accounts = await awsService.listAccounts();

      expect(accounts).toHaveLength(2);
      expect(OrganizationsClient.prototype.send).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when listing accounts', async () => {
      (OrganizationsClient.prototype.send as jest.Mock).mockRejectedValueOnce(
        new Error('AWS API Error')
      );

      await expect(awsService.listAccounts()).rejects.toThrow('Failed to list AWS accounts');
    });
  });

  describe('listAccountRoles', () => {
    it('should list roles for an account', async () => {
      const mockRoles = [
        {
          roleName: 'AdminRole',
          accountId: '123456789012'
        },
        {
          roleName: 'ReadOnlyRole',
          accountId: '123456789012'
        }
      ];

      (SSOClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        roleList: mockRoles,
        nextToken: undefined
      });

      const roles = await awsService.listAccountRoles('123456789012');

      expect(roles).toHaveLength(2);
      expect(roles[0]).toEqual({
        roleName: 'AdminRole',
        accountId: '123456789012'
      });
      expect(SSOClient.prototype.send).toHaveBeenCalledWith(
        expect.any(ListAccountRolesCommand)
      );
    });

    it('should handle errors when listing roles', async () => {
      (SSOClient.prototype.send as jest.Mock).mockRejectedValueOnce(
        new Error('AWS SSO API Error')
      );

      await expect(awsService.listAccountRoles('123456789012')).rejects.toThrow(
        'Failed to list account roles'
      );
    });
  });

  describe('getRoleCredentials', () => {
    it('should get credentials for a role', async () => {
      const mockCredentials = {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token',
        expiration: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      (SSOClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        roleCredentials: mockCredentials
      });

      const credentials = await awsService.getRoleCredentials(
        '123456789012',
        'AdminRole'
      );

      expect(credentials).toEqual({
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token',
        expiration: expect.any(Date)
      });
      expect(SSOClient.prototype.send).toHaveBeenCalledWith(
        expect.any(GetRoleCredentialsCommand)
      );
    });

    it('should handle errors when getting credentials', async () => {
      (SSOClient.prototype.send as jest.Mock).mockRejectedValueOnce(
        new Error('AWS SSO API Error')
      );

      await expect(
        awsService.getRoleCredentials('123456789012', 'AdminRole')
      ).rejects.toThrow('Failed to get role credentials');
    });
  });

  describe('createSession', () => {
    it('should create a new session with credentials', async () => {
      const mockAccount = {
        id: '123456789012',
        name: 'Test Account',
        email: 'test@example.com',
        status: 'active' as const,
        roles: []
      };

      const mockRole = {
        roleName: 'AdminRole',
        accountId: '123456789012'
      };

      const mockCredentials = {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token',
        expiration: Math.floor(Date.now() / 1000) + 3600
      };

      (SSOClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        roleCredentials: mockCredentials
      });

      const session = await awsService.createSession(mockAccount, mockRole);

      expect(session).toEqual({
        account: mockAccount,
        role: mockRole,
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
          sessionToken: 'test-session-token',
          expiration: expect.any(Date)
        },
        startedAt: expect.any(Date),
        expiresAt: expect.any(Date)
      });
    });
  });

  describe('refreshSession', () => {
    it('should refresh an expired session', async () => {
      const mockAccount = {
        id: '123456789012',
        name: 'Test Account',
        email: 'test@example.com',
        status: 'active' as const,
        roles: []
      };

      const mockRole = {
        roleName: 'AdminRole',
        accountId: '123456789012'
      };

      const oldSession = {
        account: mockAccount,
        role: mockRole,
        credentials: {
          accessKeyId: 'old-access-key',
          secretAccessKey: 'old-secret-key',
          sessionToken: 'old-session-token',
          expiration: new Date(Date.now() - 1000) // Expired 1 second ago
        },
        startedAt: new Date(Date.now() - 3600000), // Started 1 hour ago
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      const mockCredentials = {
        accessKeyId: 'new-access-key',
        secretAccessKey: 'new-secret-key',
        sessionToken: 'new-session-token',
        expiration: Math.floor(Date.now() / 1000) + 3600
      };

      (SSOClient.prototype.send as jest.Mock).mockResolvedValueOnce({
        roleCredentials: mockCredentials
      });

      const newSession = await awsService.refreshSession(oldSession);

      expect(newSession.credentials.accessKeyId).toBe('new-access-key');
      expect(newSession.startedAt).not.toEqual(oldSession.startedAt);
      expect(newSession.expiresAt).not.toEqual(oldSession.expiresAt);
    });

    it('should not refresh a valid session', async () => {
      const mockAccount = {
        id: '123456789012',
        name: 'Test Account',
        email: 'test@example.com',
        status: 'active' as const,
        roles: []
      };

      const mockRole = {
        roleName: 'AdminRole',
        accountId: '123456789012'
      };

      const validSession = {
        account: mockAccount,
        role: mockRole,
        credentials: {
          accessKeyId: 'valid-access-key',
          secretAccessKey: 'valid-secret-key',
          sessionToken: 'valid-session-token',
          expiration: new Date(Date.now() + 3600000) // Valid for 1 more hour
        },
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // Valid for 1 more hour
      };

      const refreshedSession = await awsService.refreshSession(validSession);

      expect(refreshedSession).toBe(validSession);
      expect(SSOClient.prototype.send).not.toHaveBeenCalled();
    });
  });
}); 