import React from 'react';
import { Coffee } from 'lucide-react';
import { useElectron } from '../contexts/ElectronContext';

interface BuyMeCoffeeButtonProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'minimal';
  className?: string;
}

const BuyMeCoffeeButton: React.FC<BuyMeCoffeeButtonProps> = ({ 
  size = 'small',
  variant = 'minimal',
  className = ''
}) => {
  const electron = useElectron();
  
  const handleClick = async () => {
    try {
      if (electron.openExternal) {
        await electron.openExternal('https://www.buymeacoffee.com/Cfircoo');
      } else {
        window.open('https://www.buymeacoffee.com/Cfircoo', '_blank');
      }
    } catch (error) {
      console.error('Error opening Buy Me a Coffee link:', error);
      window.open('https://www.buymeacoffee.com/Cfircoo', '_blank');
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      padding: '6px 12px',
      fontSize: '12px',
      iconSize: 14
    },
    medium: {
      padding: '8px 16px',
      fontSize: '14px',
      iconSize: 16
    },
    large: {
      padding: '10px 20px',
      fontSize: '16px',
      iconSize: 18
    }
  };

  const currentSize = sizeConfig[size];

  // Professional variant styles
  const variantStyles = {
    primary: {
      background: 'var(--color-primary)',
      color: 'white',
      border: 'none',
      hover: {
        background: 'var(--color-primary-hover)',
        transform: 'translateY(-1px)',
        boxShadow: 'var(--shadow-md)'
      }
    },
    secondary: {
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)',
      hover: {
        background: 'var(--bg-secondary)',
        borderColor: 'var(--color-primary)',
        transform: 'translateY(-1px)',
        boxShadow: 'var(--shadow-sm)'
      }
    },
    minimal: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      hover: {
        color: 'var(--text-primary)',
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
        transform: 'translateY(-1px)'
      }
    }
  };

  const baseStyle = variantStyles[variant];

  return (
    <button
      onClick={handleClick}
      className={`buy-coffee-button ${className}`}
      style={{
        ...baseStyle,
        borderRadius: 'var(--radius-md)',
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: '500',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all var(--transition-smooth)',
        textDecoration: 'none',
        fontFamily: 'inherit'
      }}
      onMouseEnter={(e) => {
        Object.assign(e.currentTarget.style, baseStyle.hover);
      }}
      onMouseLeave={(e) => {
        Object.assign(e.currentTarget.style, {
          ...baseStyle,
          transform: 'translateY(0)'
        });
      }}
      title="Support the development"
      aria-label="Buy me a coffee - Support development"
    >
      <Coffee size={currentSize.iconSize} />
      <span>Support</span>
    </button>
  );
};

export default BuyMeCoffeeButton;
