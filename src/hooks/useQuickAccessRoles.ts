import { useState, useEffect } from 'react';
import { QuickAccessRole } from '../types/aws';
import { useElectron } from '../contexts/ElectronContext';

export function useQuickAccessRoles() {
  const [quickAccessRoles, setQuickAccessRoles] = useState<QuickAccessRole[]>([]);
  const electron = useElectron();

  // Load quick access roles from electron store on mount
  useEffect(() => {
    const loadQuickAccessRoles = async () => {
      try {
        console.log('[useQuickAccessRoles] Loading quick access roles from electron store');
        const storedRoles = await electron.getQuickAccessRoles();
        console.log('[useQuickAccessRoles] Loaded quick access roles:', storedRoles);
        setQuickAccessRoles(storedRoles);
      } catch (error) {
        console.error('[useQuickAccessRoles] Failed to load quick access roles from electron store:', error);
      }
    };

    loadQuickAccessRoles();
  }, [electron]);

  const toggleQuickAccess = async (accountId: string, roleName: string, accountName?: string) => {
    try {
      const isQuickAccess = quickAccessRoles.some(
        role => role.accountId === accountId && role.roleName === roleName
      );
      
      if (isQuickAccess) {
        console.log(`[useQuickAccessRoles] Removing quick access role ${accountId}/${roleName}`);
        await electron.removeQuickAccessRole(accountId, roleName);
        setQuickAccessRoles(prev => 
          prev.filter(role => !(role.accountId === accountId && role.roleName === roleName))
        );
      } else {
        console.log(`[useQuickAccessRoles] Adding quick access role ${accountId}/${roleName}`);
        await electron.addQuickAccessRole(accountId, roleName, accountName);
        setQuickAccessRoles(prev => [
          ...prev, 
          { 
            accountId, 
            roleName, 
            accountName, 
            timestamp: Date.now() 
          }
        ]);
      }
    } catch (error) {
      console.error('[useQuickAccessRoles] Error toggling quick access role:', error);
    }
  };

  const isQuickAccess = (accountId: string, roleName: string) => {
    return quickAccessRoles.some(
      role => role.accountId === accountId && role.roleName === roleName
    );
  };

  return {
    quickAccessRoles,
    toggleQuickAccess,
    isQuickAccess
  };
} 