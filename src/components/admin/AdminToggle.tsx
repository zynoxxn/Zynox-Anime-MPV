import React from 'react';

interface AdminToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const AdminToggle: React.FC<AdminToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}) => {
  return (
    <div
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={`flex items-center justify-between gap-3 py-2 cursor-pointer select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      {/* Left label & description */}
      {(label || description) && (
        <div className="min-w-0 flex-1">
          {label && (
            <div className="text-xs sm:text-sm font-semibold text-white truncate">
              {label}
            </div>
          )}
          {description && (
            <p className="text-[11px] sm:text-xs text-[#94A3B8] mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Custom Switch Pill (44px x 24px) */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1E88FF] focus:ring-offset-2 focus:ring-offset-[#0B1324] ${
          checked ? 'bg-[#1E88FF]' : 'bg-white/15'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
