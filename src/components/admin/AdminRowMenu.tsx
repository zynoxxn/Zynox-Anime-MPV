import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, X } from 'lucide-react';

export interface AdminRowMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface AdminRowMenuProps {
  items: AdminRowMenuItem[];
  title?: string;
  align?: 'left' | 'right';
  className?: string;
}

export const AdminRowMenu: React.FC<AdminRowMenuProps> = ({
  items,
  title = 'Actions',
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleItemClick = (item: AdminRowMenuItem) => {
    if (item.disabled) return;
    setIsOpen(false);
    item.onClick();
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* "⋯" Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        title="More options"
        aria-label="More options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Desktop Popover */}
      {isOpen && !isMobile && (
        <div
          className={`absolute z-40 mt-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-48 bg-[#101A30] border border-white/10 rounded-xl shadow-xl shadow-black/50 py-1 animate-fadeIn`}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.id}>
                {item.divider && <div className="h-px bg-white/5 my-1" />}
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={() => handleItemClick(item)}
                  className={`w-full px-3.5 py-2.5 text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    item.destructive
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        item.destructive ? 'text-rose-400' : 'text-[#94A3B8]'
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Phone Bottom Sheet */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-h-[calc(100dvh-56px-60px)] bg-[#101A30] border-t border-white/10 rounded-t-[20px] shadow-2xl z-10 animate-slideUp flex flex-col pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
            {/* Handle & Title Header */}
            <div className="pt-3 pb-2 px-4 flex flex-col items-center border-b border-white/5 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20 mb-2.5" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-sm font-bold text-white truncate">{title}</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Items Container (Each item 52px high with 20px icon) */}
            <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100dvh-56px-60px-80px)]">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.id}>
                    {item.divider && <div className="h-px bg-white/5 my-1" />}
                    <button
                      type="button"
                      disabled={item.disabled}
                      onClick={() => handleItemClick(item)}
                      className={`w-full h-[52px] px-4 rounded-xl text-left text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer ${
                        item.destructive
                          ? 'text-rose-400 hover:bg-rose-500/15'
                          : 'text-white hover:bg-white/5 active:bg-white/10'
                      }`}
                    >
                      {Icon && (
                        <Icon
                          className={`w-5 h-5 shrink-0 ${
                            item.destructive ? 'text-rose-400' : 'text-[#94A3B8]'
                          }`}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
