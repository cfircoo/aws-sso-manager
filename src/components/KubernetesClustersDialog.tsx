import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Settings, Terminal, RefreshCw, ExternalLink, ArrowLeft, Globe, MapPin, X, Zap, Star, Copy, Check, Box, Clock, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';
import { useRecentlyUsedRegions } from '../hooks/useRecentlyUsedRegions';
import { useElectron } from '../contexts/ElectronContext';

interface EksCluster {
  name: string;
  status: string;
  version: string;
  endpoint: string | null;
  arn: string | null;
  region: string;
}

interface KubectlStatus {
  available: boolean;
  version?: string;
  currentContext?: string;
  clusterInfo?: string;
  message: string;
}

interface KubernetesClustersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  roleName: string;
  accessToken: string;
}

// AWS regions that support EKS with enhanced info
const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)', flag: '🇺🇸', popular: true },
  { value: 'us-east-2', label: 'US East (Ohio)', flag: '🇺🇸', popular: true },
  { value: 'us-west-1', label: 'US West (N. California)', flag: '🇺🇸', popular: false },
  { value: 'us-west-2', label: 'US West (Oregon)', flag: '🇺🇸', popular: true },
  { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong)', flag: '🇭🇰', popular: false },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)', flag: '🇮🇳', popular: true },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)', flag: '🇯🇵', popular: true },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)', flag: '🇰🇷', popular: true },
  { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka)', flag: '🇯🇵', popular: false },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', flag: '🇸🇬', popular: true },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)', flag: '🇦🇺', popular: true },
  { value: 'ca-central-1', label: 'Canada (Central)', flag: '🇨🇦', popular: false },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)', flag: '🇩🇪', popular: true },
  { value: 'eu-west-1', label: 'Europe (Ireland)', flag: '🇮🇪', popular: true },
  { value: 'eu-west-2', label: 'Europe (London)', flag: '🇬🇧', popular: true },
  { value: 'eu-west-3', label: 'Europe (Paris)', flag: '🇫🇷', popular: false },
  { value: 'eu-north-1', label: 'Europe (Stockholm)', flag: '🇸🇪', popular: false },
  { value: 'eu-south-1', label: 'Europe (Milan)', flag: '🇮🇹', popular: false },
  { value: 'me-south-1', label: 'Middle East (Bahrain)', flag: '🇧🇭', popular: false },
  { value: 'sa-east-1', label: 'South America (São Paulo)', flag: '🇧🇷', popular: false },
];

