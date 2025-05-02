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
  // Show an "Expired" message instead of returning null
  if (!sessionTimeLeft) {
    return (
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        marginLeft: '16px',
        gap: '8px'
      }}>
        <span style={{ 
          fontSize: '0.875rem',
          color: 'var(--color-error)', 
          fontWeight: 'bold'
        }}>
          Session: Expired
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
              backgroundColor: 'rgba(239, 68, 68, 0.1)', // Translucent red
              color: 'var(--color-error)',
              border: '1px solid var(--color-error)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 'bold',
              height: '22px',
              lineHeight: 1
            }}
            title="Renew your AWS SSO session"
          >
            Login
          </button>
        )}
      </div>
    );
  }
  
  // Format time as hh:mm:ss
  const formatTime = (timeString: string) => {
    // Check if it's already a formatted string
    if (timeString.includes(':')) return timeString;
    
    // Assume it's milliseconds
    const milliseconds = parseInt(timeString, 10);
    if (isNaN(milliseconds)) return timeString;
    
    // Check for expired session (zero or negative milliseconds)
    if (milliseconds <= 0) return "Expired";
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Color based on status
  let statusColor = 'var(--color-text-secondary)'; // default
  if (sessionTimeStatus === 'warning') {
    statusColor = 'var(--color-warning)'; 
  } else if (sessionTimeStatus === 'critical') {
    statusColor = 'var(--color-error)'; 
  }
  
  // Get formatted time and check if it's "Expired"
  const formattedTime = formatTime(sessionTimeLeft);
  const isExpired = formattedTime === "Expired";
  
  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      marginLeft: '16px',
      gap: '8px'
    }}>
      <span style={{ 
        fontSize: '0.875rem',
        color: isExpired ? 'var(--color-error)' : statusColor,
        fontWeight: isExpired || sessionTimeStatus !== 'normal' ? 'bold' : 'normal'
      }}>
        Session: {formattedTime}
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
            backgroundColor: isExpired || sessionTimeStatus === 'critical' 
              ? 'rgba(239, 68, 68, 0.1)' // Translucent red
              : sessionTimeStatus === 'warning' 
                ? 'rgba(251, 191, 36, 0.1)' // Translucent amber
                : 'var(--color-bg-secondary)',
            color: isExpired || sessionTimeStatus === 'critical' 
              ? 'var(--color-error)' 
              : sessionTimeStatus === 'warning' 
                ? 'var(--color-warning)' 
                : 'var(--color-text-primary)',
            border: `1px solid ${
              isExpired || sessionTimeStatus === 'critical' 
                ? 'var(--color-error)' 
                : sessionTimeStatus === 'warning' 
                  ? 'var(--color-warning)' 
                  : 'var(--color-border)'
            }`,
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: isExpired || sessionTimeStatus !== 'normal' ? 'bold' : 'normal',
            height: '22px',
            lineHeight: 1
          }}
          title="Renew your AWS SSO session"
        >
          {isExpired ? "Login" : "Renew"}
        </button>
      )}
    </div>
  );
};

export default SessionTimer; 