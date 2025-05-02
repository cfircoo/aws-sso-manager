/// <reference path="../types/electron.d.ts" />
import { useEffect, useRef } from 'react';
import { useSso } from '../contexts/SsoContext';
import { EcrLoginResponse } from '../types/aws';
import HeaderTitle from './HeaderTitle';
import SessionTimer from './SessionTimer';
import EcrStatus from './EcrStatus';
import CodeArtifactStatus from './CodeArtifactStatus';
import SettingsButton from './SettingsButton';
import ThemeToggle from './ThemeToggle';
import { CodeArtifactLoginResponse } from '../types/aws';

interface HeaderProps {
  sessionTimeLeft?: string | null;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void>;
  ecrStatus?: EcrLoginResponse | null;
  codeArtifactStatus?: CodeArtifactLoginResponse | null;
  appVersion?: string;
  sessionTimeStatus?: 'normal' | 'warning' | 'critical';
}

const Header = ({ 
  sessionTimeLeft,
  isAuthenticated = false,
  onLogout,
  ecrStatus,
  codeArtifactStatus,
  appVersion,
  sessionTimeStatus = 'normal'
}: HeaderProps) => {
  const sso = useSso();
  const isCheckingEcrRef = useRef(false);
  const isCheckingCodeArtifactRef = useRef(false);
  const lastCodeArtifactCheckTimeRef = useRef(0);
  const MIN_CHECK_INTERVAL = 30000; // Minimum 30 seconds between manual checks

  // Add debug logging
  useEffect(() => {
    console.log("Header component received appVersion:", appVersion);
  }, [appVersion]);

  // Start ECR status check timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkEcrStatus = async () => {
      // Prevent multiple concurrent status checks
      if (isCheckingEcrRef.current) return;
      
      try {
        isCheckingEcrRef.current = true;
        await sso.checkEcrStatus();
      } catch (error) {
        console.error("Error checking ECR status:", error);
      } finally {
        isCheckingEcrRef.current = false;
      }
    };

    // Check immediately
    checkEcrStatus();
    
    // Then set up interval
    const interval = setInterval(checkEcrStatus, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, sso]);

  // Start CodeArtifact status check timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkCodeArtifactStatus = async () => {
      // Prevent multiple concurrent status checks
      if (isCheckingCodeArtifactRef.current) return;
      
      // Check if enough time has passed since last check
      const now = Date.now();
      if (now - lastCodeArtifactCheckTimeRef.current < MIN_CHECK_INTERVAL) {
        return;
      }
      
      try {
        isCheckingCodeArtifactRef.current = true;
        lastCodeArtifactCheckTimeRef.current = now;
        await sso.checkCodeArtifactStatus();
      } catch (error) {
        console.error("Error checking CodeArtifact status:", error);
      } finally {
        isCheckingCodeArtifactRef.current = false;
      }
    };

    // Check immediately after component mounts
    checkCodeArtifactStatus();
    
    // Then set up interval - use a slightly offset time to avoid conflict with query's own refresh
    const interval = setInterval(checkCodeArtifactStatus, 65000); // 65 seconds to avoid sync with query's 60s
    return () => clearInterval(interval);
  }, [isAuthenticated, sso]);

  // Handle ECR login
  const handleEcrLogin = async () => {
    if (!isAuthenticated) return;
    
    try {
      const { ecrRepo, ecrRole } = sso.appSettings;
      
      if (!ecrRepo || !ecrRole) {
        alert("Please configure ECR Account ID and Role Name in settings first.");
        return;
      }

      // First, explicitly check if Docker is running
      try {
        if (window.awsSso && window.awsSso.checkDockerStatus) {
          const dockerStatus = await window.awsSso.checkDockerStatus();
          
          if (!dockerStatus.running) {
            alert(`Docker is not available: ${dockerStatus.message}\n\nPlease start Docker Desktop and try again.`);
            return;
          }
        }
      } catch (dockerError) {
        console.error("Error checking Docker status:", dockerError);
        // Continue anyway, the main ECR login function will handle this error too
      }

      // Check if we have a Docker-related error already in the status
      if (ecrStatus?.message) {
        if (ecrStatus.message.includes('Docker is not running')) {
          alert("Docker is not running. Please start Docker Desktop and try again.");
          return;
        } else if (ecrStatus.message.includes('connection refused')) {
          alert("Docker daemon connection refused. Please check if Docker is running properly and try again.");
          return;
        }
      }

      // Call ECR login and handle the response
      const result = await sso.loginToEcr(ecrRepo, ecrRole);
      
      if (!result.success) {
        // Handle the error based on the message
        const errorMsg = result.message || 'Unknown error';
        
        if (errorMsg.includes('Not authenticated')) {
          alert("You need to log in to AWS SSO first.");
        } else if (errorMsg.includes('Docker')) {
          alert(`Docker error: ${errorMsg}\nPlease ensure Docker is running and try again.`);
        } else {
          alert(`Failed to log in to ECR: ${errorMsg}`);
        }
      } else {
        // Show success if needed
        console.log("Successfully logged in to ECR");
      }
    } catch (error) {
      // This should only happen if there's an unexpected error
      console.error("Unexpected error logging into ECR:", error);
      alert(`Unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle CodeArtifact login
  const handleCodeArtifactLogin = async () => {
    if (!isAuthenticated) return;

    try {
      const { codeArtifactAccount, codeArtifactRole } = sso.appSettings;

      if (!codeArtifactAccount || !codeArtifactRole) {
        alert("Please configure CodeArtifact Account ID and Role Name in settings first.");
        return;
      }

      // Use the mutation from the context
      if (!sso.queries?.codeArtifactLogin) {
        console.error("CodeArtifact login mutation not available in context.");
        alert("CodeArtifact login function is not ready.");
        return;
      }

      const result = await sso.queries.codeArtifactLogin.mutateAsync({ 
          accountId: codeArtifactAccount, 
          roleName: codeArtifactRole 
      });

      if (!result.success) {
        alert(`Failed to log in to CodeArtifact: ${result.message || 'Unknown error'}`);
      } else {
        console.log("Successfully logged in to CodeArtifact");
      }
    } catch (error) {
      console.error("Unexpected error logging into CodeArtifact:", error);
      alert(`Unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-bg-secondary)',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <HeaderTitle title="AWS SSO Switcher" appVersion={appVersion} />
        
        {isAuthenticated && sessionTimeLeft && (
          <SessionTimer 
            sessionTimeLeft={sessionTimeLeft} 
            sessionTimeStatus={sessionTimeStatus}
          />
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {isAuthenticated && (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: '8px'
          }}>
            <EcrStatus 
              ecrStatus={ecrStatus} 
              onEcrLogin={handleEcrLogin} 
              isAuthenticated={isAuthenticated}
            />
            
            {codeArtifactStatus && (
               <CodeArtifactStatus 
                 codeArtifactStatus={codeArtifactStatus} 
                 onCodeArtifactLogin={handleCodeArtifactLogin}
               /> 
            )}
          </div>
        )}
        
        <ThemeToggle />
        <div style={{ width: '8px' }}></div>
        <SettingsButton onLogout={onLogout} isAuthenticated={isAuthenticated} />
      </div>
    </header>
  );
};

export default Header;

