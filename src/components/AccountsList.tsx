import { AwsAccount, AwsRole } from '../types/aws';
import { useState, useMemo } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import AccountItem from './AccountItem';
import { Bookmark, Terminal, Copy, Check } from 'lucide-react';

interface AccountsListProps {
  accounts: AwsAccount[];
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string, isSystemTerminal?: boolean) => void;
  defaultProfile?: { accountId: string; roleName: string; found: boolean };
  onProfileChanged: () => void;
  searchTerm?: string;
  accessToken: string | null;
  activeTab?: 'all' | 'favorites' | 'quick-access';
}

const AccountsList = ({ 
  accounts, 
  onRoleSelect, 
  onOpenTerminal,
  defaultProfile,
  onProfileChanged,
  searchTerm,
  accessToken,
  activeTab = 'all'
}: AccountsListProps) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'favorites' | 'quick-access'>('all');
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { quickAccessRoles, toggleQuickAccess } = useQuickAccessRoles();

  // Handle setting default profile
  const handleSetDefaultProfile = async (accountId: string, roleName: string) => {
    try {
      // Use only window.awsSso to avoid TypeScript errors
      if (window.awsSso && window.awsSso.setDefaultProfile) {
        const result = await window.awsSso.setDefaultProfile(accountId, roleName);
        if (result.success) {
          alert(`Default profile updated successfully:\nAccount: ${accountId}\nRole: ${roleName}`);
          if (onProfileChanged) onProfileChanged();
        } else {
          alert(`Failed to update default profile: ${result.message || 'Unknown error'}`);
        }
      } else {
        console.error('setDefaultProfile method not available');
        alert('Error: Profile update functionality not available.');
      }
    } catch (err) {
      console.error('Error setting default profile:', err);
      alert(`Error setting default profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

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

  // Create a flat list of quick access roles with account info
  const flatQuickAccessRoles = useMemo(() => {
    if (selectedTab !== 'quick-access' || quickAccessRoles.length === 0) {
      return [];
    }

    return quickAccessRoles.map(role => {
      // Find the corresponding account to get additional info
      const account = accounts.find(acc => acc.accountId === role.accountId);
      
      return {
        ...role,
        accountName: account?.accountName || role.accountName || role.accountId
      };
    });
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

  // Filter flat quick access roles based on search term
  const filteredQuickAccessRoles = useMemo(() => {
    if (selectedTab !== 'quick-access' || flatQuickAccessRoles.length === 0) {
      return flatQuickAccessRoles;
    }
    
    if (!searchTerm) return flatQuickAccessRoles;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return flatQuickAccessRoles.filter(role => 
      role.roleName.toLowerCase().includes(lowerCaseSearch) ||
      role.accountName?.toLowerCase().includes(lowerCaseSearch) ||
      role.accountId.toLowerCase().includes(lowerCaseSearch)
    );
  }, [flatQuickAccessRoles, searchTerm, selectedTab]);

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
        <button
          onClick={() => setSelectedTab('quick-access')}
          style={{
            padding: '8px 0',
            background: 'none',
            border: 'none',
            borderBottom: selectedTab === 'quick-access' ? '2px solid #0066cc' : '2px solid transparent',
            color: selectedTab === 'quick-access' ? '#0066cc' : '#666666',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '-1px'
          }}
        >
          Quick Access
        </button>
      </div>

      {/* Account or Role List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflowY: 'auto'
      }}>
        {selectedTab === 'quick-access' ? (
          // Flat list of quick access roles
          filteredQuickAccessRoles.length > 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px',
              padding: '8px 0'
            }}>
              {filteredQuickAccessRoles.map((role) => (
                <div 
                  key={`${role.accountId}-${role.roleName}`}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {role.accountName}
                      <span style={{ fontSize: '0.9em', color: '#555' }}>({role.accountId})</span>
                      {' - '}
                      <span style={{ fontWeight: 'bold' }}>{role.roleName}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleQuickAccess(role.accountId, role.roleName)}
                      title="Remove from Quick Access"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0366d6'
                      }}
                    >
                      <Bookmark 
                        size={16} 
                        fill="currentColor"
                      />
                    </button>
                    <button
                      onClick={() => onRoleSelect(role.accountId, role.roleName)}
                      title="Copy Credentials"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => onOpenTerminal(role.accountId, role.roleName)}
                      title="Open Terminal"
                      style={{
                        backgroundColor: '#7e57c2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Terminal size={16} />
                    </button>
                    <button
                      onClick={() => onOpenTerminal(role.accountId, role.roleName, true)}
                      title="Open System Terminal (zsh)"
                      style={{
                        backgroundColor: '#2e7d32',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Terminal size={16} />
                    </button>
                    <button
                      onClick={() => handleSetDefaultProfile(role.accountId, role.roleName)}
                      title="Set as Default Profile"
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '32px',
              color: '#666666'
            }}>
              <div>
                <Bookmark size={48} style={{ opacity: 0.3, margin: '0 auto 20px' }} />
                <p>No quick access roles yet.</p>
                <p>Click the bookmark icon next to a role to add it to quick access.</p>
              </div>
            </div>
          )
        ) : (
          // Regular account list for other tabs
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AccountsList; 
