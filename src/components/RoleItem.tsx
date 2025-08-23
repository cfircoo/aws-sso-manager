import React, { useState } from 'react';
import { Copy, Terminal, Bookmark, ExternalLink, Box, Check } from 'lucide-react';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import { useSsoPortalUrl } from './common/SsoPortalUrl';
import { toast } from 'sonner';
import { QuickAccessRole } from '../types/aws';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import KubernetesClustersDialog from './KubernetesClustersDialog';
import Portal from './Portal';

interface RoleItemProps {
  role: QuickAccessRole;
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string) => void;
  onProfileChanged: () => void;
  accessToken: string | null;
  isDefaultProfile?: boolean;
}

const RoleItem: React.FC<RoleItemProps> = ({
  role,
  onRoleSelect,
  onOpenTerminal,
  onProfileChanged,
  accessToken,
  isDefaultProfile = false
}) => {
  const { toggleQuickAccess } = useQuickAccessRoles();
  const getSsoPortalUrl = useSsoPortalUrl();
  const [showKubernetes, setShowKubernetes] = useState(false);

  const handleOpenConsole = async (accountId: string, roleName: string) => {
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
      
    } catch (error) {
      console.error('Error opening console:', error);
      toast.error('Failed to open AWS Console');
    }
  };

  const handleRemoveFromQuickAccess = () => {
    toggleQuickAccess(role.accountId, role.roleName, role.accountName || '');
    toast.success('Removed from Quick Access', {
      description: `${role.roleName} has been removed from quick access`
    });
  };

  const handleCopyCredentials = async (accountId: string, roleName: string) => {
    onRoleSelect(accountId, roleName);
  };

  const handleShowKubernetes = (roleName: string) => {
    console.log('K8s button clicked for role:', roleName);
    setShowKubernetes(true);
    console.log('K8s dialog state set to:', true);
  };

  const handleSetDefaultProfile = async (accountId: string, roleName: string) => {
    try {
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

  return (
    <TooltipProvider>
      <div className="glass-card p-4 hover:shadow-md transition-all duration-200 animate-slide-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-primary truncate">{role.roleName}</h3>
                {isDefaultProfile && (
                  <span className="badge badge-success animate-pulse text-xs">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-tertiary">
                <span className="truncate">{role.accountName || 'Unknown Account'}</span>
                <span>•</span>
                <span className="font-mono">{role.accountId}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Quick Access Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromQuickAccess();
                  }}
                  className="btn-secondary p-2 transition-all duration-200 hover:scale-110 text-accent bg-accent/10 border-accent/30"
                >
                  <Bookmark size={14} fill="currentColor" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="tooltip-content">
                <span className="flex items-center gap-2">
                  <Bookmark size={12} fill="currentColor" />
                  Remove from Quick Access
                </span>
              </TooltipContent>
            </Tooltip>

            {/* Copy Credentials */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCredentials(role.accountId, role.roleName);
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
                    handleOpenConsole(role.accountId, role.roleName);
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
                    onOpenTerminal(role.accountId, role.roleName);
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
                    handleSetDefaultProfile(role.accountId, role.roleName);
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

      {/* Kubernetes Dialog */}
      {showKubernetes && (
        <Portal>
          <KubernetesClustersDialog
            isOpen={showKubernetes}
            onClose={() => setShowKubernetes(false)}
            accountId={role.accountId}
            accountName={role.accountName || 'Unknown Account'}
            roleName={role.roleName}
            accessToken={accessToken || ''}
          />
        </Portal>
      )}
    </TooltipProvider>
  );
};

export default RoleItem;
