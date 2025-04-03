import React, { useState, useRef, useEffect } from 'react';
import { Cog, X } from 'lucide-react';
import { SettingsForm } from './SettingsForm';

interface SettingsButtonProps {
  onLogout?: () => Promise<void>;
  isAuthenticated?: boolean;
}

export const SettingsButton = ({ onLogout, isAuthenticated = false }: SettingsButtonProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div style={{ position: 'relative', marginLeft: '8px' }} ref={settingsRef}>
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 12px',
          fontSize: '0.875rem',
          backgroundColor: '#dbeafe',
          color: '#2563eb',
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer'
        }}
        title="Settings"
      >
        <Cog size={16} style={{ marginRight: '4px' }} />
        Settings
      </button>

      {showSettings && (
        <div 
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            width: '400px',
            backgroundColor: 'white',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            borderRadius: '8px',
            zIndex: 50,
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              margin: 0,
              color: '#111827'
            }}>
              Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                backgroundColor: '#f3f4f6',
                border: 'none',
                padding: '6px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4b5563',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            <SettingsForm onClose={() => setShowSettings(false)} onLogout={onLogout} isAuthenticated={isAuthenticated} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton; 