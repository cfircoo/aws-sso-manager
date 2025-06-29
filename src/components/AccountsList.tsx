import { AwsAccount } from '../types/aws';
import { useState, useMemo } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import AccountItem from './AccountItem';
import { Bookmark } from 'lucide-react';

interface AccountsListProps {
  accounts: AwsAccount[];
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string, isSystemTerminal?: boolean) => void;
  defaultProfile?: { accountId: string; roleName: string; found: boolean };
  onProfileChanged: () => void;
  searchTerm?: string;
  accessToken: string | null;
  activeTab?: 'all' | 'favorites' | 'quick-access';
  totalAccounts?: number;
}

const AccountsList = ({ 
  accounts, 
  onRoleSelect, 
  onOpenTerminal,
  defaultProfile,
  onProfileChanged,
  searchTerm,
  accessToken,
  activeTab = 'all',
  totalAccounts
}: AccountsListProps) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'favorites' | 'quick-access'>('all');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { quickAccessRoles } = useQuickAccessRoles();



  // Update selectedTab when activeTab changes
  useMemo(() => {
    if (activeTab) {
      setSelectedTab(activeTab);
    }
  }, [activeTab]);

  // Find accounts with quick access roles
  const accountsWithQuickAccessRoles = useMemo(() => {
    if (selectedTab !== 'quick-access' || quickAccessRoles.length === 0) {
      return [];
    }

    // Get unique account IDs from quick access roles
    const quickAccessAccountIds = [...new Set(
      quickAccessRoles.map(role => role.accountId)
    )];

    // Filter accounts that have quick access roles
    return accounts.filter(account => 
      quickAccessAccountIds.includes(account.accountId)
    );
  }, [accounts, selectedTab, quickAccessRoles]);

  // Filter accounts based on search term and selected tab
  const filteredAccounts = useMemo(() => {
    // First determine which base account list to use
    let results = accounts;
    
    // Filter by selected tab
    if (selectedTab === 'favorites') {
      results = results.filter(account => isFavorite(account.accountId));
    } else if (selectedTab === 'quick-access') {
      results = accountsWithQuickAccessRoles;
    }
    
    // If no search term, return the tab-filtered results
    if (!searchTerm) return results;
    
    // Apply search filter on top of tab filter
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return results.filter(account => 
      account.accountName?.toLowerCase().includes(lowerCaseSearch) ||
      account.accountId.toLowerCase().includes(lowerCaseSearch) ||
      account.emailAddress?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [accounts, accountsWithQuickAccessRoles, searchTerm, selectedTab, isFavorite]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '24px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '8px'
      }}>
        <button
          onClick={() => setSelectedTab('all')}
          style={{
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderBottom: selectedTab === 'all' ? `2px solid var(--color-accent)` : '2px solid transparent',
            color: selectedTab === 'all' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>All Accounts</span>
          {totalAccounts !== undefined && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedTab === 'all' ? 'var(--color-accent)' : 'var(--color-border)',
              color: selectedTab === 'all' ? 'white' : 'var(--color-text-secondary)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {totalAccounts}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setSelectedTab('favorites')}
          style={{
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderBottom: selectedTab === 'favorites' ? `2px solid var(--color-accent)` : '2px solid transparent',
            color: selectedTab === 'favorites' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Favorites
        </button>
        <button
          onClick={() => setSelectedTab('quick-access')}
          style={{
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderBottom: selectedTab === 'quick-access' ? `2px solid var(--color-accent)` : '2px solid transparent',
            color: selectedTab === 'quick-access' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Quick Access
        </button>
      </div>

      {/* Account List - Consistent design for all tabs */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'auto'
      }}>
        {filteredAccounts.map((account) => (
          <AccountItem
            key={account.accountId}
            account={account}
            isFavorite={isFavorite(account.accountId)}
            toggleFavorite={toggleFavorite}
            onRoleSelect={onRoleSelect}
            onOpenTerminal={onOpenTerminal}
            onProfileChanged={onProfileChanged}
            isDefaultProfile={defaultProfile?.accountId === account.accountId}
            accessToken={accessToken}
            activeTab={selectedTab}
          />
        ))}

        {filteredAccounts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: 'var(--color-text-secondary)'
          }}>
            {searchTerm ? (
              <p>No accounts found matching "{searchTerm}"</p>
            ) : selectedTab === 'favorites' ? (
              <div>
                <p>No favorite accounts yet.</p>
                <p>Click the star icon to add accounts to your favorites.</p>
              </div>
            ) : selectedTab === 'quick-access' ? (
              <div>
                <Bookmark size={48} style={{ opacity: 0.3, margin: '0 auto 20px' }} />
                <p>No quick access roles yet.</p>
                <p>Click the bookmark icon next to a role to add it to quick access.</p>
              </div>
            ) : (
              <p>No accounts available</p>
            )}
          </div>
        )}
      </div>


    </div>
  );
};

export default AccountsList; 
