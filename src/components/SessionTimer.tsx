import React from 'react';

interface SessionTimerProps {
  sessionTimeLeft?: string | number | null;
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
      <div className="flex items-center space-x-2 px-4 py-2 rounded-full border backdrop-blur-sm bg-red-500/10 border-red-500/30 text-red-600">
        <div className="w-2 h-2 rounded-full animate-pulse bg-current"></div>
        <span className="text-sm font-medium font-bold">
          Session: Expired
        </span>
        {onRenewSession && (
          <button
            onClick={onRenewSession}
            className="btn-secondary text-xs px-2 py-1 ml-2 transition-all duration-200 hover:bg-red-500/20"
            title="Renew your AWS SSO session"
          >
            Login
          </button>
        )}
      </div>
    );
  }
  
  // Format time as hh:mm:ss
  const formatTime = (timeInput: string | number) => {
    // If it's already a formatted string, return it
    if (typeof timeInput === 'string' && timeInput.includes(':')) {
      return timeInput;
    }
    
    // Convert to number (milliseconds)
    let milliseconds: number;
    if (typeof timeInput === 'number') {
      milliseconds = timeInput;
    } else {
      milliseconds = parseInt(timeInput, 10);
      if (isNaN(milliseconds)) return timeInput;
    }
    
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
    <div className={`
      flex items-center space-x-2 px-4 py-2 rounded-full border backdrop-blur-sm
      transition-all duration-300 ${
        isExpired || sessionTimeStatus === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-600' :
        sessionTimeStatus === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' :
        'bg-green-500/10 border-green-500/30 text-green-600'
      }
    `}>
      <div className="w-2 h-2 rounded-full animate-pulse bg-current"></div>
      <span className="text-sm font-medium">
        Session: {formattedTime}
      </span>
      {onRenewSession && (
        <button
          onClick={onRenewSession}
          className={`
            btn-secondary text-xs px-2 py-1 ml-2 transition-all duration-200
            ${isExpired || sessionTimeStatus === 'critical' ? 'hover:bg-red-500/20' :
              sessionTimeStatus === 'warning' ? 'hover:bg-yellow-500/20' :
              'hover:bg-primary/10'
            }
          `}
          title="Renew your AWS SSO session"
        >
          {isExpired ? "Login" : "Renew"}
        </button>
      )}
    </div>
  );
};

export default SessionTimer; 