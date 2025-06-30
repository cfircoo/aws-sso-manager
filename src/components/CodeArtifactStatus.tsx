import React, { useRef } from 'react';
import { Archive, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { CodeArtifactLoginResponse } from '../types/aws';

interface CodeArtifactStatusProps {
  codeArtifactStatus?: CodeArtifactLoginResponse | null;
  onCodeArtifactLogin: () => Promise<void>;
}

const CodeArtifactStatus = ({ codeArtifactStatus, onCodeArtifactLogin }: CodeArtifactStatusProps) => {
  const prevStatusRef = useRef<CodeArtifactLoginResponse | null | undefined>(null);
  
  if (!codeArtifactStatus) return null;
  
  const getCodeArtifactTooltip = (status: CodeArtifactLoginResponse | undefined | null) => {
    if (!status) return "Click to log in to CodeArtifact";
    if (status.success) return `Successfully logged in to CodeArtifact (${status.message || ''})`;
    return status.message || "Click to log in to CodeArtifact";
  };

  const getStatusIcon = () => {
    if (!codeArtifactStatus) return <Clock className="w-3 h-3" />;
    if (codeArtifactStatus.success) return <CheckCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const getStatusClass = () => {
    if (!codeArtifactStatus) return 'badge status-badge-loading';
    if (codeArtifactStatus.success) return 'badge status-badge-success';
    return 'badge status-badge-error';
  };
  
  // Only log when status changes meaningfully
  if (!prevStatusRef.current || 
      prevStatusRef.current.success !== codeArtifactStatus.success ||
      prevStatusRef.current.message !== codeArtifactStatus.message) {
    console.log("[CodeArtifactStatus] Status updated:", { codeArtifactStatus });
  }
  
  // Update ref for next render comparison
  prevStatusRef.current = codeArtifactStatus;
  
  return (
    <button 
      onClick={onCodeArtifactLogin}
      className={`
        ${getStatusClass()}
        transition-all duration-200 backdrop-blur-sm hover:scale-105 
        flex items-center space-x-1.5 cursor-pointer group
      `}
      title={getCodeArtifactTooltip(codeArtifactStatus)}
    >
      <Archive className="w-3 h-3" />
      {getStatusIcon()}
      <span className="font-medium text-xs">Artifact</span>
    </button>
  );
};

// Custom comparison function to prevent unnecessary re-renders
const areEqual = (prevProps: CodeArtifactStatusProps, nextProps: CodeArtifactStatusProps) => {
  // If both are null or undefined, consider them equal
  if (!prevProps.codeArtifactStatus && !nextProps.codeArtifactStatus) {
    return true;
  }
  
  // If only one is null/undefined, they're different
  if (!prevProps.codeArtifactStatus || !nextProps.codeArtifactStatus) {
    return false;
  }
  
  // Compare the important properties
  return (
    prevProps.codeArtifactStatus.success === nextProps.codeArtifactStatus.success &&
    prevProps.codeArtifactStatus.message === nextProps.codeArtifactStatus.message
  );
};

export default React.memo(CodeArtifactStatus, areEqual); 