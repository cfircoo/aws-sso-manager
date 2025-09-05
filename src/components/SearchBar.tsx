import React from 'react';
import { Search, X } from 'lucide-react';
import './SearchBar.css';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

const SearchBar = ({ searchTerm, onSearchChange, placeholder = "Search accounts..." }: SearchBarProps) => {
  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <div className="relative glass-card p-1 animate-slide-in w-full">
      <div className="relative flex items-center w-full">
        {/* Search Icon */}
        <div className="absolute left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-tertiary transition-colors duration-200 group-focus-within:text-primary" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className={`
            w-full pl-12 pr-12 py-4 bg-transparent border-none outline-none
            text-primary placeholder-tertiary font-medium
            transition-all duration-300 rounded-lg
            focus:ring-2 focus:ring-primary/20 focus:bg-glass-hover
            truncate
          `}
        />

        {/* Clear Button */}
        {searchTerm && (
          <button
            onClick={handleClear}
            className={`
              absolute right-3 p-2 rounded-full
              text-tertiary hover:text-primary hover:bg-glass-hover
              transition-all duration-200 hover:scale-110
              group flex-shrink-0
            `}
            title="Clear search"
          >
            <X className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
          </button>
        )}

        {/* Focus Ring Effect */}
        <div className="absolute inset-0 rounded-lg border-2 border-transparent transition-colors duration-200 pointer-events-none focus-within:border-primary/30" />
      </div>
      
      {/* Gradient Border Animation */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 transition-opacity duration-300 -z-10 group-focus-within:opacity-100" />
    </div>
  );
};

export default SearchBar;
