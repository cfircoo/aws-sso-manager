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

export interface AwsSsoApi {
  init: (region: string) => Promise<void>;
  startLogin: (startUrl: string) => Promise<LoginResponse>;
  pollToken: (deviceCode: string) => Promise<{ accessToken?: string; expiresIn?: number; pending?: boolean; }>;
  listAccounts: (accessToken: string) => Promise<{ accounts: AwsAccount[] }>;
  listAccountRoles: (accessToken: string, accountId: string) => Promise<{ roles: AwsRole[] }>;
  loginToEcr: (accountId: string, roleName: string) => Promise<EcrLoginResponse>;
  getRoleCredentials: (accessToken: string, accountId: string, roleName: string) => Promise<{
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration: string;
    accountId?: string;
    roleName?: string;
    region?: string;
  }>;
  runTerminalCommand: (options: { command: string; env?: Record<string, string>; }) => Promise<{
    stdout: string;
    stderr: string;
  }>;
  openTerminal: (options: { env?: Record<string, string>; }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  loginToCodeArtifact: (accountId: string, roleName: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  checkDockerStatus: () => Promise<{
    running: boolean;
    message: string;
  }>;
  getDefaultProfile: () => Promise<{
    accountId: string;
    roleName: string;
    found: boolean;
  }>;
  setDefaultProfile: (accountId: string, roleName: string) => Promise<{ 
    success: boolean; 
    profile?: any; 
    message?: string 
  }>;
  logout: () => Promise<{
    success: boolean;
    error?: string;
  }>;
}

declare global {
  interface Window {
    awsSso: AwsSsoApi;
  }
}

export {};
