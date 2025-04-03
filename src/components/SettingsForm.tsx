import { useState, useEffect } from 'react';
import { useSso } from '../contexts/SsoContext';
import { AppSettings } from '../types/store';
import { LogOut } from 'lucide-react';

interface SettingsFormProps {
  onClose?: () => void;
  onLogout?: () => Promise<void>;
  isAuthenticated?: boolean;
}

export function SettingsForm({ onClose, onLogout, isAuthenticated = false }: SettingsFormProps) {
  const { appSettings, updateAppSettings } = useSso();
  const [formValues, setFormValues] = useState<AppSettings>({
    ssoUrl: '',
    ssoRegion: '',
    ecrRepo: '',
    ecrRole: '',
    codeArtifactAccount: '',
    codeArtifactRole: '',
    codeArtifactDomain: '',
    codeArtifactRepo: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    // Initialize form with current settings
    setFormValues(appSettings);
  }, [appSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage('');

    try {
      await updateAppSettings(formValues);
      setSavedMessage('Settings saved successfully!');
      setTimeout(() => {
        setSavedMessage('');
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      setSavedMessage('Error saving settings');
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      if (onClose) onClose(); // Close settings before logout
      await onLogout();
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    marginTop: '4px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '4px',
    color: '#374151'
  };

  const formGroupStyle = {
    marginBottom: '16px'
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: 'bold',
          color: '#111827', 
          marginBottom: '8px' 
        }}>
          Application Settings
        </h2>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#6b7280' 
        }}>
          Configure your AWS SSO and service settings
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="ssoUrl">AWS SSO Start URL</label>
          <input
            style={inputStyle}
            id="ssoUrl"
            name="ssoUrl"
            placeholder="https://d-xxxxxxxxxx.awsapps.com/start"
            value={formValues.ssoUrl}
            onChange={handleChange}
            required
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="ssoRegion">AWS SSO Region</label>
          <input
            style={inputStyle}
            id="ssoRegion"
            name="ssoRegion"
            placeholder="us-east-1"
            value={formValues.ssoRegion}
            onChange={handleChange}
            required
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="ecrRepo">ECR Account ID</label>
          <input
            style={inputStyle}
            id="ecrRepo"
            name="ecrRepo"
            placeholder="123456789012"
            value={formValues.ecrRepo}
            onChange={handleChange}
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="ecrRole">ECR Role Name</label>
          <input
            style={inputStyle}
            id="ecrRole"
            name="ecrRole"
            placeholder="DeveloperRole"
            value={formValues.ecrRole}
            onChange={handleChange}
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="codeArtifactAccount">CodeArtifact Account ID</label>
          <input
            style={inputStyle}
            id="codeArtifactAccount"
            name="codeArtifactAccount"
            placeholder="123456789012"
            value={formValues.codeArtifactAccount}
            onChange={handleChange}
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="codeArtifactRole">CodeArtifact Role Name</label>
          <input
            style={inputStyle}
            id="codeArtifactRole"
            name="codeArtifactRole"
            placeholder="DeveloperRole"
            value={formValues.codeArtifactRole}
            onChange={handleChange}
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="codeArtifactDomain">CodeArtifact Domain</label>
          <input
            style={inputStyle}
            id="codeArtifactDomain"
            name="codeArtifactDomain"
            placeholder="your-domain"
            value={formValues.codeArtifactDomain}
            onChange={handleChange}
          />
        </div>
        
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="codeArtifactRepo">CodeArtifact Repository</label>
          <input
            style={inputStyle}
            id="codeArtifactRepo"
            name="codeArtifactRepo"
            placeholder="your-repo"
            value={formValues.codeArtifactRepo}
            onChange={handleChange}
          />
        </div>
        
        <div style={{ 
          marginTop: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px'
        }}>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                padding: '8px',
                fontSize: '0.875rem',
                color: '#ef4444',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          )}
          
          {savedMessage && (
            <span style={{ color: '#22c55e', fontSize: '0.875rem' }}>{savedMessage}</span>
          )}
          
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginLeft: 'auto' 
          }}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 