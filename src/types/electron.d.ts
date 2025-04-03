import { AwsAccount, AwsRole } from './aws';
import { EcrLoginResponse } from '../lib/sso';

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
  getAppInfo: () => Promise<{
    versions: {
      node: string;
      chrome: string;
      electron: string;
    }
  }>;
  getVersion: () => Promise<string>;
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
  getDefaultProfile: () => Promise<{ accountId: string; roleName: string; found: boolean; }>;
  setDefaultProfile: (accountId: string, roleName: string) => Promise<void>;
  logout: () => Promise<void>;
}

declare global {
  interface Window {
    electronStore: ElectronStore;
    electronShell: ElectronShell;
    electronApp: ElectronApp;
    awsSso: AwsSsoApi;
  }
}

export {}; 