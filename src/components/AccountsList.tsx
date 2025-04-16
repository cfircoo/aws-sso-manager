import { AwsAccount, AwsRole } from '../types/aws';
import { useState, useMemo } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import AccountItem from './AccountItem';
import { Bookmark, Terminal, Copy, Check, ExternalLink } from 'lucide-react';

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
  const { quickAccessRoles, toggleQuickAccess } = useQuickAccessRoles();
  const [showCredentials, setShowCredentials] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [isLoadingCreds, setIsLoadingCreds] = useState(false);

  // Add handleCopyCredentials function
  const handleCopyCredentials = async (accountId: string, roleName: string) => {
    try {
      setIsLoadingCreds(true);
      setSelectedRole(roleName);
      
      if (!accessToken) throw new Error('No access token');
      
      // Get the role credentials
      const result = await window.awsSso.getRoleCredentials(accessToken, accountId, roleName);
      
      if (result && result.accessKeyId) {
        setCredentials({
          accessKeyId: result.accessKeyId,
          secretAccessKey: result.secretAccessKey,
          sessionToken: result.sessionToken,
          expiration: new Date(result.expiration).toLocaleString()
        });
        setShowCredentials(true);
      } else {
        throw new Error('No credentials returned');
      }
    } catch (err) {
      console.error('Error getting credentials:', err);
      alert('Failed to get credentials: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoadingCreds(false);
    }
  };

  // Add copyToClipboard helper function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Copied to clipboard');
        alert('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
      });
  };

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

  // Function to open AWS Console with the selected role
  const handleOpenAwsConsole = async (accountId: string, roleName: string) => {
    try {
      if (!accessToken) throw new Error('No access token');
      
      // Use the AWS SSO portal URL format that directly specifies account and role
      // This format will properly handle the authentication and role assumption
      const ssoPortalUrl = `https://d-90676c94d8.awsapps.com/start/#/console?account_id=${accountId}&role_name=${roleName}&referrer=accessPortal`;
      
      // Open AWS Console in a new tab
      window.open(ssoPortalUrl, '_blank');
      
    } catch (err) {
      console.error('Error opening AWS Console:', err);
      alert('Failed to open AWS Console: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
              backgroundColor: selectedTab === 'all' ? '#0066cc' : '#e0e0e0',
              color: selectedTab === 'all' ? 'white' : '#666666',
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
                      onClick={() => handleCopyCredentials(role.accountId, role.roleName)}
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
                      onClick={() => handleOpenAwsConsole(role.accountId, role.roleName)}
                      title="Open AWS Console"
                      style={{
                        backgroundColor: '#0066cc',
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
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={() => onOpenTerminal(role.accountId, role.roleName, false)}
                      title="Open Built-in Terminal"
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
                      title="Open External Terminal"
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

      {/* Credentials Modal */}
      {showCredentials && credentials && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setShowCredentials(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ 
              fontSize: '18px', 
              marginTop: 0, 
              marginBottom: '16px' 
            }}>
              AWS Credentials for {selectedRole}
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Access Key ID:</div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5'
                }}>
                  <code style={{ wordBreak: 'break-all' }}>{credentials.accessKeyId}</code>
                  <button 
                    onClick={() => copyToClipboard(credentials.accessKeyId)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Secret Access Key:</div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5'
                }}>
                  <code style={{ wordBreak: 'break-all' }}>{credentials.secretAccessKey}</code>
                  <button 
                    onClick={() => copyToClipboard(credentials.secretAccessKey)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Session Token:</div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5'
                }}>
                  <code style={{ 
                    wordBreak: 'break-all', 
                    maxHeight: '100px', 
                    overflow: 'auto' 
                  }}>
                    {credentials.sessionToken}
                  </code>
                  <button 
                    onClick={() => copyToClipboard(credentials.sessionToken)}
                    style={{
                      backgroundColor: 'transparent',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              
              <div>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>Expiration:</div>
                <div style={{ 
                  padding: '8px',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5'
                }}>
                  {credentials.expiration}
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: '16px', 
              display: 'flex', 
              justifyContent: 'space-between' 
            }}>
              <button
                onClick={() => {
                  const envFormat = `export AWS_ACCESS_KEY_ID=${credentials.accessKeyId}
export AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}
export AWS_SESSION_TOKEN=${credentials.sessionToken}`;
                  copyToClipboard(envFormat);
                }}
                style={{
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Copy as ENV Variables
              </button>
              
              <button
                onClick={() => setShowCredentials(false)}
                style={{
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for credentials */}
      {isLoadingCreds && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            Loading credentials...
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsList; 
