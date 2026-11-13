import React, { useRef, useEffect } from 'react';

export interface AdminTabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface AdminSegmentedTabsProps<T extends string = string> {
  tabs: AdminTabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function AdminSegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: AdminSegmentedTabsProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active tab into center of strip
  useEffect(() => {
    if (activeBtnRef.current) {
      activeBtnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  return (
    <div className={`relative flex items-center min-w-0 ${className}`}>
      {/* Scrollable container with snap & 16px padding on both ends */}
      <div
        ref={scrollRef}
        role="tablist"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 px-4 w-full"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeBtnRef : undefined}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 snap-center flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#1E88FF] text-white shadow-sm shadow-[#1E88FF]/20 font-semibold'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5 bg-transparent'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span className="whitespace-nowrap">{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-[#94A3B8]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 16px Left & Right outer edge fade overlays with pointer-events-none */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-[#050A14] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#050A14] to-transparent" />
    </div>
  );
}
