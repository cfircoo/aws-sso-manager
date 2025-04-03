import { useRef, useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AwsSsoConfig, AwsAccount, EcrLoginStatus, CodeArtifactLoginStatus } from './types/aws';
import { toast } from 'sonner';
import { useSso } from './contexts/SsoContext';
import { useContext } from 'react';
import { SsoContext } from './contexts/SsoContext';
import { useElectron } from './contexts/ElectronContext';
import { Terminal } from './components/Terminal';
import { Star, ExternalLink, Settings, Terminal as TerminalIcon } from 'lucide-react';
import { formatTimeLeft } from './utils/formatTimeLeft';
import { SettingsForm } from './components/SettingsForm';
import './App.css';

// Configuration for AWS SSO
const ssoConfig: AwsSsoConfig = {
  region: 'us-east-1',
  startUrl: '',
  profile: 'default'
};

const App = () => {
  const sso = useSso();
  const electron = useElectron();
  const [showTerminal, setShowTerminal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<{
    accountId: string; 
    roleName: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken: string;
    }
  } | null>(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AWS SSO Manager</h1>
        <div className="session-info">
          {sso.sessionTimeLeft ? (
            <div>Session: {formatTimeLeft(sso.sessionTimeLeft)}</div>
          ) : (
            <div>Not logged in</div>
          )}
        </div>
        {sso.isAuthenticated && selectedAccount && (
          <button 
            className="terminal-toggle-button"
            onClick={() => setShowTerminal(!showTerminal)}
            title="Toggle Terminal"
          >
            <TerminalIcon size={18} />
          </button>
        )}
      </header>

      <main className="app-content">
        {!sso.isAuthenticated ? (
          <div className="login-container">
            <h2>Login to AWS SSO</h2>
            <button 
              className="login-button"
              onClick={() => sso.login({
                region: ssoConfig.region,
                startUrl: ssoConfig.startUrl
              })}
              disabled={!sso.isInitialized}
            >
              Login
            </button>
            {!sso.isInitialized && <p>Initializing AWS SSO...</p>}
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<AccountsList onSelectAccount={setSelectedAccount} />} />
          </Routes>
        )}
      </main>

      {showTerminal && selectedAccount && (
        <Terminal 
          credentials={selectedAccount.credentials}
          accountId={selectedAccount.accountId}
          roleName={selectedAccount.roleName}
          onClose={() => setShowTerminal(false)}
        />
      )}
    </div>
  );
};

interface AccountsListProps {
  onSelectAccount: (account: any) => void;
}

const AccountsList = ({ onSelectAccount }: AccountsListProps) => {
  const sso = useSso();
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!sso.isAuthenticated || !sso.accessToken) return;
      setLoading(true);
      try {
        if (sso.queries?.accounts?.data) {
          setAccounts(sso.queries.accounts.data);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to fetch accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [sso.isAuthenticated, sso.accessToken, sso.queries?.accounts?.data]);

  const handleSelectAccount = async (account: AwsAccount, roleName: string) => {
    try {
      if (!sso.getCredentials) {
        toast.error('getCredentials function not available');
        return;
      }
      
      const credentials = await sso.getCredentials(account.accountId, roleName);
      onSelectAccount({
        accountId: account.accountId,
        roleName,
        credentials
      });
    } catch (error) {
      console.error('Error getting credentials:', error);
      toast.error('Failed to get credentials');
    }
  };

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return <div>No accounts found</div>;
  }

  return (
    <div className="accounts-list">
      <h2>AWS Accounts</h2>
      {accounts.map(account => (
        <div key={account.accountId} className="account-item">
          <div className="account-info">
            <h3>{account.accountName || 'Unnamed Account'}</h3>
            <div className="account-id">{account.accountId}</div>
            {account.roles && account.roles.length > 0 && (
              <div className="account-roles">
                {account.roles.map(role => (
                  <button 
                    key={role.roleName}
                    className="role-button"
                    onClick={() => handleSelectAccount(account, role.roleName)}
                  >
                    {role.roleName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;