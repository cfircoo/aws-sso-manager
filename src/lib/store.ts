import { AppSettings, StoreSchema } from '../types/store';
import { FavoriteAccount } from '../types/aws';
import { useElectron } from '../contexts/ElectronContext';

// Export a React hook that provides the store functionality
export const useStore = () => {
  const electron = useElectron();
  
  return {
    // Get application settings
    getAppSettings: electron.getAppSettings,
    
    // Save application settings
    saveAppSettings: electron.saveAppSettings,
    
    // Get default profile
    getDefaultProfile: electron.getDefaultProfile,
    
    // Save default profile
    setDefaultProfile: electron.setDefaultProfile,
    
    // Clear session data
    clearSession: electron.clearSession,
    
    // Get session data
    getSession: electron.getSession,
    
    // Save session data
    saveSession: electron.saveSession,
    
    // Update session start time
    updateSessionStartTime: electron.updateSessionStartTime,
    
    // Favorites management
    getFavorites: electron.getFavorites,
    addFavorite: electron.addFavorite,
    removeFavorite: electron.removeFavorite
  };
};

// Keep these standalone functions for backward compatibility
// They will use the ElectronContext internally
export const getAppSettings = async (): Promise<AppSettings> => {
  // This is a workaround since we can't use hooks outside of components
  // In a real React app, you should use the useStore hook inside components
  if (window.electronStore) {
    return {
      ssoUrl: await window.electronStore.get<string>('ssoUrl') || '',
      ssoRegion: await window.electronStore.get<string>('ssoRegion') || '',
      ecrRepo: await window.electronStore.get<string>('ecrRepo') || '',
      ecrRole: await window.electronStore.get<string>('ecrRole') || '',
      codeArtifactAccount: await window.electronStore.get<string>('codeArtifactAccount') || '',
      codeArtifactRole: await window.electronStore.get<string>('codeArtifactRole') || ''
    };
  }
  
  return {
    ssoUrl: '',
    ssoRegion: '',
    ecrRepo: '',
    ecrRole: '',
    codeArtifactAccount: '',
    codeArtifactRole: ''
  };
};

// Save application settings to electron-store
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  if (!window.electronStore) return;
  
  await window.electronStore.set('ssoUrl', settings.ssoUrl);
  await window.electronStore.set('ssoRegion', settings.ssoRegion);
  await window.electronStore.set('ecrRepo', settings.ecrRepo);
  await window.electronStore.set('ecrRole', settings.ecrRole);
  await window.electronStore.set('codeArtifactAccount', settings.codeArtifactAccount);
  await window.electronStore.set('codeArtifactRole', settings.codeArtifactRole);
};

// Get default profile from electron-store
export const getDefaultProfile = async () => {
  if (!window.electronStore) return null;
  return await window.electronStore.get<StoreSchema['defaultProfile']>('defaultProfile');
};

// Save default profile to electron-store
export const setDefaultProfile = async (profile: StoreSchema['defaultProfile']) => {
  if (!window.electronStore) return;
  await window.electronStore.set('defaultProfile', profile);
};

// Clear session data
export const clearSession = async () => {
  if (!window.electronStore) return;
  
  try {
    await window.electronStore.set('awsSsoAccessToken', null);
    await window.electronStore.set('awsSsoTokenExpiration', null);
    await window.electronStore.set('sessionStartTime', null);
  } catch (error) {
    console.error('Error clearing session in electronStore:', error);
  }
};

// Get session data
export const getSession = async () => {
  if (!window.electronStore) {
    return { accessToken: null, expiration: null, startTime: null };
  }
  
  return {
    accessToken: await window.electronStore.get<string>('awsSsoAccessToken'),
    expiration: await window.electronStore.get<number>('awsSsoTokenExpiration'),
    startTime: await window.electronStore.get<number>('sessionStartTime')
  };
};

// Save session data
export const saveSession = async (accessToken: string, expiration: number) => {
  if (!window.electronStore) return;
  
  await window.electronStore.set('awsSsoAccessToken', accessToken);
  await window.electronStore.set('awsSsoTokenExpiration', expiration);
  await window.electronStore.set('sessionStartTime', Date.now());
};

// Update session start time (useful for refreshing timer without full re-auth)
export const updateSessionStartTime = async () => {
  if (!window.electronStore) return Date.now();
  
  const newStartTime = Date.now();
  await window.electronStore.set('sessionStartTime', newStartTime);
  return newStartTime;
};

// Favorites management
// DEPRECATED: These standalone functions are kept for backward compatibility.
// Please use the useFavorites hook from src/hooks/useFavorites.ts instead,
// which uses ElectronContext to properly maintain state across the application.
export const getFavorites = async (): Promise<FavoriteAccount[]> => {
  if (!window.electronStore) return [];
  console.log('[store.ts] Fetching favorites from store');
  const storedFavorites = await window.electronStore.get<FavoriteAccount[]>('favorites') || [];
  console.log('[store.ts] Retrieved favorites:', storedFavorites);
  return storedFavorites;
};

export const addFavorite = async (accountId: string): Promise<void> => {
  if (!window.electronStore) return;
  
  console.log(`[store.ts] Adding favorite for account ${accountId}`);
  const favorites = await getFavorites();
  
  // Check if already in favorites
  if (!favorites.some(fav => fav.accountId === accountId)) {
    console.log('[store.ts] Account not in favorites, adding it');
    favorites.push({
      accountId,
      timestamp: Date.now()
    });
    console.log('[store.ts] Saving updated favorites to store:', favorites);
    await window.electronStore.set('favorites', favorites);
  } else {
    console.log(`[store.ts] Account ${accountId} already in favorites, skipping`);
  }
};

export const removeFavorite = async (accountId: string): Promise<void> => {
  if (!window.electronStore) return;
  
  console.log(`[store.ts] Removing favorite for account ${accountId}`);
  const favorites = await getFavorites();
  const updatedFavorites = favorites.filter(fav => fav.accountId !== accountId);
  console.log('[store.ts] Saving updated favorites after removal:', updatedFavorites);
  await window.electronStore.set('favorites', updatedFavorites);
}; 