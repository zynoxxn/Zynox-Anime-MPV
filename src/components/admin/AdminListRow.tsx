import React from 'react';
import { GripVertical, Image as ImageIcon } from 'lucide-react';
import { AdminStatusBadge } from './AdminStatusBadge';
import { AdminRowMenu, AdminRowMenuItem } from './AdminRowMenu';

interface AdminListRowProps {
  id: string;
  title: string;
  meta?: React.ReactNode;
  thumbnail?: string;
  avatar?: string;
  thumbnailType?: 'poster' | 'episode' | 'avatar';
  status?: string;
  statusVariant?: any;
  badge?: React.ReactNode;
  menuItems?: AdminRowMenuItem[];
  menuTitle?: string;
  dragHandle?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  selectable?: boolean;
  toggle?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const AdminListRow: React.FC<AdminListRowProps> = ({
  id,
  title,
  meta,
  thumbnail,
  avatar,
  thumbnailType = 'poster',
  status,
  statusVariant,
  badge,
  menuItems,
  menuTitle,
  dragHandle = false,
  selected = false,
  onSelect,
  selectable = false,
  toggle,
  onClick,
  className = '',
}) => {
  const effectiveThumb = thumbnail !== undefined ? thumbnail : avatar;
  const effectiveThumbType = avatar ? 'avatar' : thumbnailType;

  // Thumbnail aspect classes: poster 48x64, episode 80x45, avatar 40x40 circle
  let thumbClasses = 'w-12 h-16 rounded-[8px]';
  if (effectiveThumbType === 'episode') {
    thumbClasses = 'w-20 h-11 rounded-[8px]';
  } else if (effectiveThumbType === 'avatar') {
    thumbClasses = 'w-10 h-10 rounded-full';
  }

  return (
    <div
      onClick={onClick}
      className={`min-h-[64px] px-3 sm:px-4 py-3 flex items-center gap-3 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''
      } ${selected ? 'bg-[#1E88FF]/10' : ''} border-b border-white/5 last:border-b-0 ${className}`}
    >
      {/* Optional Drag Handle */}
      {dragHandle && (
        <div
          className="w-6 h-6 flex items-center justify-center text-[#64748B] hover:text-white cursor-grab shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Optional Select Checkbox */}
      {selectable && onSelect && (
        <div
          className="shrink-0 flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(!selected);
          }}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors cursor-pointer ${
              selected
                ? 'bg-[#1E88FF] border-[#1E88FF] text-white'
                : 'border-white/20 bg-white/5 hover:border-white/40'
            }`}
          >
            {selected && (
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Visual Thumbnail */}
      {effectiveThumb !== undefined && (
        <div
          className={`relative shrink-0 overflow-hidden bg-black/40 border border-white/10 ${thumbClasses}`}
        >
          {effectiveThumb ? (
            <img
              src={effectiveThumb}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Graceful fallback to icon
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                if (target.parentElement) {
                  target.parentElement.classList.add('flex', 'items-center', 'justify-center', 'bg-white/5');
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-white/5 text-[#64748B]">
              <ImageIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      )}

      {/* Text Block: Title (14px/600 truncate) + Meta (12px muted truncate) */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white truncate leading-tight">
          {title}
        </h4>
        {meta && (
          <div className="text-xs text-[#94A3B8] mt-1 truncate">
            {meta}
          </div>
        )}
      </div>

      {/* Status Badge (hidden below 400px if space is tight) */}
      {badge ? (
        <div className="shrink-0 flex items-center">
          {badge}
        </div>
      ) : status ? (
        <div className="hidden xs:flex shrink-0 items-center">
          <AdminStatusBadge status={status} variant={statusVariant} />
        </div>
      ) : null}

      {/* Optional Toggle */}
      {toggle && (
        <div
          className="shrink-0 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {toggle}
        </div>
      )}

      {/* RowMenu ("⋯") */}
      {menuItems && menuItems.length > 0 && (
        <div
          className="shrink-0 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <AdminRowMenu
            title={menuTitle || title}
            items={menuItems}
          />
        </div>
      )}
    </div>
  );
};
