import { useState, useEffect, useCallback } from 'react';

interface RecentRegionUsage {
  region: string;
  clusterName: string;
  accountId: string;
  lastUsed: string; // ISO timestamp
  usageCount: number;
}

interface RecentRegionSummary {
  region: string;
  lastUsed: string;
  usageCount: number;
  clusters: Array<{
    name: string;
    accountId: string;
    lastUsed: string;
  }>;
}

const STORAGE_KEY = 'k8s-recently-used-regions';
const MAX_RECENT_REGIONS = 6; // Show top 6 recently used regions
const MAX_CLUSTERS_PER_REGION = 3; // Show top 3 clusters per region

export const useRecentlyUsedRegions = () => {
  const [recentRegions, setRecentRegions] = useState<RecentRegionSummary[]>([]);

  // Process raw usage data into summarized format
  const processRecentRegions = useCallback((usageData: RecentRegionUsage[]): RecentRegionSummary[] => {
    // Group by region
    const regionMap = new Map<string, RecentRegionUsage[]>();
    
    usageData.forEach(usage => {
      if (!regionMap.has(usage.region)) {
        regionMap.set(usage.region, []);
      }
      regionMap.get(usage.region)!.push(usage);
    });

    // Create summary for each region
    const summaries: RecentRegionSummary[] = [];
    
    regionMap.forEach((usages, region) => {
      // Sort by last used
      usages.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
      
      const summary: RecentRegionSummary = {
        region,
        lastUsed: usages[0].lastUsed,
        usageCount: usages.reduce((sum, u) => sum + u.usageCount, 0),
        clusters: usages.slice(0, MAX_CLUSTERS_PER_REGION).map(u => ({
          name: u.clusterName,
          accountId: u.accountId,
          lastUsed: u.lastUsed
        }))
      };
      
      summaries.push(summary);
    });

    // Sort regions by last used and limit to MAX_RECENT_REGIONS
    return summaries
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, MAX_RECENT_REGIONS);
  }, []);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: RecentRegionUsage[] = JSON.parse(stored);
        setRecentRegions(processRecentRegions(data));
      }
    } catch (error) {
      console.error('Failed to load recently used regions:', error);
    }
  }, [processRecentRegions]);

  // Save usage data to localStorage
  const saveToStorage = (data: RecentRegionUsage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save recently used regions:', error);
    }
  };

  // Add or update region usage
  const trackRegionUsage = useCallback((region: string, clusterName: string, accountId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let usageData: RecentRegionUsage[] = stored ? JSON.parse(stored) : [];
      
      // Find existing entry
      const existingIndex = usageData.findIndex(
        u => u.region === region && u.clusterName === clusterName && u.accountId === accountId
      );
      
      const now = new Date().toISOString();
      
      if (existingIndex >= 0) {
        // Update existing entry
        usageData[existingIndex] = {
          ...usageData[existingIndex],
          lastUsed: now,
          usageCount: usageData[existingIndex].usageCount + 1
        };
      } else {
        // Add new entry
        usageData.push({
          region,
          clusterName,
          accountId,
          lastUsed: now,
          usageCount: 1
        });
      }
      
      // Keep only last 50 entries to prevent unlimited growth
      if (usageData.length > 50) {
        usageData = usageData
          .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
          .slice(0, 50);
      }
      
      saveToStorage(usageData);
      setRecentRegions(processRecentRegions(usageData));
    } catch (error) {
      console.error('Failed to track region usage:', error);
    }
  }, [processRecentRegions]);

  // Remove a region from recently used
  const removeRecentRegion = useCallback((region: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const usageData: RecentRegionUsage[] = JSON.parse(stored);
        const filteredData = usageData.filter(u => u.region !== region);
        saveToStorage(filteredData);
        setRecentRegions(processRecentRegions(filteredData));
      }
    } catch (error) {
      console.error('Failed to remove recent region:', error);
    }
  }, [processRecentRegions]);

  // Clear all recently used regions
  const clearRecentRegions = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentRegions([]);
    } catch (error) {
      console.error('Failed to clear recent regions:', error);
    }
  }, []);

  // Get formatted time ago string
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString();
  };

  return {
    recentRegions,
    trackRegionUsage,
    removeRecentRegion,
    clearRecentRegions,
    getTimeAgo,
    hasRecentRegions: recentRegions.length > 0
  };
}; 