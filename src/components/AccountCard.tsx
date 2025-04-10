import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AwsAccount, AwsRole } from '../types/aws';
import { toast } from 'sonner';
import { useSso } from '../contexts/SsoContext';

interface AccountCardProps {
  account: AwsAccount;
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string, isSystemTerminal?: boolean) => void;
  defaultProfile: { accountId: string; roleName: string; found: boolean; } | null;
  onProfileChanged: () => void;
}

const AccountCard = ({ account, onRoleSelect, onOpenTerminal, defaultProfile, onProfileChanged }: AccountCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [roles, setRoles] = useState<AwsRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoleCredentials, setSelectedRoleCredentials] = useState<{roleName: string, credentials: any} | null>(null);
  const { accessToken } = useSso();
  
  const handleToggle = async () => {
    setIsExpanded(!isExpanded);
    
    // Only fetch roles when expanding and we haven't loaded them yet
    if (!isExpanded && roles.length === 0) {
      setIsLoading(true);
      try {
        if (!accessToken) {
          throw new Error('No access token available');
        }
        const response = await window.awsSso.listAccountRoles(accessToken, account.accountId);
        setRoles(response.roles || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast.error('Failed to fetch roles');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleShowCredentials = async (roleName: string) => {
    try {
      if (!accessToken) {
        throw new Error('No access token available');
      }
      const credentials = await window.awsSso.getRoleCredentials(accessToken, account.accountId, roleName);
      setSelectedRoleCredentials({ roleName, credentials });
      // Copy to clipboard
      const credentialText = `AWS_ACCESS_KEY_ID=${credentials.accessKeyId}
AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}
AWS_SESSION_TOKEN=${credentials.sessionToken}`;
      await navigator.clipboard.writeText(credentialText);
      toast.success('Credentials copied to clipboard');
    } catch (error) {
      console.error('Error getting credentials:', error);
      toast.error('Failed to get credentials');
    }
  };

  const handleSetAsDefault = async (roleName: string) => {
    try {
      const result = await window.awsSso.setDefaultProfile(account.accountId, roleName);
      toast.success(`Set ${account.accountName} (${roleName}) as default AWS profile`);
      // Notify parent component that profile was updated
      onProfileChanged();
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('default-profile-changed'));
    } catch (error) {
      console.error('Error setting default profile:', error);
      toast.error('Failed to set default profile');
    }
  };

  // Check if this account contains the default role
  const isDefaultAccount = defaultProfile?.found && defaultProfile.accountId === account.accountId;

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${isDefaultAccount ? 'border-blue-500 bg-blue-50' : ''}`}>
      <div className="flex justify-between items-center cursor-pointer" onClick={handleToggle}>
        <div>
          <div className="flex items-center">
            <h3 className="font-semibold">{account.accountName || 'Unnamed Account'}</h3>
            {isDefaultAccount && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Default Account
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{account.accountId}</p>
          {account.emailAddress && (
            <p className="text-sm text-gray-500">{account.emailAddress}</p>
          )}
        </div>
        <div className="flex items-center">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          ) : (
            <ChevronDown
              className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              size={20}
            />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          {roles.length > 0 ? (
            roles.map((role) => {
              const isDefaultRole = isDefaultAccount && defaultProfile?.roleName === role.roleName;
              return (
                <div 
                  key={role.roleName} 
                  className={`border rounded p-3 hover:bg-gray-50 ${isDefaultRole ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{role.roleName}</div>
                    {isDefaultRole && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Default CLI Profile
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleShowCredentials(role.roleName)}
                      className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
                    >
                      Copy Credentials
                    </button>
                    <button
                      onClick={() => handleSetAsDefault(role.roleName)}
                      className={`px-3 py-1 ${isDefaultRole ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded text-sm`}
                    >
                      {isDefaultRole ? '✓ Default' : 'Set as Default'}
                    </button>
                    <button
                      onClick={() => onOpenTerminal(account.accountId, role.roleName)}
                      className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                    >
                      Open Terminal
                    </button>
                    <button
                      onClick={() => onOpenTerminal(account.accountId, role.roleName, true)}
                      className="px-3 py-1 bg-green-700 text-white rounded text-sm hover:bg-green-800"
                    >
                      Open zsh
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 text-sm text-center py-2">
              {isLoading ? 'Loading roles...' : 'No roles available'}
            </div>
          )}
        </div>
      )}

      {selectedRoleCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">
              Temporary Credentials for {selectedRoleCredentials.roleName}
            </h3>
            <div className="bg-gray-100 p-4 rounded overflow-x-auto mb-4">
              <pre className="text-sm">
{`AWS_ACCESS_KEY_ID=${selectedRoleCredentials.credentials.accessKeyId}
AWS_SECRET_ACCESS_KEY=${selectedRoleCredentials.credentials.secretAccessKey}
AWS_SESSION_TOKEN=${selectedRoleCredentials.credentials.sessionToken}`}
              </pre>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedRoleCredentials(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountCard;
