import React from 'react';
import { Copy, Terminal, Star, Bookmark } from 'lucide-react';
import { QuickAccessRole } from '../types/aws';
import { useQuickAccessRoles } from '../hooks/useQuickAccessRoles';

interface QuickAccessProps {
  onRoleSelect: (accountId: string, roleName: string) => void;
  onOpenTerminal: (accountId: string, roleName: string, isSystemTerminal?: boolean) => void;
  onOpenDefaultTerminal: (accountId: string, roleName: string) => void;
  onProfileChanged: () => void;
  accessToken: string | null;
}

const QuickAccess: React.FC<QuickAccessProps> = ({
  onRoleSelect,
  onOpenTerminal,
  onOpenDefaultTerminal,
  onProfileChanged,
  accessToken
}) => {
  const { quickAccessRoles, toggleQuickAccess } = useQuickAccessRoles();

  if (!accessToken) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Please log in to view quick access roles
      </div>
    );
  }

  if (quickAccessRoles.length === 0) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        color: '#666666'
      }}>
        <Bookmark size={48} style={{ opacity: 0.3, margin: '0 auto 20px' }} />
        <h3>No Quick Access Roles</h3>
        <p>
          Add roles to quick access by clicking the bookmark icon next to a role in the Accounts list.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Quick Access Roles</h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px' 
      }}>
        {quickAccessRoles.map((role) => (
          <div 
            key={`${role.accountId}-${role.roleName}`}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: 600,
                  marginBottom: '4px'
                }}>
                  {role.accountName || role.accountId}
                </h3>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: '#666',
                  marginBottom: '8px'
                }}>
                  {role.accountId}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 500,
                  backgroundColor: '#f0f9ff',
                  color: '#0366d6',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {role.roleName}
                </div>
              </div>
              
              <button
                onClick={() => toggleQuickAccess(role.accountId, role.roleName, role.accountName)}
                title="Remove from Quick Access"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#0366d6'
                }}
              >
                <Bookmark fill="currentColor" size={18} />
              </button>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '8px',
              marginTop: '12px'
            }}>
              <button
                onClick={() => onRoleSelect(role.accountId, role.roleName)}
                title="Copy Credentials"
                style={{
                  flex: 1,
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <Copy size={16} />
                <span>Credentials</span>
              </button>
              
              <button
                onClick={() => onOpenDefaultTerminal(role.accountId, role.roleName)}
                title="Open Terminal"
                style={{
                  flex: 1,
                  backgroundColor: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <Terminal size={16} />
                <span>Terminal</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickAccess; 