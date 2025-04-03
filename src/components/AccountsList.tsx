import { AwsAccount } from '../types/aws';
import { useState, useMemo } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import AccountItem from './AccountItem';

interface AccountsListProps {
  accounts: AwsAccount[];
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string, isSystemTerminal?: boolean) => void;
  defaultProfile?: { accountId: string; roleName: string; found: boolean };
  onProfileChanged: () => void;
  searchTerm?: string;
  accessToken: string | null;
}

const AccountsList = ({ 
  accounts, 
  onRoleSelect, 
  onOpenTerminal,
  defaultProfile,
  onProfileChanged,
  searchTerm,
  accessToken
}: AccountsListProps) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'favorites'>('all');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Filter accounts based on search term and selected tab
  const filteredAccounts = useMemo(() => {
    // Start with a base filter for the selected tab
    let results = accounts;
    
    // Filter by favorites if needed
    if (selectedTab === 'favorites') {
      results = results.filter(account => isFavorite(account.accountId));
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
  }, [accounts, searchTerm, selectedTab, isFavorite]);

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
        borderBottom: '1px solid #e0e0e0',
        marginBottom: '8px'
      }}>
        <button
          onClick={() => setSelectedTab('all')}
          style={{
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderBottom: selectedTab === 'all' ? '2px solid #0066cc' : '2px solid transparent',
            color: selectedTab === 'all' ? '#0066cc' : '#666666',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          All Accounts
        </button>
        <button
          onClick={() => setSelectedTab('favorites')}
          style={{
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderBottom: selectedTab === 'favorites' ? '2px solid #0066cc' : '2px solid transparent',
            color: selectedTab === 'favorites' ? '#0066cc' : '#666666',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Favorites
        </button>
      </div>

      {/* Account List */}
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
          />
        ))}

        {filteredAccounts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            color: '#666666'
          }}>
            {searchTerm ? (
              <p>No accounts found matching "{searchTerm}"</p>
            ) : selectedTab === 'favorites' ? (
              <p>No favorite accounts yet. Click the star icon to add accounts to your favorites.</p>
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
