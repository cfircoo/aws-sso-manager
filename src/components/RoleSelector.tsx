import { useState, useEffect } from 'react';
import { Copy, ExternalLink, Terminal } from 'lucide-react';
import { useSsoContext } from '../contexts/SsoContext';
import { toast } from 'sonner';
import { AwsAccount, AwsRole } from '../types/aws';

interface CurrentSession {
  account: AwsAccount;
  role: AwsRole;
  expiresAt: Date;
}

const RoleSelector = () => {
  const { queries } = useSsoContext();
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  const { mutate: loginToEcr } = queries.ecrLogin;
  
  useEffect(() => {
    if (!currentSession) return;
    
    const updateTime = () => {
      const now = new Date();
      const expiresAt = new Date(currentSession.expiresAt);
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${minutes}m ${seconds}s`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [currentSession]);

  const copyCredentials = async () => {
    if (!currentSession) return;
    
    try {
      // In a real app, you would get the actual credentials here
      const credentials = {
        accessKeyId: 'MOCK_ACCESS_KEY',
        secretAccessKey: 'MOCK_SECRET_KEY',
        sessionToken: 'MOCK_SESSION_TOKEN',
      };
      
      await navigator.clipboard.writeText(JSON.stringify(credentials, null, 2));
      toast.success('Credentials copied to clipboard');
    } catch (error) {
      console.error('Failed to copy credentials:', error);
      toast.error('Failed to copy credentials');
    }
  };

  const launchConsoleSession = async () => {
    if (!currentSession) return;
    
    try {
      // In a real app, you would generate a console URL here
      const consoleUrl = `https://console.aws.amazon.com/console/home?region=us-east-1`;
      window.open(consoleUrl, '_blank');
    } catch (error) {
      console.error('Failed to launch console session:', error);
      toast.error('Failed to launch console session');
    }
  };
  
  if (!currentSession) {
    return (
      <div className="w-full glass-card p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="text-center text-muted-foreground">
          <p>Select an account role to begin</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full glass-card p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-medium">Current Session:</h2>
            <span className="text-primary font-medium">{currentSession.account.accountName}</span>
            <span className="text-sm text-muted-foreground">({currentSession.account.accountId})</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm">Role: <span className="font-medium">{currentSession.role.roleName}</span></span>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
              Expires in {timeLeft}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={copyCredentials}
            className="aws-button-secondary !py-1.5 flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Credentials</span>
          </button>
          
          <button 
            onClick={launchConsoleSession}
            className="aws-button-primary !py-1.5 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Launch Console</span>
          </button>
          
          <button 
            onClick={() => {
              if (!currentSession) return;
              loginToEcr({ 
                accountId: currentSession.account.accountId, 
                roleName: currentSession.role.roleName 
              });
            }}
            className="aws-button-secondary !py-1.5 flex items-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            <span>Terminal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
