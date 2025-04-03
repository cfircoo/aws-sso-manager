import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import AccountCard from '../components/AccountCard';
import RoleSelector from '../components/RoleSelector';
import { AwsAccount } from '../types/aws';
import { toast } from 'sonner';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSsoContext } from '../contexts/SsoContext';

const Index = () => {
  const navigate = useNavigate();
  const { accessToken, queries, ecrStatus, codeArtifactStatus } = useSsoContext();
  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    data: accounts = [], 
    isLoading, 
    error, 
    refetch: refreshAccounts 
  } = queries.accounts;
  
  // Default profile state
  const [defaultProfile, setDefaultProfile] = useState(null);
  
  // Check auth status and redirect if not logged in
  useEffect(() => {
    if (!accessToken) {
      console.log("Not authenticated, redirecting to login");
      navigate('/login');
    }
  }, [accessToken, navigate]);

  // Load default profile
  useEffect(() => {
    const loadDefaultProfile = async () => {
      try {
        const profile = await window.awsSso.getDefaultProfile();
        setDefaultProfile(profile);
      } catch (error) {
        console.error("Error loading default profile:", error);
      }
    };
    
    loadDefaultProfile();
  }, []);
  
  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account => {
    const matches = account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountId.includes(searchTerm) ||
      account.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (matches) {
      console.log('[Search] Account matched:', {
        accountId: account.accountId,
        accountName: account.accountName
      });
    }
    return matches;
  });
  
  const handleRefresh = () => {
    refreshAccounts()
      .then(() => {
        toast.success("Successfully refreshed AWS accounts");
      })
      .catch(error => {
        console.error("Error refreshing accounts:", error);
        toast.error("Failed to refresh accounts. Please try again.");
      });
  };

  const handleProfileChanged = () => {
    // Reload default profile
    window.awsSso.getDefaultProfile()
      .then(profile => {
        setDefaultProfile(profile);
      })
      .catch(error => {
        console.error("Error reloading default profile:", error);
      });
  };
  
  const handleRoleSelect = (accountId: string, roleName: string) => {
    // This would normally handle role selection
    console.log(`Selected role ${roleName} in account ${accountId}`);
  };
  
  const handleOpenTerminal = (accountId: string, roleName: string) => {
    // This would normally open terminal
    console.log(`Opening terminal for role ${roleName} in account ${accountId}`);
  };
  
  if (!accessToken) {
    return null; // Let useEffect handle redirect
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/30">
      <Header 
        ecrStatus={ecrStatus}
        codeArtifactStatus={codeArtifactStatus}
        defaultProfile={defaultProfile}
        accounts={accounts}
      />
      
      <main className="flex-1 container mx-auto p-6 max-w-6xl">
        <RoleSelector />
        
        <div className="flex items-center justify-between mb-6">
          <SearchBar 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            totalAccounts={accounts.length}
          />
          
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Refresh accounts"
          >
            <RefreshCw className={`h-5 w-5 text-primary ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="w-full flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading AWS accounts...</p>
          </div>
        ) : error ? (
          <div className="w-full flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-8 w-8 text-destructive mb-4" />
            <p className="text-destructive font-medium mb-2">Error loading accounts</p>
            <p className="text-muted-foreground text-center max-w-md">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
            <button 
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredAccounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 account-grid">
            {filteredAccounts.map((account, index) => (
              <AccountCard 
                key={account.accountId}
                account={account}
                onRoleSelect={handleRoleSelect}
                onOpenTerminal={handleOpenTerminal}
                defaultProfile={defaultProfile}
                onProfileChanged={handleProfileChanged}
              />
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-12">
            <p className="text-muted-foreground">No accounts found matching your search criteria</p>
          </div>
        )}
      </main>
      
      <footer className="text-center py-6 text-xs text-muted-foreground">
        AWS SSO Switcher • Effortlessly manage your AWS accounts and roles
      </footer>
    </div>
  );
};

export default Index;
