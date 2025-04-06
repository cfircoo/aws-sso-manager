import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { AppSettings } from '../types/store';
import { FavoriteAccount, QuickAccessRole } from '../types/aws';

// Define interface for our Electron context
interface ElectronContextType {
  // Store functions
  getAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (settings: AppSettings) => Promise<void>;
  getDefaultProfile: () => Promise<any>; // Using 'any' to match existing type
  setDefaultProfile: (profile: any) => Promise<void>;
  clearSession: () => Promise<void>;
  getSession: () => Promise<{ accessToken: string | null; expiration: number | null; startTime: number | null }>;
  saveSession: (accessToken: string, expiration: number) => Promise<void>;
  setSession: (session: { accessToken: string; expiration: number }) => Promise<void>;
  updateSessionStartTime: () => Promise<number>;
  getFavorites: () => Promise<FavoriteAccount[]>;
  addFavorite: (accountId: string) => Promise<void>;
  removeFavorite: (accountId: string) => Promise<void>;
  getQuickAccessRoles: () => Promise<QuickAccessRole[]>;
  addQuickAccessRole: (accountId: string, roleName: string, accountName?: string) => Promise<void>;
  removeQuickAccessRole: (accountId: string, roleName: string) => Promise<void>;
  clearQuickAccessRoles: () => Promise<void>;
  
  // AWS SSO functions
  init: (region: string) => Promise<void>;
  startLogin: (startUrl: string) => Promise<any>;
  pollToken: (deviceCode: string) => Promise<any>;
  listAccounts: (accessToken: string) => Promise<any>;
  listAccountRoles: (accessToken: string, accountId: string) => Promise<any>;
  loginToEcr: (accountId: string, roleName: string) => Promise<any>;
  checkDockerStatus: () => Promise<{ running: boolean; message: string }>;
  getRoleCredentials: (accessToken: string, accountId: string, roleName: string) => Promise<any>;
  runTerminalCommand: (options: { command: string; env?: Record<string, string> }) => Promise<any>;
  openTerminal: (options: { env?: Record<string, string> }) => Promise<any>;
  
  // Shell functions
  openExternal: (url: string) => Promise<void>;
}

// Create context with default undefined value
const ElectronContext = createContext<ElectronContextType | undefined>(undefined);

