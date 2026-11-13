import React from 'react';

export interface AdminPageHeaderAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  title?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: AdminPageHeaderAction;
  secondaryActions?: AdminPageHeaderAction[];
  children?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  primaryAction,
  secondaryActions,
  children,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/5">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-[22px] font-bold text-white tracking-tight truncate">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5 truncate hidden sm:block">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {children}

        {secondaryActions?.map((act, i) => {
          const Icon = act.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={act.onClick}
              disabled={act.disabled}
              title={act.title || act.label}
              className="h-10 px-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {Icon && <Icon className="w-4 h-4 shrink-0" />}
              <span className="hidden xs:inline">{act.label}</span>
            </button>
          );
        })}

        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            title={primaryAction.title || primaryAction.label}
            className="h-10 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1873db] active:bg-[#1460b8] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-[#1E88FF]/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4 shrink-0" />}
            <span>{primaryAction.label}</span>
          </button>
        )}
      </div>
    </div>
  );
};
