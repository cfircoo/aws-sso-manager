import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        btn-secondary p-2 relative overflow-hidden group
        ${isDarkMode ? 'hover:bg-yellow-500/10' : 'hover:bg-blue-500/10'}
        transition-all duration-300 hover:scale-105
      `}
    >
      <div className={`
        transition-all duration-300 transform group-hover:rotate-12
        ${isDarkMode ? 'text-yellow-400' : 'text-blue-400'}
      `}>
        {isDarkMode ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </div>
      
      {/* Animated background effect */}
      <div className={`
        absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300
        ${isDarkMode 
          ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
          : 'bg-gradient-to-r from-orange-400 to-red-400'
        }
      `} />
    </button>
  );
};

export default ThemeToggle; 