export const ElectronProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isElectronAvailable, setIsElectronAvailable] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<FavoriteAccount[]>([]);
  const [quickAccessRoles, setQuickAccessRoles] = useState<QuickAccessRole[]>([]);
  
  // Check if we're running in Electron
  useEffect(() => {
    const checkElectron = async () => {
      try {
        if (window.electronStore && window.awsSso && window.electronShell) {
          setIsElectronAvailable(true);
        }
      } catch (error) {
        console.error('Not running in Electron environment:', error);
        setIsElectronAvailable(false);
      }
    };
    
    checkElectron();
  }, []);
  
  // Initialize favorites when the component mounts
  useEffect(() => {
    if (isElectronAvailable) {
      const initializeFavorites = async () => {
        console.log('[ElectronContext] Initializing favorites from store');
        const storedFavorites = await window.electronStore.get<FavoriteAccount[]>('favorites') || [];
        console.log('[ElectronContext] Loaded favorites:', storedFavorites);
        setFavorites(storedFavorites);
      };
      
      initializeFavorites();
    }
  }, [isElectronAvailable]);

  // Initialize quick access roles when the component mounts
  useEffect(() => {
    if (isElectronAvailable) {
      const initializeQuickAccessRoles = async () => {
        console.log('[ElectronContext] Initializing quick access roles from store');
        const storedRoles = await window.electronStore.get<QuickAccessRole[]>('quickAccessRoles') || [];
        console.log('[ElectronContext] Loaded quick access roles:', storedRoles);
        setQuickAccessRoles(storedRoles);
      };
      
      initializeQuickAccessRoles();
    }
  }, [isElectronAvailable]);
  
  // Store functions
  const getAppSettings = async (): Promise<AppSettings> => {
    if (!isElectronAvailable) {
      return {
        ssoUrl: '',
        ssoRegion: '',
        ecrRepo: '',
        ecrRole: '',
        codeArtifactAccount: '',
        codeArtifactRole: '',
        codeArtifactDomain: '',
        codeArtifactRepo: ''
      };
    }
    
    return {
      ssoUrl: await window.electronStore.get<string>('ssoUrl') || '',
      ssoRegion: await window.electronStore.get<string>('ssoRegion') || '',
      ecrRepo: await window.electronStore.get<string>('ecrRepo') || '',
      ecrRole: await window.electronStore.get<string>('ecrRole') || '',
      codeArtifactAccount: await window.electronStore.get<string>('codeArtifactAccount') || '',
      codeArtifactRole: await window.electronStore.get<string>('codeArtifactRole') || '',
      codeArtifactDomain: await window.electronStore.get<string>('codeArtifactDomain') || '',
      codeArtifactRepo: await window.electronStore.get<string>('codeArtifactRepo') || ''
    };
  };
  
  const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    if (!isElectronAvailable) {
      console.warn('Cannot save settings: Electron not available');
      return;
    }
    
    await window.electronStore.set('ssoUrl', settings.ssoUrl);
    await window.electronStore.set('ssoRegion', settings.ssoRegion);
    await window.electronStore.set('ecrRepo', settings.ecrRepo);
    await window.electronStore.set('ecrRole', settings.ecrRole);
    await window.electronStore.set('codeArtifactAccount', settings.codeArtifactAccount);
    await window.electronStore.set('codeArtifactRole', settings.codeArtifactRole);
    await window.electronStore.set('codeArtifactDomain', settings.codeArtifactDomain);
    await window.electronStore.set('codeArtifactRepo', settings.codeArtifactRepo);
  };
  
  const getDefaultProfile = async () => {
    if (!isElectronAvailable) return null;
    return await window.electronStore.get<any>('defaultProfile');
  };
  
  const setDefaultProfile = async (profile: any) => {
    if (!isElectronAvailable) return;
    await window.electronStore.set('defaultProfile', profile);
  };
  
  const clearSession = async () => {
    if (!isElectronAvailable) return;
    
    try {
      await window.electronStore.set('awsSsoAccessToken', null);
      await window.electronStore.set('awsSsoTokenExpiration', null);
      await window.electronStore.set('sessionStartTime', null);
    } catch (error) {
      console.error('Error clearing session in electronStore:', error);
    }
  };
  
  const getSession = async () => {
    if (!isElectronAvailable) {
      return { accessToken: null, expiration: null, startTime: null };
    }
    
    return {
      accessToken: await window.electronStore.get<string>('awsSsoAccessToken'),
      expiration: await window.electronStore.get<number>('awsSsoTokenExpiration'),
      startTime: await window.electronStore.get<number>('sessionStartTime')
    };
  };
  
  const saveSession = async (accessToken: string, expiration: number) => {
    if (!isElectronAvailable) return;
    
    await window.electronStore.set('awsSsoAccessToken', accessToken);
    await window.electronStore.set('awsSsoTokenExpiration', expiration);
    await window.electronStore.set('sessionStartTime', Date.now());
  };
  
  const setSession = async (session: { accessToken: string; expiration: number }) => {
    if (!isElectronAvailable) return;
    
    await window.electronStore.set('awsSsoAccessToken', session.accessToken);
    await window.electronStore.set('awsSsoTokenExpiration', session.expiration);
    await window.electronStore.set('sessionStartTime', Date.now());
  };
  
  const updateSessionStartTime = async () => {
    if (!isElectronAvailable) return Date.now();
    
    const newStartTime = Date.now();
    await window.electronStore.set('sessionStartTime', newStartTime);
    return newStartTime;
  };
  
  const getFavorites = async (): Promise<FavoriteAccount[]> => {
    if (!isElectronAvailable) return [];
    // Return stored favorites from state first for better performance
    if (favorites.length > 0) {
      console.log('[ElectronContext] Returning favorites from memory:', favorites);
      return favorites;
    }
    // Fallback to fetching from electron store
    console.log('[ElectronContext] Fetching favorites from store');
    const storedFavorites = await window.electronStore.get<FavoriteAccount[]>('favorites') || [];
    console.log('[ElectronContext] Fetched favorites from store:', storedFavorites);
    return storedFavorites;
  };
  
  const addFavorite = async (accountId: string): Promise<void> => {
    if (!isElectronAvailable) return;
    
    console.log(`[ElectronContext] Adding favorite ${accountId}`);
    const currentFavorites = await getFavorites();
    
    // Check if already in favorites
    if (!currentFavorites.some(fav => fav.accountId === accountId)) {
      const updatedFavorites = [...currentFavorites, {
        accountId,
        timestamp: Date.now()
      }];
      // Update state for immediate UI reflection
      console.log('[ElectronContext] Updating favorites in memory:', updatedFavorites);
      setFavorites(updatedFavorites);
      // Persist to storage
      console.log('[ElectronContext] Persisting favorites to store');
      await window.electronStore.set('favorites', updatedFavorites);
    } else {
      console.log(`[ElectronContext] Account ${accountId} already in favorites, skipping`);
    }
  };
  
  const removeFavorite = async (accountId: string): Promise<void> => {
    if (!isElectronAvailable) return;
    
    console.log(`[ElectronContext] Removing favorite ${accountId}`);
    const currentFavorites = await getFavorites();
    const updatedFavorites = currentFavorites.filter(fav => fav.accountId !== accountId);
    // Update state for immediate UI reflection
    console.log('[ElectronContext] Updating favorites in memory after removal:', updatedFavorites);
    setFavorites(updatedFavorites);
    // Persist to storage
    console.log('[ElectronContext] Persisting updated favorites to store after removal');
    await window.electronStore.set('favorites', updatedFavorites);
  };
  
  // Quick access roles methods
  const getQuickAccessRoles = async (): Promise<QuickAccessRole[]> => {
    if (!isElectronAvailable) return [];
    // Return stored quick access roles from state first for better performance
    if (quickAccessRoles.length > 0) {
      console.log('[ElectronContext] Returning quick access roles from memory:', quickAccessRoles);
      return quickAccessRoles;
    }
    // Fallback to fetching from electron store
    console.log('[ElectronContext] Fetching quick access roles from store');
    const storedRoles = await window.electronStore.get<QuickAccessRole[]>('quickAccessRoles') || [];
    console.log('[ElectronContext] Fetched quick access roles from store:', storedRoles);
    return storedRoles;
  };
  
  const addQuickAccessRole = async (accountId: string, roleName: string, accountName?: string): Promise<void> => {
    if (!isElectronAvailable) return;
    
    console.log(`[ElectronContext] Adding quick access role ${accountId}/${roleName}`);
    const currentRoles = await getQuickAccessRoles();
    
    // Check if already in quick access roles
    if (!currentRoles.some(role => role.accountId === accountId && role.roleName === roleName)) {
      const updatedRoles = [...currentRoles, {
        accountId,
        roleName,
        accountName,
        timestamp: Date.now()
      }];
      // Update state for immediate UI reflection
      console.log('[ElectronContext] Updating quick access roles in memory:', updatedRoles);
      setQuickAccessRoles(updatedRoles);
      // Persist to storage
      console.log('[ElectronContext] Persisting quick access roles to store');
      await window.electronStore.set('quickAccessRoles', updatedRoles);
    } else {
      console.log(`[ElectronContext] Role ${accountId}/${roleName} already in quick access, skipping`);
    }
  };
  
  const removeQuickAccessRole = async (accountId: string, roleName: string): Promise<void> => {
    if (!isElectronAvailable) return;
    
    console.log(`[ElectronContext] Removing quick access role ${accountId}/${roleName}`);
    const currentRoles = await getQuickAccessRoles();
    const updatedRoles = currentRoles.filter(
      role => !(role.accountId === accountId && role.roleName === roleName)
    );
    // Update state for immediate UI reflection
    console.log('[ElectronContext] Updating quick access roles in memory after removal:', updatedRoles);
    setQuickAccessRoles(updatedRoles);
    // Persist to storage
    console.log('[ElectronContext] Persisting updated quick access roles to store after removal');
    await window.electronStore.set('quickAccessRoles', updatedRoles);
  };
  
  const clearQuickAccessRoles = async (): Promise<void> => {
    if (!isElectronAvailable) return;
    
    console.log('[ElectronContext] Clearing all quick access roles');
    // Update state for immediate UI reflection
    setQuickAccessRoles([]);
    // Persist to storage
    console.log('[ElectronContext] Persisting empty quick access roles to store');
    await window.electronStore.set('quickAccessRoles', []);
  };
  
  // AWS SSO functions
  const init = async (region: string): Promise<void> => {
    if (!isElectronAvailable) return;
    return await window.awsSso.init(region);
  };
  
  const startLogin = async (startUrl: string): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.startLogin(startUrl);
  };
  
  const pollToken = async (deviceCode: string): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.pollToken(deviceCode);
  };
  
  const listAccounts = async (accessToken: string): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.listAccounts(accessToken);
  };
  
  const listAccountRoles = async (accessToken: string, accountId: string): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.listAccountRoles(accessToken, accountId);
  };
  
  const loginToEcr = async (accountId: string, roleName: string): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.loginToEcr(accountId, roleName);
  };
  
  const checkDockerStatus = async (): Promise<{ running: boolean; message: string }> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.checkDockerStatus();
  };
  
  const getRoleCredentials = async (accessToken: string, accountId: string, roleName: string): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.getRoleCredentials(accessToken, accountId, roleName);
  };
  
  const runTerminalCommand = async (options: { command: string; env?: Record<string, string> }): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.runTerminalCommand(options);
  };
  
  const openTerminal = async (options: { env?: Record<string, string> }): Promise<any> => {
    if (!isElectronAvailable) throw new Error('Electron not available');
    return await window.awsSso.openTerminal(options);
  };
  
  // Shell functions
  const openExternal = async (url: string): Promise<void> => {
    if (!isElectronAvailable) {
      window.open(url, '_blank');
      return;
    }
    return await window.electronShell.openExternal(url);
  };
  
  const contextValue: ElectronContextType = {
    // Store functions
    getAppSettings,
    saveAppSettings,
    getDefaultProfile,
    setDefaultProfile,
    clearSession,
    getSession,
    saveSession,
    setSession,
    updateSessionStartTime,
    getFavorites,
    addFavorite,
    removeFavorite,
    getQuickAccessRoles,
    addQuickAccessRole,
    removeQuickAccessRole,
    clearQuickAccessRoles,
    
    // AWS SSO functions
    init,
    startLogin,
    pollToken,
    listAccounts,
    listAccountRoles,
    loginToEcr,
    checkDockerStatus,
    getRoleCredentials,
    runTerminalCommand,
    openTerminal,
    
    // Shell functions
    openExternal,
  };
  
  return (
    <ElectronContext.Provider value={contextValue}>
      {children}
    </ElectronContext.Provider>
  );
};

// Hook to use the Electron context
export const useElectron = () => {
  const context = useContext(ElectronContext);
  if (context === undefined) {
    throw new Error('useElectron must be used within an ElectronProvider');
  }
  return context;
};