const KubernetesClustersDialog: React.FC<KubernetesClustersDialogProps> = React.memo(({
  isOpen,
  onClose,
  accountId,
  accountName,
  roleName,
  accessToken
}) => {
  const [clusters, setClusters] = useState<EksCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [kubectlStatus, setKubectlStatus] = useState<KubectlStatus | null>(null);
  const [settingContext, setSettingContext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showRegionSelection, setShowRegionSelection] = useState(true);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  
  // Recently used regions hook
  const { 
    recentRegions, 
    trackRegionUsage, 
    removeRecentRegion, 
    getTimeAgo, 
    hasRecentRegions 
  } = useRecentlyUsedRegions();
  
  // Electron context for settings management
  const electron = useElectron();

  const showBeautifulToast = (type: 'success' | 'error', title: string, description?: string, clusterId?: string) => {
    if (type === 'success') {
      toast.success(title, {
        description,
        duration: 4000,
        style: {
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderLeft: '4px solid #10B981',
          color: '#1F2937',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          fontSize: '14px',
          fontWeight: '500',
          padding: '16px 20px',
          maxWidth: '400px',
          lineHeight: '1.5',
        },
        className: 'k8s-toast-success',
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
    } else {
      toast.error(title, {
        description,
        duration: 5000,
        style: {
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderLeft: '4px solid #EF4444',
          color: '#1F2937',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          fontSize: '14px',
          fontWeight: '500',
          padding: '16px 20px',
          maxWidth: '400px',
          lineHeight: '1.5',
        },
        className: 'k8s-toast-error',
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
    }
  };

  const checkKubectlStatus = async () => {
    try {
      const status = await window.awsSso.checkKubectlStatus();
      setKubectlStatus(status);
    } catch (error) {
      console.error('Error checking kubectl status:', error);
      setKubectlStatus({
        available: false,
        message: 'Failed to check kubectl status'
      });
    }
  };

  const loadClusters = async (region: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.awsSso.listEksClusters(accessToken, accountId, roleName, region);
      if (result.success) {
        setClusters(result.clusters);
        if (result.clusters.length === 0) {
          setError(`No EKS clusters found in ${region} for this account and role.`);
        }
      } else {
        setError(result.message || 'Failed to load EKS clusters');
        setClusters([]);
      }
    } catch (error) {
      console.error('Error loading EKS clusters:', error);
      setError('Failed to load EKS clusters. Please check your permissions.');
      setClusters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const setKubectlContext = async (clusterName: string, region: string) => {
    setSettingContext(clusterName);
    try {
      const result = await window.awsSso.setKubectlContext(accessToken, accountId, roleName, clusterName, region);
      if (result.success) {
        // Track this region usage for the recently used feature
        trackRegionUsage(region, clusterName, accountId);
        
        // Update kubectl context in settings
        if (result.context && electron?.updateKubectlContextInSettings) {
          await electron.updateKubectlContextInSettings(result.context);
        }
        
        showBeautifulToast(
          'success',
          '🎉 kubectl context set successfully!',
          `You're now connected to ${clusterName} in ${region}. Ready to deploy amazing things!`,
          clusterName
        );
        await checkKubectlStatus();
      } else {
        // Backend returned success: false, use the specific error message
        const errorMessage = result.message || 'Something went wrong while setting up the connection.';
        console.error('kubectl context failed:', errorMessage);
        showBeautifulToast(
          'error',
          '❌ Failed to set kubectl context',
          errorMessage
        );
      }
    } catch (error) {
      // Network or other errors that prevented the call from completing
      console.error('Error calling setKubectlContext:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to establish kubectl context.';
      showBeautifulToast('error', `❌ Connection failed`, errorMessage);
    } finally {
      setSettingContext(null);
    }
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    setShowRegionSelection(false);
    loadClusters(region);
  };

  const handleBackToRegions = () => {
    setSelectedRegion(null);
    setShowRegionSelection(true);
    setClusters([]);
    setError(null);
  };

  const copyEndpoint = async (endpoint: string) => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopiedEndpoint(endpoint);
      showBeautifulToast('success', '📋 Endpoint copied!', 'Cluster endpoint copied to clipboard.');
      setTimeout(() => setCopiedEndpoint(null), 2000);
    } catch (error) {
      showBeautifulToast('error', '❌ Copy failed', 'Could not copy endpoint to clipboard.');
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-300";
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/25`}>
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            Active
          </span>
        );
      case 'creating':
      case 'updating':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/25`}>
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            {status}
          </span>
        );
      case 'deleting':
      case 'failed':
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-lg shadow-red-500/25`}>
            <XCircle className="w-3 h-3 mr-2" />
            {status}
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-500/25`}>
            {status}
          </span>
        );
    }
  };

  const isCurrentContext = (clusterName: string) => {
    return kubectlStatus?.currentContext?.includes(clusterName);
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedRegion(null);
      setShowRegionSelection(true);
      setClusters([]);
      setError(null);
      checkKubectlStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Responsive breakpoints
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? '12px' : '20px',
    animation: 'fadeIn 0.2s ease-out'
  };

  const modalStyle: React.CSSProperties = {
    borderRadius: isMobile ? '20px' : '24px',
    width: '100%',
    maxWidth: isMobile ? '100%' : isTablet ? '90%' : '1200px',
    maxHeight: isMobile ? '95vh' : '90vh',
    overflow: 'hidden',
    position: 'relative',
    animation: 'slideIn 0.2s ease-out',
    margin: 'auto'
  };

  const headerStyle: React.CSSProperties = {
    background: '#F97316',
    color: 'white',
    padding: isMobile ? '20px 16px' : isTablet ? '24px 20px' : '32px',
    position: 'relative',
    overflow: 'hidden'
  };

  const contentStyle: React.CSSProperties = {
    padding: isMobile ? '16px' : isTablet ? '20px' : '32px',
    maxHeight: isMobile ? 'calc(95vh - 160px)' : 'calc(90vh - 200px)',
    overflowY: 'auto',
    overflowX: 'hidden'
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .k8s-toast-success {
          border-left: 4px solid #10B981 !important;
        }
        .k8s-toast-success [data-description] {
          color: #6B7280 !important;
          font-size: 13px !important;
          font-weight: 400 !important;
          margin-top: 4px !important;
          line-height: 1.4 !important;
        }
        .k8s-toast-error {
          border-left: 4px solid #EF4444 !important;
        }
        .k8s-toast-error [data-description] {
          color: #6B7280 !important;
          font-size: 13px !important;
          font-weight: 400 !important;
          margin-top: 4px !important;
          line-height: 1.4 !important;
        }
        .k8s-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #F7FAFC;
        }
        .k8s-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .k8s-scrollbar::-webkit-scrollbar-track {
          background: #F7FAFC;
          border-radius: 8px;
        }
        .k8s-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 8px;
        }
        .k8s-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
        @media (max-width: 767px) {
          .k8s-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .k8s-cluster-info {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }
          .k8s-header-text {
            font-size: 20px !important;
          }
          .k8s-region-text {
            font-size: 18px !important;
          }
        }
        @media (max-width: 480px) {
          .k8s-header-content {
            flex-direction: column !important;
            gap: 16px !important;
            text-align: center !important;
          }
          .k8s-cluster-content {
            flex-direction: column !important;
            gap: 16px !important;
          }
          .k8s-button-group {
            width: 100% !important;
            margin-left: 0 !important;
          }
        }
      `}</style>
      
      <div style={modalOverlayStyle} onClick={onClose}>
        <div 
          className="modal-glass-enhanced modal-content-enhanced" 
          style={modalStyle} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div 
                className="k8s-header-content"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', flex: 1 }}>
                  <div style={{ 
                    padding: isMobile ? '10px' : '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: isMobile ? '12px' : '16px',
                    backdropFilter: 'blur(10px)',
                    flexShrink: 0
                  }}>
                    <Box style={{ width: isMobile ? '24px' : '32px', height: isMobile ? '24px' : '32px' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h1 
                      className="k8s-header-text"
                      style={{ 
                        fontSize: isMobile ? '22px' : '28px', 
                        fontWeight: 'bold', 
                        margin: '0 0 8px 0',
                        lineHeight: '1.2'
                      }}
                    >
                      Kubernetes Control Center
                    </h1>
                    <div style={{ 
                      opacity: 0.9, 
                      margin: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                      fontSize: isMobile ? '13px' : '14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Zap style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                        <span>Managing clusters in</span>
                      </div>
                      <strong style={{ 
                        maxWidth: isMobile ? '120px' : '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {accountName || accountId}
                      </strong>
                      <span style={{ 
                        padding: '3px 6px',
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        maxWidth: isMobile ? '80px' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {roleName}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: isMobile ? '10px' : '12px',
                    padding: isMobile ? '6px' : '8px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <X style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="k8s-scrollbar" style={contentStyle}>
            {/* kubectl Status */}
            <div style={{ 
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              border: '2px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal style={{ width: '20px', height: '20px', color: '#F97316' }} />
                  kubectl Status
                </h3>
                <button
                  onClick={checkKubectlStatus}
                  disabled={isLoading}
                  style={{
                    padding: '8px',
                    background: 'white',
                    border: '2px solid #D1D5DB',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  <RefreshCw style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
              
              {kubectlStatus ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {kubectlStatus.available ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        padding: '8px',
                        background: 'var(--color-success)',
                        borderRadius: '12px',
                        color: 'white'
                      }}>
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                      </div>
                      <span style={{ fontWeight: '600', color: '#059669' }}>{kubectlStatus.message}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        padding: '8px',
                        background: 'var(--color-error)',
                        borderRadius: '12px',
                        color: 'white'
                      }}>
                        <XCircle style={{ width: '16px', height: '16px' }} />
                      </div>
                      <span style={{ fontWeight: '600', color: '#DC2626' }}>{kubectlStatus.message}</span>
                    </div>
                  )}
                  
                  {kubectlStatus.available && (
                    <div style={{ 
                      padding: '12px 16px',
                      background: 'white',
                      borderRadius: '12px',
                      border: '2px solid #E5E7EB',
                      fontSize: '14px',
                      color: '#6B7280'
                    }}>
                      {kubectlStatus.version && <div><strong>Version:</strong> {kubectlStatus.version}</div>}
                      {kubectlStatus.currentContext && kubectlStatus.currentContext !== 'None' && (
                        <div style={{ marginTop: '4px' }}>
                          <strong>Current Context:</strong> 
                          <code style={{ 
                            marginLeft: '8px',
                            padding: '2px 6px',
                            background: '#F3F4F6',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#F97316',
                            fontFamily: 'monospace'
                          }}>
                            {kubectlStatus.currentContext}
                          </code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6B7280' }}>
                  <Loader2 style={{ width: '20px', height: '20px' }} className="animate-spin" />
                  <span>Checking kubectl status...</span>
                </div>
              )}
            </div>

            {/* Main Content */}
            {showRegionSelection ? (
              <div>
                {/* Recently Used Regions Section */}
                {hasRecentRegions && (
                  <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          padding: '8px',
                          background: 'var(--color-primary)',
                          borderRadius: '12px',
                          color: 'white'
                        }}>
                          <History style={{ width: '18px', height: '18px' }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1F2937' }}>
                          Recently Used Regions
                        </h3>
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {recentRegions.map((recentRegion) => {
                        const regionInfo = AWS_REGIONS.find(r => r.value === recentRegion.region);
                        return (
                          <div
                            key={recentRegion.region}
                            style={{
                              position: 'relative',
                              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                              border: '2px solid #F97316',
                              borderRadius: '16px',
                              padding: '16px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              overflow: 'hidden'
                            }}
                            onClick={() => handleRegionSelect(recentRegion.region)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 12px 30px rgba(249, 115, 22, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {/* Remove button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentRegion(recentRegion.region);
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '4px',
                                cursor: 'pointer',
                                color: '#DC2626',
                                transition: 'all 0.2s ease',
                                opacity: 0.7
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#DC2626';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.opacity = '1';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                e.currentTarget.style.color = '#DC2626';
                                e.currentTarget.style.opacity = '0.7';
                              }}
                              title="Remove from recently used"
                            >
                              <Trash2 style={{ width: '12px', height: '12px' }} />
                            </button>

                            {/* Glow effect */}
                            <div style={{
                              position: 'absolute',
                              top: '0',
                              left: '0',
                              right: '0',
                              height: '3px',
                              background: 'linear-gradient(90deg, #F97316, #DC2626)',
                              borderRadius: '16px 16px 0 0'
                            }} />
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                              <div style={{ fontSize: '20px' }}>{regionInfo?.flag || '🌍'}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: '#F97316' }}>
                                  {recentRegion.region}
                                </div>
                                <div style={{ color: '#92400E', fontSize: '12px', opacity: 0.8 }}>
                                  {regionInfo?.label || recentRegion.region}
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <Clock style={{ width: '12px', height: '12px', color: '#92400E' }} />
                                <span style={{ fontSize: '11px', color: '#92400E' }}>
                                  {getTimeAgo(recentRegion.lastUsed)}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#92400E', opacity: 0.8 }}>
                                {recentRegion.usageCount} connection{recentRegion.usageCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                            
                            {/* Recent clusters */}
                            <div style={{ 
                              background: 'rgba(255, 255, 255, 0.5)',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '11px'
                            }}>
                              <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                                Recent clusters:
                              </div>
                              {recentRegion.clusters.slice(0, 2).map((cluster, idx) => (
                                <div key={idx} style={{ 
                                  color: '#A16207',
                                  marginBottom: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <Box style={{ width: '10px', height: '10px' }} />
                                  <span style={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    flex: 1
                                  }}>
                                    {cluster.name}
                                  </span>
                                </div>
                              ))}
                              {recentRegion.clusters.length > 2 && (
                                <div style={{ color: '#A16207', fontSize: '10px', opacity: 0.7 }}>
                                  +{recentRegion.clusters.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Divider */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '16px', 
                      margin: '32px 0',
                      opacity: 0.6
                    }}>
                      <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                      <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>
                        or browse all regions
                      </span>
                      <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                    </div>
                  </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ 
                      padding: '12px',
                      background: 'var(--color-primary)',
                      borderRadius: '16px',
                      color: 'white'
                    }}>
                      <Globe style={{ width: '24px', height: '24px' }} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1F2937' }}>
                      {hasRecentRegions ? 'All AWS Regions' : 'Choose Your Region'}
                    </h2>
                  </div>
                  <p style={{ color: '#6B7280', fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
                    Select the AWS region where your EKS clusters are deployed. Popular regions are highlighted with a star.
                  </p>
                </div>
                
                <div 
                  className="k8s-grid k8s-scrollbar"
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))', 
                    gap: isMobile ? '12px' : '16px',
                    maxHeight: isMobile ? '60vh' : '400px',
                    overflowY: 'auto',
                    padding: '12px 4px 12px 0'
                  }}
                >
                  {AWS_REGIONS.map((region) => (
                    <div
                      key={region.value}
                      onClick={() => handleRegionSelect(region.value)}
                      style={{
                        position: 'relative',
                        background: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: isMobile ? '12px' : '16px',
                        padding: isMobile ? '16px' : '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#F97316';
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(249, 115, 22, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {region.popular && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          boxShadow: '0 4px 8px rgba(251, 191, 36, 0.4)'
                        }}>
                          ⭐
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '24px' }}>{region.flag}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: '#1F2937' }}>
                            {region.value}
                          </div>
                          <div style={{ color: '#6B7280', fontSize: '14px' }}>
                            {region.label}
                          </div>
                        </div>
                        <ArrowLeft style={{ 
                          width: '16px', 
                          height: '16px', 
                          color: '#9CA3AF',
                          transform: 'rotate(180deg)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* Region Header */}
                <div style={{ 
                  background: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button
                        onClick={handleBackToRegions}
                        style={{
                          padding: '8px',
                          background: 'white',
                          border: '2px solid #D1D5DB',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <ArrowLeft style={{ width: '16px', height: '16px' }} />
                      </button>
                      <div>
                        <h3 style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '20px', 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <span>EKS Clusters</span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            <MapPin style={{ width: '14px', height: '14px' }} />
                            {selectedRegion}
                          </span>
                        </h3>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
                          {clusters.length} cluster{clusters.length !== 1 ? 's' : ''} found
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => selectedRegion && loadClusters(selectedRegion)}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: isLoading ? 0.5 : 1
                      }}
                    >
                      <RefreshCw style={{ width: '16px', height: '16px' }} className={isLoading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                  <div style={{ 
                    background: 'white',
                    borderRadius: '16px',
                    padding: '60px 20px',
                    textAlign: 'center',
                    border: '2px solid #E5E7EB'
                  }}>
                    <div style={{ 
                      width: '60px',
                      height: '60px',
                      background: 'var(--color-primary)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px auto',
                      animation: 'pulse 2s infinite'
                    }}>
                      <Loader2 style={{ width: '24px', height: '24px', color: 'white' }} className="animate-spin" />
                    </div>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: '#1F2937' }}>
                      Discovering clusters...
                    </h4>
                    <p style={{ color: '#6B7280', margin: 0 }}>
                      Scanning {selectedRegion} for your EKS infrastructure
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div style={{ 
                    background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
                    border: '2px solid #FECACA',
                    borderRadius: '16px',
                    padding: '24px',
                    margin: '20px 0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        padding: '8px',
                        background: 'var(--color-error)',
                        borderRadius: '12px',
                        color: 'white'
                      }}>
                        <XCircle style={{ width: '20px', height: '20px' }} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#DC2626' }}>
                          Houston, we have a problem!
                        </h4>
                        <p style={{ margin: 0, color: '#DC2626', fontSize: '14px' }}>{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clusters */}
                {!isLoading && !error && clusters.length > 0 && (
                  <div>
                    {clusters.map((cluster) => (
                      <div
                        key={cluster.name}
                        style={{
                          background: 'white',
                          border: isCurrentContext(cluster.name) ? '2px solid #F97316' : '2px solid #E5E7EB',
                          borderRadius: '20px',
                          padding: '24px',
                          marginBottom: '16px',
                          transition: 'all 0.3s ease',
                          ...(isCurrentContext(cluster.name) && {
                            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                            boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.2)'
                          })
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrentContext(cluster.name)) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(0, 0, 0, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrentContext(cluster.name)) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
                        }}
                      >
                        <div 
                          className="k8s-cluster-content"
                          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', marginBottom: isMobile ? '12px' : '16px' }}>
                              <div style={{ 
                                padding: isMobile ? '8px' : '12px',
                                background: isCurrentContext(cluster.name) ? '#F97316' : 'white',
                                borderRadius: isMobile ? '12px' : '16px',
                                color: isCurrentContext(cluster.name) ? 'white' : '#6B7280',
                                flexShrink: 0
                              }}>
                                <Box style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px' }} />
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h4 style={{ 
                                  margin: '0 0 8px 0', 
                                  fontSize: isMobile ? '16px' : '20px', 
                                  fontWeight: 'bold',
                                  color: '#1F2937',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  flexWrap: 'wrap'
                                }}>
                                  <span style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: isMobile ? '150px' : 'none'
                                  }}>
                                    {cluster.name}
                                  </span>
                                  {isCurrentContext(cluster.name) && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '3px 6px',
                                      background: '#F97316',
                                      color: 'white',
                                      borderRadius: '6px',
                                      fontSize: '10px',
                                      fontWeight: '600',
                                      flexShrink: 0
                                    }}>
                                      <Zap style={{ width: '10px', height: '10px' }} />
                                      Active
                                    </span>
                                  )}
                                </h4>
                                <div>{getStatusBadge(cluster.status)}</div>
                              </div>
                            </div>
                            
                            <div style={{ 
                              background: 'white',
                              borderRadius: isMobile ? '8px' : '12px',
                              padding: isMobile ? '12px' : '16px',
                              border: '1px solid #E2E8F0'
                            }}>
                              <div 
                                className="k8s-cluster-info"
                                style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', 
                                  gap: isMobile ? '8px' : '16px',
                                  marginBottom: isMobile ? '8px' : '12px'
                                }}
                              >
                                <div>
                                  <span style={{ color: '#6B7280', fontWeight: '600', fontSize: isMobile ? '12px' : '14px' }}>Version:</span>
                                  <span style={{ marginLeft: '6px', color: '#1F2937', fontWeight: '700', fontSize: isMobile ? '12px' : '14px' }}>{cluster.version}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#6B7280', fontWeight: '600', fontSize: isMobile ? '12px' : '14px' }}>Region:</span>
                                  <span style={{ marginLeft: '6px', color: '#1F2937', fontWeight: '700', fontSize: isMobile ? '12px' : '14px' }}>{cluster.region}</span>
                                </div>
                              </div>
                              
                              {cluster.endpoint && (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'space-between',
                                  background: 'white',
                                  borderRadius: '6px',
                                  padding: isMobile ? '8px' : '12px',
                                  border: '1px solid #E5E7EB',
                                  gap: '8px'
                                }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ color: '#6B7280', fontWeight: '600', fontSize: isMobile ? '11px' : '14px', display: 'block' }}>
                                      Endpoint:
                                    </span>
                                    <code style={{ 
                                      fontSize: isMobile ? '10px' : '12px',
                                      color: '#374151',
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all',
                                      display: 'block',
                                      marginTop: '2px',
                                      lineHeight: '1.2'
                                    }}>
                                      {cluster.endpoint}
                                    </code>
                                  </div>
                                  <button
                                    onClick={() => copyEndpoint(cluster.endpoint!)}
                                    style={{
                                      padding: isMobile ? '6px' : '8px',
                                      background: copiedEndpoint === cluster.endpoint ? '#10B981' : 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      color: copiedEndpoint === cluster.endpoint ? 'white' : '#6B7280',
                                      flexShrink: 0
                                    }}
                                  >
                                    {copiedEndpoint === cluster.endpoint ? (
                                      <Check style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
                                    ) : (
                                      <Copy style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div 
                            className="k8s-button-group"
                            style={{ marginLeft: isMobile ? 0 : '24px', marginTop: isMobile ? '16px' : 0 }}
                          >
                            <button
                              onClick={() => setKubectlContext(cluster.name, cluster.region)}
                              disabled={settingContext === cluster.name || cluster.status.toLowerCase() !== 'active' || !kubectlStatus?.available}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isMobile ? '8px' : '12px',
                                padding: isMobile ? '12px 16px' : '16px 24px',
                                background: isCurrentContext(cluster.name) ? '#F97316' : 'white',
                                color: isCurrentContext(cluster.name) ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: isMobile ? '12px' : '16px',
                                fontWeight: '700',
                                fontSize: isMobile ? '14px' : '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: (settingContext === cluster.name || cluster.status.toLowerCase() !== 'active' || !kubectlStatus?.available) ? 0.5 : 1,
                                width: isMobile ? '100%' : 'auto',
                                minWidth: isMobile ? 'auto' : '140px'
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrentContext(cluster.name) && !e.currentTarget.disabled) {
                                  e.currentTarget.style.background = '#F97316';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrentContext(cluster.name)) {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.color = '#374151';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              {settingContext === cluster.name ? (
                                <>
                                  <Loader2 style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px' }} className="animate-spin" />
                                  {isMobile ? 'Connecting...' : 'Connecting...'}
                                </>
                              ) : (
                                <>
                                  <Terminal style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px' }} />
                                  {isCurrentContext(cluster.name) ? 'Connected' : 'Connect'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && clusters.length === 0 && (
                  <div style={{ 
                    background: 'white',
                    borderRadius: '16px',
                    padding: '60px 20px',
                    textAlign: 'center',
                    border: '2px solid #E5E7EB'
                  }}>
                    <div style={{ 
                      padding: '20px',
                      background: '#F3F4F6',
                      borderRadius: '20px',
                      display: 'inline-block',
                      marginBottom: '20px'
                    }}>
                      <Box style={{ width: '48px', height: '48px', color: '#9CA3AF' }} />
                    </div>
                    <h4 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: '#1F2937' }}>
                      No clusters found
                    </h4>
                    <p style={{ color: '#6B7280', margin: '0 0 4px 0' }}>
                      No EKS clusters detected in {selectedRegion}.
                    </p>
                    <p style={{ color: '#9CA3AF', margin: 0, fontSize: '14px' }}>
                      Make sure you have the necessary permissions to list EKS clusters.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            background: 'white',
            borderTop: '1px solid #E2E8F0',
            padding: isMobile ? '16px' : '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '0'
          }}>
            <div style={{ color: '#6B7280', fontSize: isMobile ? '12px' : '14px', textAlign: 'center' }}>
              
            </div>
                          <button
                onClick={onClose}
                style={{
                  padding: isMobile ? '10px 20px' : '12px 24px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: isMobile ? '12px' : '16px',
                  fontWeight: '700',
                  fontSize: isMobile ? '14px' : '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: isMobile ? '100%' : 'auto'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F97316';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#F97316';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Close
              </button>
          </div>
        </div>
      </div>
    </>
  );
});

export default KubernetesClustersDialog; 