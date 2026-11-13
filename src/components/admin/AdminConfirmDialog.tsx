import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AdminConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireKeyword?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requireKeyword,
  isDestructive = true,
  isLoading = false,
}) => {
  const [typedKeyword, setTypedKeyword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedKeyword('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isConfirmed = requireKeyword
    ? typedKeyword.trim().toUpperCase() === requireKeyword.trim().toUpperCase()
    : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-[#0B1324] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 z-10 space-y-4 animate-fadeIn">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                  : 'bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/25'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
          {consequence}
        </p>

        {requireKeyword && (
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-white">
              Type <span className="font-mono text-rose-400">{requireKeyword}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedKeyword}
              onChange={(e) => setTypedKeyword(e.target.value)}
              placeholder={requireKeyword}
              className="w-full h-10 px-3.5 bg-[#050A14] border border-white/10 focus:border-rose-500 rounded-xl text-xs sm:text-sm text-white font-mono outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-10 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer disabled:opacity-40"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={!isConfirmed || isLoading}
            onClick={onConfirm}
            className={`h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-500/25'
                : 'bg-[#1E88FF] hover:bg-[#1873db] text-white shadow-sm shadow-[#1E88FF]/25'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
