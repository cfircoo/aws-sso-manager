import React from 'react';
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
    if (status.success) return "Logged in to ECR";
    if (status.message) {
      if (status.message.includes('Docker is not running')) {
        return "Docker is not running. Please start Docker Desktop and try again.";
      } else if (status.message.includes('connection refused')) {
        return "Docker daemon connection refused. Please check if Docker is running properly and try again.";
      }
    }
    return "Click to log in to ECR";
  };
  
  // Determine if the check passed (success is true)
  const checkPassed = ecrStatus?.success === true;
  
  return (
    <button 
      onClick={onEcrLogin}
      style={{ 
        backgroundColor: checkPassed ? '#e8f5e9' : '#ffebee',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        color: checkPassed ? '#2e7d32' : '#c62828',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      title={getEcrTooltip(ecrStatus)}
    >
      ECR
    </button>
  );
};

export default React.memo(EcrStatus); 