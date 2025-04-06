export interface AppSettings {
  ssoUrl: string;
  ssoRegion: string;
  ecrRepo: string;
  ecrRole: string;
  codeArtifactAccount: string;
  codeArtifactRole: string;
  codeArtifactDomain: string;
  codeArtifactRepo: string;
}

export interface StoreSchema {
  ssoUrl: string;
  ssoRegion: string;
  ecrRepo: string;
  ecrRole: string;
  codeArtifactAccount: string;
  codeArtifactRole: string;
  defaultProfile: {
    accountId: string;
    roleName: string;
    found: boolean;
  } | null;
  awsSsoAccessToken: string | null;
  awsSsoTokenExpiration: number | null;
  favorites: Array<{
    accountId: string;
    timestamp: number;
  }>;
  quickAccessRoles: Array<{
    accountId: string;
    accountName?: string;
    roleName: string;
    timestamp: number;
  }>;
} 