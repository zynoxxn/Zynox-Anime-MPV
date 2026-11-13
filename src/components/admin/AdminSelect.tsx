import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export interface AdminSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

interface AdminSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: AdminSelectOption<T>[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  sheetTitle?: string;
  helperText?: string;
  className?: string;
  buttonClassName?: string;
}

export function AdminSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  label,
  placeholder = 'Select option...',
  disabled = false,
  sheetTitle,
  helperText,
  className = '',
  buttonClassName = '',
}: AdminSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile viewport (< 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close desktop dropdown on click outside
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isMobile]);

  // Lock body scroll on phone bottom sheet
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 truncate">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-10 px-3.5 rounded-xl bg-[#0B1324] border border-white/10 hover:border-white/15 focus:border-[#1E88FF] text-left text-xs sm:text-sm text-white flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-[#1E88FF] shrink-0" />
          )}
          <span className={selectedOption ? 'text-white' : 'text-[#94A3B8]'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#94A3B8] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Desktop Anchored Popover Menu (>= 640px) */}
      {isOpen && !isMobile && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1.5 left-0 right-0 min-w-[200px] bg-[#101A30] border border-white/10 rounded-xl shadow-xl shadow-black/50 py-1.5 max-h-[260px] overflow-y-auto no-scrollbar animate-fadeIn"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const Icon = opt.icon;
            return (
              <button
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full h-11 px-3.5 text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#1E88FF]/15 text-[#1E88FF] font-semibold'
                    : 'text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {Icon && <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#1E88FF]' : 'text-[#94A3B8]'}`} />}
                  <div className="truncate">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[11px] text-[#94A3B8] block truncate">{opt.description}</span>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#1E88FF] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Phone Bottom Sheet (< 640px) */}
      {isOpen && isMobile && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-h-[75dvh] bg-[#101A30] border-t border-white/10 rounded-t-[20px] shadow-2xl flex flex-col z-10 animate-slideUp">
            {/* Drag Handle & Header */}
            <div className="pt-3 pb-2 px-4 flex flex-col items-center border-b border-white/5 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20 mb-2.5" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-sm font-bold text-white truncate">
                  {sheetTitle || label || 'Select Option'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Options List */}
            <div
              role="listbox"
              className="p-2 overflow-y-auto max-h-[calc(75dvh-60px)] divide-y divide-white/5 pb-[calc(16px+env(safe-area-inset-bottom))]"
            >
              {options.map((opt) => {
                const isSelected = opt.value === value;
                const Icon = opt.icon;
                return (
                  <button
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full h-12 px-4 text-left text-sm font-medium flex items-center justify-between gap-3 transition-colors cursor-pointer rounded-xl ${
                      isSelected
                        ? 'bg-[#1E88FF]/15 text-[#1E88FF] font-semibold'
                        : 'text-white hover:bg-white/5 active:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {Icon && (
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#1E88FF]' : 'text-[#94A3B8]'}`} />
                      )}
                      <div className="truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-xs text-[#94A3B8] block truncate">{opt.description}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#1E88FF] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {helperText && (
        <p className="text-[11px] text-[#94A3B8] mt-1">{helperText}</p>
      )}
    </div>
  );
}
