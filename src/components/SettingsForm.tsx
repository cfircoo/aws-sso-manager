import { useState, useEffect } from 'react';
import { useSso } from '../contexts/SsoContext';
import { AppSettings } from '../types/store';
import { LogOut, Trash, FileText, FolderOpen, Settings, Save, Zap, Shield, Box, Database } from 'lucide-react';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';
import { useElectron } from '../contexts/ElectronContext';
import { showToast } from './toast';

interface SettingsFormProps {
  onClose?: () => void;
  onLogout?: () => Promise<void>;
  isAuthenticated?: boolean;
}

export function SettingsForm({ onClose, onLogout, isAuthenticated = false }: SettingsFormProps) {
  const { appSettings, updateAppSettings } = useSso();
  const { quickAccessRoles } = useQuickAccessRoles();
  const electron = useElectron();
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

    try {
      await updateAppSettings(formValues);
      showToast.success('Settings saved!', 'Your configuration has been updated successfully.');
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      showToast.error('Failed to save settings', 'Please try again.');
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

  const handleClearQuickAccessRoles = async () => {
    if (window.confirm('Are you sure you want to clear all quick access roles?')) {
      try {
        await electron.clearQuickAccessRoles();
        showToast.success('Quick access cleared', 'All quick access roles have been removed.');
      } catch (error) {
        console.error('Error clearing quick access roles:', error);
        showToast.error('Failed to clear roles', 'Please try again.');
      }
    }
  };

  const handleOpenSettingsFile = async () => {
    try {
      await window.electronApp.openSettingsFile();
    } catch (error) {
      console.error('Error opening settings file:', error);
      showToast.error('Failed to open settings file', 'Unable to access the settings file.');
    }
  };

  const handleOpenLogsFile = async () => {
    try {
      await window.electronApp.openLogsFile();
    } catch (error) {
      console.error('Error opening logs file:', error);
      showToast.error('Failed to open logs', 'Unable to access the logs directory.');
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      {/* Modern Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Settings</h1>
            <p className="text-tertiary">Configure your AWS SSO and service settings</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenSettingsFile}
            className="btn-secondary hover:scale-105 transition-all duration-200"
            title="Open Settings File"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Settings File</span>
          </button>
          <button
            onClick={handleOpenLogsFile}
            className="btn-secondary hover:scale-105 transition-all duration-200"
            title="Open Logs Directory"
          >
            <FolderOpen size={16} />
            <span className="hidden sm:inline">Logs</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* AWS SSO Configuration Section */}
        <div className="glass-card p-6 animate-slide-in">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary">AWS SSO Configuration</h2>
              <p className="text-sm text-tertiary">Core AWS Single Sign-On settings</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">AWS SSO Start URL</label>
              <input
                className="input-modern"
                name="ssoUrl"
                placeholder="https://d-xxxxxxxxxx.awsapps.com/start"
                value={formValues.ssoUrl}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-tertiary">Your organization's AWS SSO portal URL</p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">AWS Region</label>
              <input
                className="input-modern"
                name="ssoRegion"
                placeholder="us-east-1"
                value={formValues.ssoRegion}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-tertiary">Primary AWS region for SSO operations</p>
            </div>
          </div>
        </div>

        {/* ECR Configuration Section */}
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary">ECR Configuration</h2>
              <p className="text-sm text-tertiary">Elastic Container Registry settings</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">ECR Account ID</label>
              <input
                className="input-modern"
                name="ecrRepo"
                placeholder="123456789012"
                value={formValues.ecrRepo}
                onChange={handleChange}
              />
              <p className="text-xs text-tertiary">AWS account ID for ECR registry</p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">ECR Role Name</label>
              <input
                className="input-modern"
                name="ecrRole"
                placeholder="DeveloperRole"
                value={formValues.ecrRole}
                onChange={handleChange}
              />
              <p className="text-xs text-tertiary">IAM role for ECR access</p>
            </div>
          </div>
        </div>

        {/* CodeArtifact Configuration Section */}
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary">CodeArtifact Configuration</h2>
              <p className="text-sm text-tertiary">Package repository settings</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">Account ID</label>
              <input
                className="input-modern"
                name="codeArtifactAccount"
                placeholder="123456789012"
                value={formValues.codeArtifactAccount}
                onChange={handleChange}
              />
              <p className="text-xs text-tertiary">AWS account ID for CodeArtifact</p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">Role Name</label>
              <input
                className="input-modern"
                name="codeArtifactRole"
                placeholder="DeveloperRole"
                value={formValues.codeArtifactRole}
                onChange={handleChange}
              />
              <p className="text-xs text-tertiary">IAM role for CodeArtifact access</p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">Domain</label>
              <input
                className="input-modern"
                name="codeArtifactDomain"
                placeholder="your-domain"
                value={formValues.codeArtifactDomain}
                onChange={handleChange}
              />
              <p className="text-xs text-tertiary">CodeArtifact domain name</p>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-secondary">Repository</label>
              <input
                className="input-modern"
                name="codeArtifactRepo"
                placeholder="your-repo"
                value={formValues.codeArtifactRepo}
                onChange={handleChange}
              />
              <p className="text-xs text-tertiary">CodeArtifact repository name</p>
            </div>
          </div>
        </div>

        {/* Quick Access Management Section */}
        <div className="glass-card p-6 animate-slide-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary">Quick Access Management</h2>
              <p className="text-sm text-tertiary">Manage your saved quick access roles</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-bg-surface rounded-xl border border-glass-border">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="font-semibold text-primary">Quick Access Roles</div>
                <div className="text-sm text-tertiary">
                  {quickAccessRoles.length} role{quickAccessRoles.length !== 1 ? 's' : ''} saved for quick access
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleClearQuickAccessRoles}
              disabled={quickAccessRoles.length === 0}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                ${quickAccessRoles.length === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200 hover:scale-105'
                }
              `}
            >
              <Trash size={16} />
              <span>Clear All</span>
            </button>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-glass-border">
          <div className="flex items-center space-x-4">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Logout from AWS SSO"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary hover:scale-105 transition-all duration-200"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className={`
                btn-primary flex items-center space-x-2 hover:scale-105 transition-all duration-200
                ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 