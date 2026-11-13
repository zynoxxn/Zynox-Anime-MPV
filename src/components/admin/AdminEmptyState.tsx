import React from 'react';
import { FolderOpen } from 'lucide-react';

interface AdminEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title = 'No items found',
  description = 'There are no items matching this filter or section.',
  icon: Icon = FolderOpen,
  actionLabel,
  onAction,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl bg-[#0B1324] ${
        compact ? 'p-4 sm:p-6 space-y-2' : 'p-8 sm:p-12 space-y-3 border border-white/5'
      } ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94A3B8]">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {title}
        </h4>
        <p className="text-xs text-[#94A3B8] leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 h-9 px-3.5 rounded-xl bg-[#1E88FF] hover:bg-[#1873db] text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
