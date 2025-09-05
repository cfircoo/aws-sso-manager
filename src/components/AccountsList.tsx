import { AwsAccount, QuickAccessRole } from '../types/aws';
import { useState, useMemo } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import AccountItem from './AccountItem';
import RoleItem from './RoleItem';
import { Bookmark, Users, Star, Zap } from 'lucide-react';

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

  // Calculate quick access roles count (always available)
  const quickAccessRolesCount = useMemo(() => {
    return quickAccessRoles.length;
  }, [quickAccessRoles]);

  // Find accounts with quick access roles (only when tab is selected)
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

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'all': return <Users className="w-4 h-4" />;
      case 'favorites': return <Star className="w-4 h-4" />;
      case 'quick-access': return <Zap className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'all': return totalAccounts;
      case 'favorites': return accounts.filter(account => isFavorite(account.accountId)).length;
      case 'quick-access': return quickAccessRolesCount;
      default: return 0;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Modern Tabs */}
      <div className="glass-card p-2 animate-slide-in">
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All Accounts', icon: Users },
            { key: 'favorites', label: 'Favorites', icon: Star },
            { key: 'quick-access', label: 'Quick Access', icon: Zap }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key as any)}
              className={`
                tab-button
                ${selectedTab === key ? 'tab-button-active' : 'tab-button-inactive'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {getTabCount(key) !== undefined && (
                <span className={`
                  tab-badge
                  ${selectedTab === key ? 'tab-badge-active' : 'tab-badge-inactive'}
                `}>
                  {getTabCount(key)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Container */}
      <div className="flex-1 space-y-1 animate-fade-in">
        {selectedTab === 'quick-access' && quickAccessRoles.length > 0 ? (
          <div className="space-y-2">
            {quickAccessRoles.map((role, index) => (
              <div
                key={`${role.accountId}-${role.roleName}`}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <RoleItem
                  role={role}
                  onRoleSelect={onRoleSelect}
                  onOpenTerminal={onOpenTerminal}
                  onProfileChanged={onProfileChanged}
                  accessToken={accessToken}
                  isDefaultProfile={defaultProfile?.accountId === role.accountId && defaultProfile?.roleName === role.roleName}
                />
              </div>
            ))}
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="space-y-2">
            {filteredAccounts.map((account, index) => (
              <div
                key={account.accountId}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <AccountItem
                  account={account}
                  isFavorite={isFavorite(account.accountId)}
                  toggleFavorite={(accountId, accountName) => toggleFavorite(accountId, accountName)}
                  onRoleSelect={onRoleSelect}
                  onOpenTerminal={onOpenTerminal}
                  onProfileChanged={onProfileChanged}
                  isDefaultProfile={defaultProfile?.accountId === account.accountId}
                  accessToken={accessToken}
                  activeTab={selectedTab}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center space-y-4 animate-fade-in">
            {searchTerm ? (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-tertiary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">No Results Found</h3>
                  <p className="text-tertiary max-w-md">
                    No accounts found matching <span className="font-mono text-primary">"{searchTerm}"</span>
                  </p>
                  <p className="text-sm text-muted">Try adjusting your search terms or browse all accounts.</p>
                </div>
              </>
            ) : selectedTab === 'favorites' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">No Favorites Yet</h3>
                  <p className="text-tertiary max-w-md">
                    Mark accounts as favorites by clicking the star icon to access them quickly.
                  </p>
                  <p className="text-sm text-muted">Your favorite accounts will appear here for easy access.</p>
                </div>
              </>
            ) : selectedTab === 'quick-access' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400/20 to-blue-400/20 flex items-center justify-center mb-4">
                  <Bookmark className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">No Quick Access Roles</h3>
                  <p className="text-tertiary max-w-md">
                    Add roles to quick access by clicking the bookmark icon next to any role.
                  </p>
                  <p className="text-sm text-muted">Quick access roles provide instant access to your most-used roles.</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-primary">No Accounts Available</h3>
                  <p className="text-tertiary max-w-md">
                    There are no AWS accounts available in your organization.
                  </p>
                  <p className="text-sm text-muted">Contact your administrator for access to AWS accounts.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status Footer */}
      {((selectedTab === 'quick-access' && quickAccessRoles.length > 0) || (selectedTab !== 'quick-access' && filteredAccounts.length > 0)) && (
        <div className="glass-card p-4 animate-slide-in">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-tertiary">
                {selectedTab === 'quick-access' ? (
                  <>
                    Showing <span className="font-medium text-primary">{quickAccessRoles.length}</span> quick access role{quickAccessRoles.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    Showing <span className="font-medium text-primary">{filteredAccounts.length}</span> account{filteredAccounts.length !== 1 ? 's' : ''}
                  </>
                )}
              </span>
              {searchTerm && selectedTab !== 'quick-access' && (
                <span className="text-muted">
                  matching <span className="font-mono text-primary">"{searchTerm}"</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-tertiary">Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsList; 
