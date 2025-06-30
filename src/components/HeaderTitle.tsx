import React from 'react';

interface HeaderTitleProps {
  title: string;
  appVersion?: string | null;
  beta?: boolean;
}

export const HeaderTitle = ({ title, appVersion, beta = false }: HeaderTitleProps) => {
  return (
    <div className="flex items-baseline space-x-2">
      <h1 className="text-xl font-bold text-gradient animate-fade-in">
        {title}
      </h1>
      {beta && (
        <span className="badge badge-warning animate-pulse">
          Beta
        </span>
      )}
      {appVersion && (
        <span className="text-xs text-tertiary font-medium bg-glass-bg px-2 py-1 rounded-full backdrop-blur-sm border border-glass-border">
          v{appVersion}
        </span>
      )}
    </div>
  );
};

export default HeaderTitle; 