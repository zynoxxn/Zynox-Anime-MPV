import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AdminAccordionProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (nextOpen: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const AdminAccordion: React.FC<AdminAccordionProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  className = '',
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    if (onToggle) onToggle(next);
    else setInternalOpen(next);
  };

  return (
    <div
      className={`bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden transition-colors ${className}`}
    >
      {/* 56px Card Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full h-14 px-4 sm:px-5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors cursor-pointer select-none"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#1E88FF] shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown
            className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${
              open ? 'rotate-180 text-white' : ''
            }`}
          />
        </div>
      </button>

      {/* Collapsible Content */}
      {open && (
        <div className="p-4 sm:p-5 border-t border-white/5 space-y-4 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
};
