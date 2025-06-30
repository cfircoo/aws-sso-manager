import React from 'react';
import { Toaster } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

const ModernToaster: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
          padding: '16px 20px',
          maxWidth: '400px',
          lineHeight: '1.5',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: isDarkMode 
            ? '1px solid rgba(75, 85, 99, 0.8)'
            : '1px solid rgba(229, 231, 235, 0.8)',
          backdropFilter: 'blur(12px)',
          background: isDarkMode 
            ? 'rgba(31, 41, 55, 0.95)'
            : 'rgba(255, 255, 255, 0.95)',
          color: isDarkMode ? '#F9FAFB' : '#1F2937',
        },
        className: 'modern-toast',
        duration: 4000,
      }}
      theme={isDarkMode ? 'dark' : 'light'}
    />
  );
};

export default ModernToaster; 