import React from 'react';
import { Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { EcrLoginResponse } from '../types/aws';

interface EcrStatusProps {
  ecrStatus?: EcrLoginResponse | null;
  onEcrLogin: () => Promise<void>;
  isAuthenticated?: boolean;
}

export const EcrStatus = ({ ecrStatus, onEcrLogin, isAuthenticated = false }: EcrStatusProps) => {
  // Don't render anything if not authenticated
  if (!isAuthenticated) return null;
  
  const getEcrTooltip = (status: EcrLoginResponse | undefined | null) => {
    if (!status) return "ECR login status checking...";
    if (status.success) return "Successfully logged in to ECR";
    if (status.message) {
      if (status.message.includes('Docker is not running')) {
        return "Docker is not running. Please start Docker Desktop and try again.";
      } else if (status.message.includes('connection refused')) {
        return "Docker daemon connection refused. Please check if Docker is running properly and try again.";
      }
    }
    return "Click to log in to ECR";
  };

  const getStatusIcon = () => {
    if (!ecrStatus) return <Clock className="w-3 h-3" />;
    if (ecrStatus.success) return <CheckCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const getStatusClass = () => {
    if (!ecrStatus) return 'badge status-badge-loading';
    if (ecrStatus.success) return 'badge status-badge-success';
    return 'badge status-badge-error';
  };
  
  return (
    <button 
      onClick={onEcrLogin}
      className={`
        ${getStatusClass()}
        transition-all duration-200 backdrop-blur-sm hover:scale-105 
        flex items-center space-x-1.5 cursor-pointer group
      `}
      title={getEcrTooltip(ecrStatus)}
    >
      <Package className="w-3 h-3" />
      {getStatusIcon()}
      <span className="font-medium">ECR</span>
    </button>
  );
};

export default React.memo(EcrStatus); 