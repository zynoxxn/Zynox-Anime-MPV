import React from 'react';
import { Search, X } from 'lucide-react';

interface AdminSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const AdminSearchInput: React.FC<AdminSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  autoFocus = false,
}) => {
  return (
    <div className={`relative flex items-center min-w-0 ${className}`}>
      <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-11 pl-10 pr-9 bg-[#0B1324] border border-white/10 hover:border-white/15 focus:border-[#1E88FF] focus:ring-1 focus:ring-[#1E88FF] rounded-xl text-xs sm:text-sm text-white placeholder-[#94A3B8] outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="w-6 h-6 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center absolute right-2.5 transition-colors cursor-pointer"
          title="Clear search"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
