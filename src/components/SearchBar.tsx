import { ChangeEvent } from 'react';
import { Search } from 'lucide-react';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = "Search accounts..." }: SearchBarProps) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="search-container">
      <div className="search-wrapper">
        <div className="search-icon-wrapper">
          <Search className="search-icon" size={18} />
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
    </div>
  );
};

export default SearchBar;
