import { AwsAccount } from '../types/aws';
import { Star, Copy, Terminal, Check, Bookmark } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';

interface AccountItemProps {
  account: AwsAccount;
  isFavorite: boolean;
  toggleFavorite: (accountId: string) => void;
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string, isSystemTerminal?: boolean) => void;
  onProfileChanged: () => void;
  isDefaultProfile: boolean;
  accessToken: string | null;
  activeTab?: 'all' | 'favorites' | 'quick-access';
}

interface Role {
  roleName: string;
  accountId: string;
}

interface RolesResponse {
  roles?: Role[];
}

const AccountItem = ({ 
  account, 
  isFavorite, 
  toggleFavorite, 
  onRoleSelect, 
  onOpenTerminal,
  onProfileChanged,
  isDefaultProfile,
  accessToken,
  activeTab = 'all'
}: AccountItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [isLoadingCreds, setIsLoadingCreds] = useState(false);
  const { isQuickAccess, toggleQuickAccess } = useQuickAccessRoles();
  
  // Check if window.awsSso is available - correctly as a boolean
  const awsSsoAvailable = typeof window !== 'undefined' && !!window.awsSso;
  
  // Update the query with correct typing
  const { data, isLoading, error } = useQuery<RolesResponse>({
    queryKey: ['accountRoles', account.accountId],
    queryFn: async () => {
      if (!accessToken) throw new Error('No access token');
      if (!window.awsSso) throw new Error('AWS SSO API not available');
      
      try {
        const result = await window.awsSso.listAccountRoles(accessToken, account.accountId);
        console.log('Roles result:', result);
        return result;
      } catch (err) {
        console.error('Error fetching roles:', err);
        throw err;
      }
    },
    enabled: isExpanded && !!accessToken && awsSsoAvailable,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 5000,
  });

  // Filter roles for quick access tab
  const displayRoles = useMemo(() => {
    if (!data?.roles || data.roles.length === 0) return [];
    
    // If we're in quick access mode, only show quick access roles
    if (activeTab === 'quick-access') {
      return data.roles.filter(role => isQuickAccess(account.accountId, role.roleName));
    }
    
    // Otherwise show all roles
    return data.roles;
  }, [data?.roles, activeTab, account.accountId, isQuickAccess]);

  // Handle copying credentials using the proper flow
  const handleCopyCredentials = async (accountId: string, roleName: string) => {
    try {
      setIsLoadingCreds(true);
      setSelectedRole(roleName);
      
      if (!accessToken) throw new Error('No access token');
      
      // Get the role credentials - the response already contains the credential fields directly
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
      // You might want to add a toast notification here
    } finally {
      setIsLoadingCreds(false);
    }
  };

  // Copy credentials to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Success callback - maybe add a toast notification
        console.log('Copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
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
          onProfileChanged();
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

  // Log any errors
  if (error) {
    console.error(`Error loading roles for ${account.accountId}:`, error);
  }

  return (
    <div>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '12px 16px',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          cursor: 'pointer',
          borderBottom: isExpanded ? 'none' : '1px solid #eee'
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(account.accountId);
          }}
          style={{
            background: 'none',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px'
          }}
        >
          <Star
            size={16}
            fill={isFavorite ? "currentColor" : "none"}
            style={{
              color: isFavorite ? '#fbbf24' : '#666666'
            }}
          />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 500,
            color: '#111827',
            marginBottom: '4px'
          }}>
            {account.accountName || account.accountId}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#666666'
          }}>
            {account.accountId} • {account.emailAddress}
          </div>
        </div>
        {isDefaultProfile && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500
          }}>
            Default Profile
          </div>
        )}
        <div style={{
          marginLeft: '16px',
          transform: `rotate(${isExpanded ? '180deg' : '0deg'})`,
          transition: 'transform 0.2s ease'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* Roles Section */}
      {isExpanded && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          borderTop: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px'
        }}>
          {isLoading ? (
            <div style={{ 
              textAlign: 'center',
              color: '#666666',
              padding: '8px'
            }}>
              Loading roles...
            </div>
          ) : displayRoles.length > 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '8px'
            }}>
              {displayRoles.map((role) => (
                <div 
                  key={role.roleName}
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
                  <div style={{ fontWeight: 500 }}>{role.roleName}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleQuickAccess(account.accountId, role.roleName, account.accountName);
                      }}
                      title={isQuickAccess(account.accountId, role.roleName) ? "Remove from Quick Access" : "Add to Quick Access"}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isQuickAccess(account.accountId, role.roleName) ? '#0366d6' : '#666666'
                      }}
                    >
                      <Bookmark 
                        size={16} 
                        fill={isQuickAccess(account.accountId, role.roleName) ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCredentials(account.accountId, role.roleName);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTerminal(account.accountId, role.roleName);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTerminal(account.accountId, role.roleName, true);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefaultProfile(account.accountId, role.roleName);
                      }}
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
          ) : activeTab === 'quick-access' ? (
            <div style={{ 
              textAlign: 'center',
              color: '#666666',
              padding: '8px'
            }}>
              No quick access roles for this account
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center',
              color: '#666666',
              padding: '8px'
            }}>
              No roles available
            </div>
          )}
        </div>
      )}

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
              AWS Credentials for {account.accountName || account.accountId} - {selectedRole}
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

export default AccountItem; 