import { useState, useEffect } from 'react';
import { FavoriteAccount } from '../types/aws';
import { useElectron } from '../contexts/ElectronContext';
import { showToast } from '../components/toast';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteAccount[]>([]);
  const electron = useElectron();

  // Load favorites from electron store on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        console.log('[useFavorites] Loading favorites from electron store');
        const storedFavorites = await electron.getFavorites();
        console.log('[useFavorites] Loaded favorites:', storedFavorites);
        setFavorites(storedFavorites);
      } catch (error) {
        console.error('[useFavorites] Failed to load favorites from electron store:', error);
      }
    };

    loadFavorites();
  }, [electron]);

  const toggleFavorite = async (accountId: string, accountName?: string) => {
    try {
      const isFavorite = favorites.some(fav => fav.accountId === accountId);
      const displayName = accountName || accountId;
      
      if (isFavorite) {
        console.log(`[useFavorites] Removing favorite ${accountId}`);
        await electron.removeFavorite(accountId);
        setFavorites(prev => prev.filter(fav => fav.accountId !== accountId));
        
        // Show removal toast
        showToast.info('Removed from favorites', `${displayName} is no longer in your favorites.`);
      } else {
        console.log(`[useFavorites] Adding favorite ${accountId}`);
        await electron.addFavorite(accountId);
        setFavorites(prev => [...prev, { accountId, timestamp: Date.now() }]);
        
        // Show success toast with star emoji
        showToast.custom('⭐ Added to favorites!', `${displayName} has been added to your favorites for quick access.`, '⭐');
      }
    } catch (error) {
      console.error('[useFavorites] Error toggling favorite:', error);
      showToast.error('Failed to update favorites', 'Please try again.');
    }
  };

  const isFavorite = (accountId: string) => {
    return favorites.some(fav => fav.accountId === accountId);
  };

  return {
    favorites,
    toggleFavorite,
    isFavorite
  };
} 