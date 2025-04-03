import React, { useRef } from 'react';
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
    if (status.success) return `Logged in to CodeArtifact (${status.message || ''})`;
    return status.message || "Click to log in to CodeArtifact";
  };
  
  // Only log when status changes meaningfully
  if (!prevStatusRef.current || 
      prevStatusRef.current.success !== codeArtifactStatus.success ||
      prevStatusRef.current.message !== codeArtifactStatus.message) {
    console.log("[CodeArtifactStatus] Received props:", { codeArtifactStatus });
  }
  
  // Update ref for next render comparison
  prevStatusRef.current = codeArtifactStatus;
  
  return (
    <button 
      onClick={onCodeArtifactLogin}
      style={{ 
        backgroundColor: codeArtifactStatus.success ? '#e8f5e9' : '#ffebee',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        color: codeArtifactStatus.success ? '#2e7d32' : '#c62828',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      title={getCodeArtifactTooltip(codeArtifactStatus)}
    >
      CodeArtifact
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