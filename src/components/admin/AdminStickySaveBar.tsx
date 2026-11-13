import React from 'react';
import { Loader2 } from 'lucide-react';

export interface AdminStickySaveBarProps {
  isDirty?: boolean;
  message?: string;
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  isSaving?: boolean;
  saving?: boolean;
  disabled?: boolean;
  showDiscard?: boolean;
  className?: string;
}

export const AdminStickySaveBar: React.FC<AdminStickySaveBarProps> = ({
  isDirty = true,
  message = 'Unsaved changes',
  onSave,
  onDiscard,
  saveLabel = 'Save changes',
  discardLabel = 'Discard',
  isSaving = false,
  saving = false,
  disabled = false,
  showDiscard = true,
  className = '',
}) => {
  React.useEffect(() => {
    if (isDirty) {
      document.body.setAttribute('data-has-save-bar', 'true');
      return () => {
        document.body.removeAttribute('data-has-save-bar');
      };
    } else {
      document.body.removeAttribute('data-has-save-bar');
    }
  }, [isDirty]);

  if (!isDirty) return null;
  const isBusy = isSaving || saving;

  return (
    <div
      id="admin-sticky-save-bar"
      data-admin-savebar="true"
      className={`fixed left-0 right-0 z-20 bg-[#0B1324] border-t border-white/10 px-4 sm:px-8 py-3 h-16 flex items-center justify-between shadow-2xl shadow-black/80 animate-slideUp bottom-[calc(60px+env(safe-area-inset-bottom))] md:bottom-0 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-[#1E88FF] animate-pulse shrink-0" />
        <span className="text-xs text-[#CBD5E1] font-medium truncate">
          {message}
        </span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {onDiscard && showDiscard && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onDiscard}
            className="h-10 px-3.5 rounded-[10px] text-xs sm:text-sm font-medium text-[#CBD5E1] hover:text-white hover:bg-[#101A30] transition-colors cursor-pointer disabled:opacity-40"
          >
            {discardLabel}
          </button>
        )}

        <button
          type="button"
          disabled={disabled || isBusy}
          onClick={onSave}
          className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] active:bg-[#1670D6] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap min-w-[120px]"
        >
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{saveLabel}</span>
          )}
        </button>
      </div>
    </div>
  );
};
