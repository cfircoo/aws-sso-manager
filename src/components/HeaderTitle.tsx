import React from 'react';

interface HeaderTitleProps {
  title: string;
  appVersion?: string | null;
  beta?: boolean;
}

export const HeaderTitle = ({ title, appVersion, beta = false }: HeaderTitleProps) => {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
      <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>
        {title}
      </span>
      {beta && (
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#ea580c',
          backgroundColor: '#fff7ed',
          padding: '1px 5px',
          borderRadius: '4px',
          marginLeft: '-4px'
        }}>
          Beta
        </span>
      )}
      {appVersion && (
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          v{appVersion}
        </span>
      )}
    </div>
  );
};

export default HeaderTitle; 