import React, { useState } from 'react';
import type { SitePopupNotice, PopupNoticeTheme } from '../types/cms';
import { X, Check } from 'lucide-react';

interface SiteNoticeModalProps {
  isOpen: boolean;
  onClose: (dontShowAgainToday?: boolean) => void;
  notice: SitePopupNotice;
  onNavigate?: (path: string) => void;
}

const getThemeStyles = (theme: PopupNoticeTheme = 'blue') => {
  switch (theme) {
    case 'purple':
      return {
        accentBorder: 'border-purple-500/40',
        primaryBtn: 'bg-purple-600 hover:bg-purple-500 text-white',
        checkboxAccent: 'border-purple-500 bg-purple-600 text-white',
        titleColor: 'text-purple-400',
      };
    case 'amber':
      return {
        accentBorder: 'border-amber-500/40',
        primaryBtn: 'bg-amber-500 hover:bg-amber-400 text-black font-bold',
        checkboxAccent: 'border-amber-500 bg-amber-500 text-black',
        titleColor: 'text-amber-400',
      };
    case 'emerald':
      return {
        accentBorder: 'border-emerald-500/40',
        primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
        checkboxAccent: 'border-emerald-500 bg-emerald-600 text-white',
        titleColor: 'text-emerald-400',
      };
    case 'rose':
    case 'red':
      return {
        accentBorder: 'border-rose-500/40',
        primaryBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
        checkboxAccent: 'border-rose-500 bg-rose-600 text-white',
        titleColor: 'text-rose-400',
      };
    case 'blue':
    default:
      return {
        accentBorder: 'border-[#00A8FF]/40',
        primaryBtn: 'bg-[#00A8FF] hover:bg-[#38BDF8] text-white',
        checkboxAccent: 'border-[#00A8FF] bg-[#00A8FF] text-white',
        titleColor: 'text-[#00A8FF]',
      };
  }
};

export const SiteNoticeModal: React.FC<SiteNoticeModalProps> = ({
  isOpen,
  onClose,
  notice,
  onNavigate,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen || !notice.enabled) return null;

  const styles = getThemeStyles(notice.header?.themeColor || 'blue');
  const isExternal =
    notice.footer?.primaryButtonUrl?.startsWith('http://') ||
    notice.footer?.primaryButtonUrl?.startsWith('https://') ||
    notice.footer?.primaryButtonUrl?.startsWith('//');

  const handlePrimaryClick = () => {
    onClose(dontShowAgain);
    if (notice.footer?.primaryButtonUrl) {
      if (isExternal) {
        window.location.href = notice.footer.primaryButtonUrl;
      } else if (onNavigate) {
        onNavigate(notice.footer.primaryButtonUrl);
      } else {
        window.location.href = notice.footer.primaryButtonUrl;
      }
    }
  };

  const handleDismiss = () => {
    onClose(dontShowAgain);
  };

  return (
    <div
      id="site-notice-popup-overlay"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in"
      style={{
        backgroundColor: 'rgba(3, 7, 18, 0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-notice-title"
    >
      {/* 1:1 Square Card */}
      <div
        id="site-notice-popup-card"
        className={`w-full max-w-[350px] sm:max-w-[370px] aspect-square bg-[#070D18] border ${styles.accentBorder} rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between text-left relative animate-in zoom-in-95 duration-150`}
      >
        {/* ==================================================== */}
        {/* 1. COMPACT CLEAN HEADER */}
        {/* ==================================================== */}
        <div
          id="site-notice-header"
          className="px-5 pt-5 pb-2 flex items-center justify-between gap-3 shrink-0"
        >
          <h2
            id="popup-notice-title"
            className="text-base font-bold tracking-tight leading-none truncate"
            style={{ color: notice.header?.titleColor || '#FFFFFF' }}
          >
            {notice.header?.title || 'Notice'}
          </h2>

          {/* Minimal Close Button */}
          <button
            type="button"
            id="site-notice-close-button"
            onClick={handleDismiss}
            aria-label="Close"
            className="p-1 text-[#94A3B8] hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ==================================================== */}
        {/* 2. NOTICE BODY (CLEAN TEXT, NO EMOJIS OR ICONS) */}
        {/* ==================================================== */}
        <div
          id="site-notice-body"
          className="px-5 py-2 flex-1 overflow-y-auto flex flex-col justify-center text-left text-xs leading-relaxed text-[#CBD5E1] space-y-2.5"
        >
          {notice.notice?.text && (
            <p className="whitespace-pre-line font-normal text-[#CBD5E1]">
              {notice.notice.text}
            </p>
          )}

          {notice.notice?.highlightText && (
            <p className={`font-semibold ${styles.titleColor}`}>
              {notice.notice.highlightText}
            </p>
          )}
        </div>

        {/* ==================================================== */}
        {/* 3. COMPACT CLEAN FOOTER */}
        {/* ==================================================== */}
        <div
          id="site-notice-footer"
          className="p-4 pt-2 shrink-0 space-y-2.5 border-t border-white/5 bg-[#050912]"
        >
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="site-notice-secondary-button"
              onClick={handleDismiss}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer text-center truncate"
            >
              {notice.footer?.secondaryButtonText || 'Close'}
            </button>

            {notice.footer?.primaryButtonText && (
              <button
                type="button"
                id="site-notice-primary-button"
                onClick={handlePrimaryClick}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center truncate shadow-sm ${styles.primaryBtn}`}
              >
                {notice.footer.primaryButtonText}
              </button>
            )}
          </div>

          {/* Don't show again checkbox */}
          {notice.footer?.showDontShowAgain && (
            <label className="flex items-center justify-center gap-1.5 cursor-pointer select-none text-[11px] text-[#94A3B8] hover:text-white transition-colors py-0.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={dontShowAgain}
                onClick={() => setDontShowAgain(!dontShowAgain)}
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                  dontShowAgain
                    ? styles.checkboxAccent
                    : 'border-white/20 bg-black/40 hover:border-white/40'
                }`}
              >
                {dontShowAgain && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>
              <span>Don&apos;t show again today</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
