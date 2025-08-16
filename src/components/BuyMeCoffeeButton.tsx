import React from 'react';
import { useElectron } from '../contexts/ElectronContext';

interface BuyMeCoffeeButtonProps {
  size?: 'small' | 'medium' | 'large';
  style?: React.CSSProperties;
}

const BuyMeCoffeeButton: React.FC<BuyMeCoffeeButtonProps> = ({ 
  size = 'small',
  style = {}
}) => {
  const electron = useElectron();
  
  const handleClick = async () => {
    try {
      // Use Electron's shell to open the external URL
      if (electron.openExternal) {
        await electron.openExternal('https://www.buymeacoffee.com/Cfircoo');
      } else {
        // Fallback to window.open if electron method is not available
        window.open('https://www.buymeacoffee.com/Cfircoo', '_blank');
      }
    } catch (error) {
      console.error('Error opening Buy Me a Coffee link:', error);
      // Fallback to window.open on error
      window.open('https://www.buymeacoffee.com/Cfircoo', '_blank');
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      height: '28px',
      fontSize: '12px',
      padding: '4px 8px'
    },
    medium: {
      height: '36px',
      fontSize: '14px',
      padding: '6px 12px'
    },
    large: {
      height: '44px',
      fontSize: '16px',
      padding: '8px 16px'
    }
  };

  const currentSize = sizeConfig[size];

  return (
    <button
      onClick={handleClick}
      style={{
        background: 'linear-gradient(135deg, #FFDD00 0%, #FFC107 100%)',
        border: '2px solid #000000',
        borderRadius: '8px',
        color: '#000000',
        fontFamily: 'Cookie, cursive',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        textDecoration: 'none',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        ...currentSize,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      }}
      title="Support the development by buying me a coffee! ☕"
    >
      <span style={{ fontSize: currentSize.fontSize === '12px' ? '14px' : '16px' }}>☕</span>
      <span>Buy me a coffee</span>
    </button>
  );
};

export default BuyMeCoffeeButton;
