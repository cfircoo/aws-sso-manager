import { AwsAccount, AwsRole } from './aws';

interface ElectronStore {
  get: <T>(key: string) => Promise<T>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  path: string;
}

interface ElectronShell {
  openExternal: (url: string) => Promise<void>;
}

interface ElectronApp {
  getVersion: () => Promise<string>;
  getAppInfo: () => Promise<any>;
  openSettingsFile: () => Promise<{ success: boolean; error?: string }>;
  openLogsFile: () => Promise<{ success: boolean; error?: string }>;
}

interface AwsSsoApi {
  init: (region: string) => Promise<void>;
  startLogin: (startUrl: string) => Promise<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
    expiresIn: number;
    interval: number;
  }>;
  pollToken: (deviceCode: string) => Promise<{ 
    accessToken: string | null;
    tokenType: string | null;
    expiresIn: number | null;
    pending: boolean;
  }>;
  listAccounts: (accessToken: string) => Promise<{ accounts: any[] }>;
  listAccountRoles: (accessToken: string, accountId: string) => Promise<{ roles: any[] }>;
  loginToEcr: (accountId: string, roleName: string) => Promise<{
    success: boolean;
    message: string;
    timestamp?: number;
  }>;
  getRoleCredentials: (accessToken: string, accountId: string, roleName: string) => Promise<{
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    expiration: string;
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
    message: string;
    timestamp?: number;
  }>;
  listEksClusters: (accessToken: string, accountId: string, roleName: string, region: string) => Promise<{
    success: boolean;
    clusters: Array<{
      name: string;
      status: string;
      version: string;
      endpoint: string | null;
      arn: string | null;
      region: string;
    }>;
    message?: string;
  }>;
  setKubectlContext: (accessToken: string, accountId: string, roleName: string, clusterName: string, region: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  checkKubectlStatus: () => Promise<{
    available: boolean;
    version?: string;
    currentContext?: string;
    clusterInfo?: string;
    message: string;
  }>;
  checkDockerStatus: () => Promise<{
    running: boolean;
    message: string;
  }>;
  getDefaultProfile: () => Promise<{ accountId: string; roleName: string; found: boolean; }>;
  setDefaultProfile: (accountId: string, roleName: string) => Promise<void>;
  logout: () => Promise<void>;
}

declare global {
  interface Window {
    electronApp: ElectronApp;
    electronStore: ElectronStore;
    electronShell: ElectronShell;
    awsSso: AwsSsoApi;
  }
}

export {}; 