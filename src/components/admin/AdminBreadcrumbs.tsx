import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface AdminBreadcrumbItem {
  label: string;
  path?: string;
}

interface AdminBreadcrumbsProps {
  items: AdminBreadcrumbItem[];
  navigate?: (path: string) => void;
  className?: string;
}

export const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({
  items,
  navigate,
  className = '',
}) => {
  return (
    <nav
      aria-label="Breadcrumbs"
      className={`flex items-center gap-1.5 text-xs text-[#94A3B8] overflow-hidden truncate ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-[#94A3B8]/60 shrink-0" />
            )}
            {item.path && !isLast && navigate ? (
              <button
                type="button"
                onClick={() => navigate(item.path!)}
                className="hover:text-white transition-colors truncate max-w-[140px] cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`truncate max-w-[160px] ${
                  isLast ? 'text-white font-medium' : ''
                }`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
