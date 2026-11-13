import React from 'react';

export interface AdminSectionHeaderAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface AdminSectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: AdminSectionHeaderAction[] | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const AdminSectionHeader: React.FC<AdminSectionHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className = '',
  children,
}) => {
  const renderActions = () => {
    if (!actions) return null;

    if (Array.isArray(actions)) {
      return (
        <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0">
          {actions.map((act, index) => {
            const Icon = act.icon;
            const isPrimary = act.variant === 'primary';
            const isDanger = act.variant === 'danger';
            return (
              <button
                key={index}
                type="button"
                disabled={act.disabled}
                onClick={act.onClick}
                className={`h-10 px-3.5 rounded-[10px] text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                  isPrimary
                    ? 'bg-[#1E88FF] hover:bg-[#3B9BFF] active:bg-[#1670D6] text-white shadow-sm shadow-[#1E88FF]/20'
                    : isDanger
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                    : 'bg-white/5 hover:bg-white/10 active:bg-white/15 text-[#CBD5E1] hover:text-white border border-white/10'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span className="whitespace-nowrap">{act.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0 shrink-0">
        {actions}
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-white/5 ${className}`}
    >
      {/* Title & Description block */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-white tracking-tight truncate">
            {title}
          </h3>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-[#94A3B8] line-clamp-2 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Actions row */}
      {renderActions()}
      {children}
    </div>
  );
};
