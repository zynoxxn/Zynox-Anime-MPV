import React, { useState } from 'react';
import { getSocialShareLinks } from '../lib/shareUtils';
import { MessageCircle, Twitter, Send, Copy, Check, Share2 } from 'lucide-react';

interface SocialShareButtonsProps {
  title: string;
  url: string;
  variant?: 'inline' | 'modal' | 'floating';
  onCopySuccess?: (msg: string) => void;
}

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  title,
  url,
  variant = 'inline',
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const shareLinks = getSocialShareLinks(title, url);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(shareLinks.fullUrl);
      setCopied(true);
      if (onCopySuccess) {
        onCopySuccess('Link copied to clipboard!');
      }
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.warn('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareLinks.shareText,
          url: shareLinks.fullUrl,
        });
      } catch (err) {
        // Ignored or dismissed
      }
    } else {
      handleCopy(e);
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Share2 className="w-3.5 h-3.5 text-[#00CFFF]" />
          Share:
        </span>

        {/* WhatsApp */}
        <a
          id="btn-share-whatsapp"
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
          title="Share on WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-current" />
          <span>WhatsApp</span>
        </a>

        {/* Twitter */}
        <a
          id="btn-share-twitter"
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2] text-[#1DA1F2] hover:text-white border border-[#1DA1F2]/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
          title="Share on Twitter / X"
        >
          <Twitter className="w-3.5 h-3.5 fill-current" />
          <span>Twitter</span>
        </a>

        {/* Telegram */}
        <a
          id="btn-share-telegram"
          href={shareLinks.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-xl bg-[#229ED9]/10 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
          title="Share on Telegram"
        >
          <Send className="w-3.5 h-3.5 fill-current" />
          <span>Telegram</span>
        </a>

        {/* Copy Link button */}
        <button
          id="btn-share-copy"
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-xl bg-[#081426] hover:bg-[#0B1B32] text-[#94A3B8] hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
          title="Copy Link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Modal variant with rich card buttons
  return (
    <div className="space-y-4">
      {/* 3 Prominent Social Network Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* WhatsApp */}
        <a
          id="modal-share-whatsapp"
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 font-bold text-xs transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>WhatsApp</span>
        </a>

        {/* Twitter */}
        <a
          id="modal-share-twitter"
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#1DA1F2]/15 hover:bg-[#1DA1F2] text-[#1DA1F2] hover:text-white border border-[#1DA1F2]/30 font-bold text-xs transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <Twitter className="w-4 h-4 fill-current" />
          <span>Twitter / X</span>
        </a>

        {/* Telegram */}
        <a
          id="modal-share-telegram"
          href={shareLinks.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9] text-[#229ED9] hover:text-white border border-[#229ED9]/30 font-bold text-xs transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <Send className="w-4 h-4 fill-current" />
          <span>Telegram</span>
        </a>
      </div>

      {/* Copy link input row */}
      <div className="space-y-1.5">
        <label className="text-xs text-[#94A3B8] font-semibold flex items-center justify-between">
          <span>Shareable URL:</span>
          <span className="text-[10px] text-[#64748B]">Click copy or share directly</span>
        </label>
        <div className="flex items-center gap-2 bg-[#050A14] border border-white/10 rounded-xl p-2 px-3 focus-within:border-[#1683FF]/50 transition-colors">
          <input
            type="text"
            readOnly
            value={shareLinks.fullUrl}
            className="bg-transparent text-xs text-zinc-300 w-full outline-none font-mono selection:bg-[#1683FF]/40"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 px-3.5 py-1.5 bg-[#1683FF]/20 hover:bg-[#1683FF]/30 text-[#00CFFF] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied!</span>
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

      {/* System Share (Mobile / Tablet) */}
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-[#00CFFF]" />
          <span>More Apps (System Share Menu)</span>
        </button>
      )}
    </div>
  );
};
