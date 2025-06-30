import { AwsAccount } from '../types/aws';
import { Star, Copy, Terminal, Check, Bookmark, ExternalLink, Settings, Box, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import { useSsoPortalUrl } from './common/SsoPortalUrl';
import KubernetesClustersDialog from './KubernetesClustersDialog';
import Portal from './Portal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface AccountItemProps {
  account: AwsAccount;
  isFavorite: boolean;
  toggleFavorite: (accountId: string, accountName?: string) => void;
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
  const [showKubernetes, setShowKubernetes] = useState(false);
  const [kubernetesRole, setKubernetesRole] = useState<string | null>(null);
  const { isQuickAccess, toggleQuickAccess } = useQuickAccessRoles();
  
  // Get the SSO URL generator
  const getSsoPortalUrl = useSsoPortalUrl();
  
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
    enabled: isExpanded && !!accessToken && typeof window !== 'undefined' && !!window.awsSso,
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
        await window.awsSso.setDefaultProfile(accountId, roleName);
        alert(`Default profile updated successfully:\nAccount: ${accountId}\nRole: ${roleName}`);
        onProfileChanged();
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
      
      // Get the SSO portal URL
      const ssoPortalUrl = getSsoPortalUrl(accountId, roleName);
      
      // Debug log the URL before opening
      console.log('Opening AWS Console with URL:', {
        url: ssoPortalUrl,
        accountId,
        roleName,
        timestamp: new Date().toISOString()
      });
      
      // Open AWS Console in a new tab
      window.open(ssoPortalUrl, '_blank');
      
    } catch (err) {
      console.error('Error opening AWS Console:', err);
      alert('Failed to open AWS Console: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleShowKubernetes = (roleName: string) => {
    console.log('K8s button clicked for role:', roleName);
    setKubernetesRole(roleName);
    setShowKubernetes(true);
    console.log('K8s dialog state set to:', true);
  };

  // Log any errors
  if (error) {
    console.error(`Error loading roles for ${account.accountId}:`, error);
  }

  return (
    <TooltipProvider>
      <div className="glass-card mb-2 transition-all duration-300 hover:shadow-xl group animate-slide-in">
        {/* Main Account Header */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between p-4 cursor-pointer"
        >
          <div className="flex items-center space-x-4 flex-1">
            {/* Favorite Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(account.accountId, account.accountName || account.accountId);
                  }}
                  className={`
                    favorite-star-button btn-secondary p-2 transition-all duration-300 hover:scale-110 group
                    ${isFavorite ? 'is-favorite' : 'hover:text-yellow-400 hover:bg-yellow-500/5 hover:border-yellow-500/20'}
                  `}
                >
                  <Star
                    size={16}
                    fill={isFavorite ? "currentColor" : "none"}
                    className={`
                      favorite-star-icon transition-all duration-300 
                      ${isFavorite ? 'is-favorite' : 'group-hover:text-yellow-400 group-hover:scale-110'}
                    `}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="tooltip-content">
                <span className="flex items-center gap-2">
                  <Star size={12} fill={isFavorite ? "currentColor" : "none"} />
                  {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                </span>
              </TooltipContent>
            </Tooltip>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-semibold text-primary truncate">
                {account.accountName || account.accountId}
              </h3>
              {isDefaultProfile && (
                <span className="badge badge-success animate-pulse">
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-tertiary">
              <span className="font-mono">{account.accountId}</span>
              {account.emailAddress && (
                <>
                  <span>•</span>
                  <span className="truncate">{account.emailAddress}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Expand Icon */}
        <ChevronDown
          className={`
            w-5 h-5 text-tertiary transition-transform duration-300
            ${isExpanded ? 'transform rotate-180' : ''}
            group-hover:text-primary
          `}
        />
      </div>

      {/* Roles Section */}
      {isExpanded && (
        <div className="border-t border-glass-border bg-bg-surface/50 backdrop-blur-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2 text-tertiary">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Loading roles...</span>
              </div>
            </div>
          ) : displayRoles.length > 0 ? (
            <div className="p-4 space-y-3">
              {displayRoles.map((role, index) => (
                <div 
                  key={role.roleName}
                  className="glass-card p-4 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
                      <span className="font-medium text-primary">{role.roleName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Quick Access Toggle */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleQuickAccess(account.accountId, role.roleName, account.accountName);
                            }}
                            className={`
                              btn-secondary p-2 transition-all duration-200 hover:scale-110
                              ${isQuickAccess(account.accountId, role.roleName) 
                                ? 'text-accent bg-accent/10 border-accent/30' 
                                : 'hover:text-accent'
                              }
                            `}
                          >
                            <Bookmark 
                              size={14} 
                              fill={isQuickAccess(account.accountId, role.roleName) ? "currentColor" : "none"}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="tooltip-content">
                          <span className="flex items-center gap-2">
                            <Bookmark size={12} fill={isQuickAccess(account.accountId, role.roleName) ? "currentColor" : "none"} />
                            {isQuickAccess(account.accountId, role.roleName) ? "Remove from Quick Access" : "Add to Quick Access"}
                          </span>
                        </TooltipContent>
                      </Tooltip>

                      {/* Copy Credentials */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCredentials(account.accountId, role.roleName);
                            }}
                            className="btn-secondary p-2 hover:text-blue-400 hover:bg-blue-500/10 transition-all duration-200 hover:scale-110"
                          >
                            <Copy size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="tooltip-content">
                          <span className="flex items-center gap-2">
                            <Copy size={12} />
                            Copy AWS Credentials
                          </span>
                        </TooltipContent>
                      </Tooltip>

                      {/* AWS Console */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAwsConsole(account.accountId, role.roleName);
                            }}
                            className="btn-primary p-2 hover:scale-110 transition-all duration-200"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="tooltip-content">
                          <span className="flex items-center gap-2">
                            <ExternalLink size={12} />
                            Open AWS Console
                          </span>
                        </TooltipContent>
                      </Tooltip>

                      {/* Terminal */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTerminal(account.accountId, role.roleName, true);
                            }}
                            className="btn-secondary p-2 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200 hover:scale-110"
                          >
                            <Terminal size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="tooltip-content">
                          <span className="flex items-center gap-2">
                            <Terminal size={12} />
                            Open System Terminal
                          </span>
                        </TooltipContent>
                      </Tooltip>

                      {/* Kubernetes */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowKubernetes(role.roleName);
                            }}
                            className="btn-secondary p-2 hover:text-orange-400 hover:bg-orange-500/10 transition-all duration-200 hover:scale-110"
                          >
                            <Box size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="tooltip-content">
                          <span className="flex items-center gap-2">
                            <Box size={12} />
                            View Kubernetes Clusters
                          </span>
                        </TooltipContent>
                      </Tooltip>

                      {/* Set Default */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefaultProfile(account.accountId, role.roleName);
                            }}
                            className="btn-secondary p-2 hover:text-green-400 hover:bg-green-500/10 transition-all duration-200 hover:scale-110"
                          >
                            <Check size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="tooltip-content">
                          <span className="flex items-center gap-2">
                            <Check size={12} />
                            Set as Default Profile
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'quick-access' ? (
            <div className="flex flex-col items-center justify-center py-8 text-tertiary">
              <Bookmark size={32} className="opacity-30 mb-3" />
              <p>No quick access roles for this account</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-tertiary">
              <Settings size={32} className="opacity-30 mb-3" />
              <p>No roles available</p>
            </div>
          )}
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentials && credentials && (
        <Portal>
          <div className="modal-backdrop fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
               onClick={() => setShowCredentials(false)}>
            <div className="modal-glass-enhanced modal-content-enhanced w-full max-w-2xl max-h-[90vh] overflow-auto m-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gradient mb-6">
                  AWS Credentials • {account.accountName || account.accountId} • {selectedRole}
                </h3>
                
                <div className="space-y-4">
                  {/* Access Key ID */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Access Key ID</label>
                    <div className="credential-display flex items-center justify-between">
                      <code className="text-sm text-primary break-all">{credentials.accessKeyId}</code>
                      <button 
                        onClick={() => copyToClipboard(credentials.accessKeyId)}
                        className="btn-secondary p-2 ml-3 hover:scale-110 transition-all duration-200"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Secret Access Key */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Secret Access Key</label>
                    <div className="credential-display flex items-center justify-between">
                      <code className="text-sm text-primary break-all">{credentials.secretAccessKey}</code>
                      <button 
                        onClick={() => copyToClipboard(credentials.secretAccessKey)}
                        className="btn-secondary p-2 ml-3 hover:scale-110 transition-all duration-200"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Session Token */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Session Token</label>
                    <div className="credential-display flex items-center justify-between">
                      <code className="text-sm text-primary break-all max-h-24 overflow-auto">
                        {credentials.sessionToken}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(credentials.sessionToken)}
                        className="btn-secondary p-2 ml-3 hover:scale-110 transition-all duration-200"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">Expiration</label>
                                      <div className="credential-display">
                    <span className="text-sm text-warning">{credentials.expiration}</span>
                  </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-glass-border">
                  <button
                    onClick={() => {
                      const envFormat = `export AWS_ACCESS_KEY_ID=${credentials.accessKeyId}
export AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}
export AWS_SESSION_TOKEN=${credentials.sessionToken}`;
                      copyToClipboard(envFormat);
                    }}
                    className="btn-secondary hover:scale-105 transition-all duration-200"
                  >
                    Copy as ENV Variables
                  </button>
                  
                  <button
                    onClick={() => setShowCredentials(false)}
                    className="btn-primary hover:scale-105 transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Loading overlay for credentials */}
      {isLoadingCreds && (
        <Portal>
          <div className="modal-backdrop fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[9999]">
            <div className="modal-glass-enhanced modal-content-enhanced p-6 flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-primary">Loading credentials...</span>
            </div>
          </div>
        </Portal>
      )}

      {/* Kubernetes Clusters Dialog */}
      {showKubernetes && kubernetesRole && accessToken && (
        <Portal>
          <KubernetesClustersDialog
            isOpen={showKubernetes}
            onClose={() => {
              setShowKubernetes(false);
              setKubernetesRole(null);
            }}
            accountId={account.accountId}
            accountName={account.accountName || 'Unnamed Account'}
            roleName={kubernetesRole}
            accessToken={accessToken}
          />
        </Portal>
      )}
      </div>
    </TooltipProvider>
  );
};

export default AccountItem; 