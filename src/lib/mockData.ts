import { AwsAccount } from '../types/aws';

export const mockAccounts: AwsAccount[] = [
  {
    accountId: '123456789012',
    accountName: 'Production',
    emailAddress: 'aws-prod@example.com',
    status: 'active',
    roles: [
      { roleName: 'AdministratorAccess', accountId: '123456789012', description: 'Provides full access to AWS services and resources' },
      { roleName: 'ReadOnlyAccess', accountId: '123456789012', description: 'Provides read-only access to AWS services' },
      { roleName: 'DatabaseAdministrator', accountId: '123456789012', description: 'Manages database resources' }
    ]
  },
  {
    accountId: '234567890123',
    accountName: 'Development',
    emailAddress: 'aws-dev@example.com',
    status: 'active',
    roles: [
      { roleName: 'AdministratorAccess', accountId: '234567890123', description: 'Provides full access to AWS services and resources' },
      { roleName: 'PowerUserAccess', accountId: '234567890123', description: 'Provides full access to AWS services and resources, but does not allow management of users and groups' }
    ]
  },
  {
    accountId: '345678901234',
    accountName: 'Staging',
    emailAddress: 'aws-staging@example.com',
    status: 'active',
    roles: [
      { roleName: 'AdministratorAccess', accountId: '345678901234', description: 'Provides full access to AWS services and resources' },
      { roleName: 'ReadOnlyAccess', accountId: '345678901234', description: 'Provides read-only access to AWS services' }
    ]
  },
  {
    accountId: '456789012345',
    accountName: 'Data Analytics',
    emailAddress: 'aws-analytics@example.com',
    status: 'active',
    roles: [
      { roleName: 'AnalyticsFullAccess', accountId: '456789012345', description: 'Full access to analytics services' },
      { roleName: 'ReadOnlyAccess', accountId: '456789012345', description: 'Provides read-only access to AWS services' }
    ]
  },
  {
    accountId: '567890123456',
    accountName: 'Security & Compliance',
    emailAddress: 'aws-security@example.com',
    status: 'active',
    roles: [
      { roleName: 'SecurityAudit', accountId: '567890123456', description: 'Security auditing role' },
      { roleName: 'AdministratorAccess', accountId: '567890123456', description: 'Provides full access to AWS services and resources' }
    ]
  },
  {
    accountId: '678901234567',
    accountName: 'AI & Machine Learning',
    emailAddress: 'aws-ai@example.com',
    status: 'active',
    roles: [
      { roleName: 'DataScientist', accountId: '678901234567', description: 'Access to AI and ML services' },
      { roleName: 'ReadOnlyAccess', accountId: '678901234567', description: 'Provides read-only access to AWS services' }
    ]
  },
];
