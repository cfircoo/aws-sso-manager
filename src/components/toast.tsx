import React from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

// Professional toast helper functions with custom icons
export const showToast = {
  success: (title: string, description?: string) => {
    toast.success(title, {
      description,
      icon: (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#10B981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px'
        }}>
          <CheckCircle style={{ width: '12px', height: '12px', color: 'white' }} />
        </div>
      ),
    });
  },

  error: (title: string, description?: string) => {
    toast.error(title, {
      description,
      duration: 5000,
      icon: (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#EF4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px'
        }}>
          <XCircle style={{ width: '12px', height: '12px', color: 'white' }} />
        </div>
      ),
    });
  },

  info: (title: string, description?: string) => {
    toast.info ? toast.info(title, {
      description,
      icon: (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#3B82F6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px'
        }}>
          <Info style={{ width: '12px', height: '12px', color: 'white' }} />
        </div>
      ),
    }) : toast(title, {
      description,
      icon: (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#3B82F6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px'
        }}>
          <Info style={{ width: '12px', height: '12px', color: 'white' }} />
        </div>
      ),
    });
  },

  warning: (title: string, description?: string) => {
    toast.warning ? toast.warning(title, {
      description,
      icon: (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#F59E0B',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px'
        }}>
          <AlertTriangle style={{ width: '12px', height: '12px', color: 'white' }} />
        </div>
      ),
    }) : toast(title, {
      description,
      icon: (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#F59E0B',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px'
        }}>
          <AlertTriangle style={{ width: '12px', height: '12px', color: 'white' }} />
        </div>
      ),
    });
  },

  // Custom toast with emoji and custom styling
  custom: (title: string, description?: string, emoji?: string) => {
    toast(title, {
      description,
      icon: emoji ? (
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginRight: '8px',
          fontSize: '12px'
        }}>
          {emoji}
        </div>
      ) : undefined,
    });
  },
};

// Backward compatibility - export individual functions
export const { success: toastSuccess, error: toastError, info: toastInfo, warning: toastWarning, custom: toastCustom } = showToast; 