import React from 'react';
import { X } from 'lucide-react';

export interface AdminSelectionAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'destructive';
  destructive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface AdminSelectionBarProps {
  selectedCount: number;
  totalCount?: number;
  onSelectAll?: () => void;
  onClear: () => void;
  actions: AdminSelectionAction[];
  className?: string;
}

export const AdminSelectionBar: React.FC<AdminSelectionBarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  actions,
  className = '',
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#101A30] border border-white/15 rounded-[12px] px-3.5 sm:px-4 py-2.5 shadow-2xl shadow-black/80 flex items-center gap-3 animate-slideUp max-w-[92vw] overflow-x-auto no-scrollbar ${className}`}
    >
      <div className="flex items-center gap-2 pr-2 border-r border-white/10 shrink-0">
        <span className="text-xs sm:text-sm font-semibold text-white whitespace-nowrap">
          {selectedCount} selected
        </span>
        {onSelectAll && totalCount !== undefined && selectedCount < totalCount && (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] text-[#1E88FF] hover:underline whitespace-nowrap font-medium"
          >
            Select all ({totalCount})
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="w-6 h-6 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors"
          title="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {actions.map((act, index) => {
          const Icon = act.icon;
          if (act.variant === 'primary') {
            return (
              <button
                key={index}
                type="button"
                disabled={act.disabled}
                onClick={act.onClick}
                className="h-8 sm:h-9 px-3 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] active:bg-[#1670D6] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{act.label}</span>
              </button>
            );
          }
          if (act.variant === 'danger' || act.variant === 'destructive' || act.destructive) {
            return (
              <button
                key={index}
                type="button"
                disabled={act.disabled}
                onClick={act.onClick}
                className="h-8 sm:h-9 px-3 rounded-[8px] border border-rose-500/50 hover:bg-rose-500/15 text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{act.label}</span>
              </button>
            );
          }
          return (
            <button
              key={index}
              type="button"
              disabled={act.disabled}
              onClick={act.onClick}
              className="h-8 sm:h-9 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              <span>{act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
