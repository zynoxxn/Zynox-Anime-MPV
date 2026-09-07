import React, { useState } from 'react';
import { X, Check, Copy, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, title, url }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: fullUrl,
        });
      } catch (e) {
        // User cancelled or not supported
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#07111F] border border-white/[0.08] hover:border-[#1683FF]/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Share2 className="w-5 h-5 text-[#00CFFF]" />
            <span>Share Anime</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-xs text-[#94A3B8] mb-1.5 font-medium">Title</p>
          <p className="text-sm font-semibold text-white truncate">{title}</p>
        </div>

        <div>
          <p className="text-xs text-[#94A3B8] mb-1.5 font-medium">Link</p>
          <div className="flex items-center gap-2 bg-[#050A14] border border-white/10 rounded-xl p-2 px-3">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="bg-transparent text-xs text-zinc-300 w-full outline-none font-mono selection:bg-[#1683FF]/40"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 px-3 py-1.5 bg-[#1683FF]/20 hover:bg-[#1683FF]/30 text-[#00CFFF] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-2.5 bg-[#1683FF] hover:bg-[#2196FF] text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1683FF]/25"
          >
            <Share2 className="w-4 h-4" />
            <span>Open System Share Menu</span>
          </button>
        )}
      </div>
    </div>
  );
};
