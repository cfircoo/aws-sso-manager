export interface AwsAccount {
  accountId: string;
  accountName?: string;
  emailAddress?: string;
  roles: AwsRole[];
  status?: 'active' | 'suspended';
  // Adding fields that might come from AWS Organizations API
  arn?: string;
  joinedMethod?: string;
  joinedTimestamp?: Date;
}

export interface FavoriteAccount {
  accountId: string;
  timestamp: number;
}

export interface QuickAccessRole {
  accountId: string;
  accountName?: string;
  roleName: string;
  timestamp: number;
}

export interface AwsRole {
  roleName: string;
  accountId: string;
  expires?: string;
  description?: string;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
}

export interface AwsSession {
  account: AwsAccount;
  role: AwsRole;
  credentials?: AwsCredentials;
  startedAt: Date;
  expiresAt: Date;
}

export interface AwsSsoConfig {
  region: string;
  startUrl: string;
  profile: string;
  defaultEcrAccount?: string;
  defaultEcrRole?: string;
  codeArtifactDomain?: string;
  codeArtifactRepo?: string;
}

export interface RoleInfo {
  roleName: string;
  accountId: string;
}

// New interfaces for AWS SDK responses
export interface AwsOrganizationsListAccountsResponse {
  Accounts: {
    Id: string;
    Arn: string;
    Email: string;
    Name: string;
    Status: string;
    JoinedMethod?: string;
    JoinedTimestamp?: Date;
  }[];
  NextToken?: string;
}

export interface AwsSsoListAccountRolesResponse {
  roleList: {
    roleName: string;
    accountId: string;
  }[];
  nextToken?: string;
}

export interface AwsSsoGetRoleCredentialsResponse {
  roleCredentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration: number;
  };
}

export interface EcrLoginStatus {
  success: boolean;
  message?: string;
  timestamp: number;
}

export interface EcrLoginResponse {
  success: boolean;
  message?: string;
  displayMessage?: string;
  timestamp: number;
}

export interface CodeArtifactLoginStatus {
  success: boolean;
  message?: string;
  timestamp: number;
}

export interface CodeArtifactLoginResponse {
  success: boolean;
  message?: string;
  timestamp: number;
}

export interface CodeArtifactConfig {
  domain: string;
  domainOwner: string;
  region: string;
}

export interface LoginResponse {
  verificationUriComplete: string;
  verificationUri: string;
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
}

export interface TokenResponse {
  accessToken: string;
  expiresAt: string;
}

// AwsSsoApi interface is now defined in electron.d.ts to avoid conflicts
