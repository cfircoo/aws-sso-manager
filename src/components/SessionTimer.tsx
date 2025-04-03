import React from 'react';

interface SessionTimerProps {
  sessionTimeLeft?: string | null;
  sessionTimeStatus?: 'normal' | 'warning' | 'critical';
  onRenewSession?: () => void;
}

export const SessionTimer = ({ 
  sessionTimeLeft,
  sessionTimeStatus = 'normal',
  onRenewSession
}: SessionTimerProps) => {
  if (!sessionTimeLeft) return null;
  
  // Format time as hh:mm:ss
  const formatTime = (timeString: string) => {
    // Check if it's already a formatted string
    if (timeString.includes(':')) return timeString;
    
    // Assume it's milliseconds
    const milliseconds = parseInt(timeString, 10);
    if (isNaN(milliseconds)) return timeString;
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Color based on status
  let textColor = '#4b5563'; // default gray
  if (sessionTimeStatus === 'warning') {
    textColor = '#f59e0b'; // amber
  } else if (sessionTimeStatus === 'critical') {
    textColor = '#ef4444'; // red
  }
  
  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      marginLeft: '16px',
      gap: '8px'
    }}>
      <span style={{ 
        fontSize: '0.875rem',
        color: textColor,
        fontWeight: sessionTimeStatus !== 'normal' ? 'bold' : 'normal'
      }}>
        Session: {formatTime(sessionTimeLeft)}
      </span>
      {onRenewSession && (
        <button
          onClick={onRenewSession}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 6px',
            fontSize: '0.75rem',
            backgroundColor: sessionTimeStatus === 'critical' ? '#fee2e2' : sessionTimeStatus === 'warning' ? '#fef3c7' : '#f3f4f6',
            color: sessionTimeStatus === 'critical' ? '#b91c1c' : sessionTimeStatus === 'warning' ? '#92400e' : '#374151',
            border: `1px solid ${sessionTimeStatus === 'critical' ? '#fca5a5' : sessionTimeStatus === 'warning' ? '#fcd34d' : '#d1d5db'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: sessionTimeStatus !== 'normal' ? 'bold' : 'normal',
            height: '22px',
            lineHeight: 1
          }}
          title="Renew your AWS SSO session"
        >
          Renew
        </button>
      )}
    </div>
  );
};

export default SessionTimer; 