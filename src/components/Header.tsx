/// <reference path="../types/electron.d.ts" />
import { useState, useEffect } from 'react';
import { LogOut, Settings, Shield, Zap, Sparkles } from 'lucide-react';
import { EcrStatus } from './EcrStatus';
import CodeArtifactStatus from './CodeArtifactStatus';
import { HeaderTitle } from './HeaderTitle';
import ThemeToggle from './ThemeToggle';
import { EcrLoginResponse, CodeArtifactLoginResponse } from '../types/aws';
import { useSso } from '../contexts/SsoContext';
import SessionTimer from './SessionTimer';

interface HeaderProps {
  sessionTimeLeft?: string | null;
  isAuthenticated?: boolean;
  onLogout?: () => Promise<void>;
  onSettings?: () => void;
  ecrStatus?: EcrLoginResponse | null;
  codeArtifactStatus?: CodeArtifactLoginResponse | null;
  appVersion?: string;
  sessionTimeStatus?: 'normal' | 'warning' | 'critical';
}

const Header = ({ 
  sessionTimeLeft,
  isAuthenticated = false,
  onLogout,
  onSettings,
  ecrStatus,
  codeArtifactStatus,
  appVersion,
  sessionTimeStatus = 'normal'
}: HeaderProps) => {
  const sso = useSso();
  const [localEcrStatus, setLocalEcrStatus] = useState<EcrLoginResponse | null>(ecrStatus || null);
  const [localCodeArtifactStatus, setLocalCodeArtifactStatus] = useState<CodeArtifactLoginResponse | null>(codeArtifactStatus || null);
  const [isEcrLoading, setIsEcrLoading] = useState(false);
  const [isCodeArtifactLoading, setIsCodeArtifactLoading] = useState(false);

  // Update local states when props change
  useEffect(() => {
    setLocalEcrStatus(ecrStatus || null);
  }, [ecrStatus]);

  useEffect(() => {
    setLocalCodeArtifactStatus(codeArtifactStatus || null);
  }, [codeArtifactStatus]);

  // Auto-check Docker status on component mount
  useEffect(() => {
    const checkEcrStatus = async () => {
      if (!isAuthenticated || !window.awsSso) return;
      
      try {
        const dockerStatus = await window.awsSso.checkDockerStatus();
        
        // If Docker is running and we haven't checked ECR status recently, provide a default
        if (dockerStatus.running && !localEcrStatus) {
          setLocalEcrStatus({
            success: false,
            message: "Click to login to ECR",
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error checking Docker status:', error);
        setLocalEcrStatus({
          success: false,
          message: "Docker not available",
          timestamp: Date.now()
        });
      }
    };

    if (isAuthenticated) {
      checkEcrStatus();
    }
  }, [isAuthenticated, localEcrStatus]);

  // Auto-check CodeArtifact status 
  useEffect(() => {
    const checkCodeArtifactStatus = async () => {
      if (!isAuthenticated || !window.awsSso) return;
      
      try {
        // Provide default status if none exists
        if (!localCodeArtifactStatus) {
          setLocalCodeArtifactStatus({
            success: false,
            message: "Click to login to CodeArtifact",
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error checking CodeArtifact status:', error);
        setLocalCodeArtifactStatus({
          success: false,
          message: "CodeArtifact not available",
          timestamp: Date.now()
        });
      }
    };

    if (isAuthenticated) {
      checkCodeArtifactStatus();
    }
  }, [isAuthenticated, localCodeArtifactStatus]);

  const handleEcrLogin = async () => {
    if (!window.awsSso || isEcrLoading) return;

    try {
      setIsEcrLoading(true);
      
      // Get settings to determine which account/role to use for ECR
      const ecrAccount = await window.electronStore.get<string>('ecrAccount');
      const ecrRole = await window.electronStore.get<string>('ecrRole');
      
      if (!ecrAccount || !ecrRole) {
        setLocalEcrStatus({
          success: false,
          message: "ECR account/role not configured. Please set them in Settings.",
          timestamp: Date.now()
        });
        return;
      }

      console.log('Attempting ECR login with:', { ecrAccount, ecrRole });
      
      const result = await window.awsSso.loginToEcr(ecrAccount, ecrRole);
      
      console.log('ECR login result:', result);
      setLocalEcrStatus({
        ...result,
        timestamp: result.timestamp ?? Date.now()
      });
      
    } catch (error) {
      console.error('ECR login error:', error);
      setLocalEcrStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to login to ECR',
        timestamp: Date.now()
      });
    } finally {
      setIsEcrLoading(false);
    }
  };

  const handleCodeArtifactLogin = async () => {
    if (!window.awsSso || isCodeArtifactLoading) return;

    try {
      setIsCodeArtifactLoading(true);
      
      // Get settings to determine which account/role to use for CodeArtifact
      const codeArtifactAccount = await window.electronStore.get<string>('codeArtifactAccount');
      const codeArtifactRole = await window.electronStore.get<string>('codeArtifactRole');
      
      if (!codeArtifactAccount || !codeArtifactRole) {
        setLocalCodeArtifactStatus({
          success: false,
          message: "CodeArtifact account/role not configured. Please set them in Settings.",
          timestamp: Date.now()
        });
        return;
      }

      console.log('Attempting CodeArtifact login with:', { codeArtifactAccount, codeArtifactRole });
      
      const result = await window.awsSso.loginToCodeArtifact(codeArtifactAccount, codeArtifactRole);
      
      console.log('CodeArtifact login result:', result);
      setLocalCodeArtifactStatus({
        ...result,
        timestamp: result.timestamp ?? Date.now()
      });
      
    } catch (error) {
      console.error('CodeArtifact login error:', error);
      setLocalCodeArtifactStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to login to CodeArtifact',
        timestamp: Date.now()
      });
    } finally {
      setIsCodeArtifactLoading(false);
    }
  };

  const getSessionTimeStatusIcon = () => {
    switch (sessionTimeStatus) {
      case 'critical': return <Zap className="w-4 h-4 session-icon-critical animate-pulse" />;
      case 'warning': return <Shield className="w-4 h-4 session-icon-warning" />;
      default: return <Shield className="w-4 h-4 session-icon-normal" />;
    }
  };

  const getSessionTimeStatusClass = () => {
    switch (sessionTimeStatus) {
      case 'critical': return 'session-badge-critical';
      case 'warning': return 'session-badge-warning';
      default: return 'session-badge-normal';
    }
  };

  return (
          <header className="glass-card animate-slide-in sticky top-0 z-40 mb-6">
      <div className="flex items-center justify-between p-4">
        {/* Left Section - Logo & Title */}
        <div className="flex items-center space-x-4">
          
          <HeaderTitle 
            title="AWS SSO Manager" 
            appVersion={appVersion}
            beta={false}
          />
        </div>

        {/* Center Section - Session Status */}
        {isAuthenticated && sessionTimeLeft && (
          <div className={`
            flex items-center space-x-2 px-4 py-2 rounded-full border backdrop-blur-sm
            transition-all duration-300 ${getSessionTimeStatusClass()}
          `}>
            {getSessionTimeStatusIcon()}
            <span className="text-sm font-medium">
              Session: {sessionTimeLeft}
            </span>
          </div>
        )}

        {/* Right Section - Status & Actions */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && (
            <>
              {/* ECR Status */}
              <div className="relative group">
                <EcrStatus 
                  ecrStatus={localEcrStatus}
                  onEcrLogin={handleEcrLogin}
                  isAuthenticated={isAuthenticated}
                />
                {isEcrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* CodeArtifact Status */}
              <div className="relative group">
                <CodeArtifactStatus 
                  codeArtifactStatus={localCodeArtifactStatus}
                  onCodeArtifactLogin={handleCodeArtifactLogin}
                />
                {isCodeArtifactLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg backdrop-blur-sm">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            </>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Settings Button */}
          <button
            onClick={onSettings}
            className="btn-secondary p-2 hover:scale-105 transition-transform duration-200"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          {isAuthenticated && onLogout && (
            <button
              onClick={onLogout}
              className="btn-secondary p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Glow Effect */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
    </header>
  );
};

export default Header;

