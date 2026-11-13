import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, FileText, Info, Check, Copy } from 'lucide-react';
import { getCmsLegalPages, DEFAULT_LEGAL_PAGES } from '../lib/firestore/cms';
import type { CmsLegalPages } from '../types/cms';
import { isValidSafeUrl } from '../lib/security';

export type LegalTab = 'about' | 'dmca' | 'disclaimer';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

const renderInlineSafeText = (line: string): React.ReactNode => {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIdx) {
      parts.push(line.slice(lastIdx, match.index));
    }
    const label = match[1];
    const href = match[2].trim();
    const isSafeMailto = href.toLowerCase().startsWith('mailto:') && !href.includes('<');
    if (isValidSafeUrl(href) || isSafeMailto) {
      parts.push(
        <a
          key={`${match.index}-${href}`}
          href={href}
          target={href.startsWith('/') || isSafeMailto ? undefined : '_blank'}
          rel={href.startsWith('/') || isSafeMailto ? undefined : 'noopener noreferrer'}
          className="text-[#1E88FF] hover:text-[#3B9BFF] underline"
        >
          {label}
        </a>
      );
    } else {
      parts.push(label);
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < line.length) {
    parts.push(line.slice(lastIdx));
  }
  return parts.length > 0 ? parts : line;
};

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'about',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [copied, setCopied] = useState(false);
  const [legalPages, setLegalPages] = useState<CmsLegalPages>(DEFAULT_LEGAL_PAGES);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getCmsLegalPages().then((pages) => {
      if (isMounted && pages) {
        setLegalPages(pages);
      }
    });
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCopyEmail = (email: string) => {
    navigator.clipboard?.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const currentContent = legalPages[activeTab] || DEFAULT_LEGAL_PAGES[activeTab] || '';

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3 leading-relaxed text-xs sm:text-sm text-[#CBD5E1]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm font-bold text-[#1E88FF] pt-1">
                {renderInlineSafeText(trimmed.slice(4))}
              </h3>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-base font-bold text-white pt-2 border-b border-white/10 pb-1">
                {renderInlineSafeText(trimmed.slice(3))}
              </h2>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-lg font-bold text-white pt-1">
                {renderInlineSafeText(trimmed.slice(2))}
              </h1>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <li key={idx} className="list-disc ml-4 text-[#94A3B8]">
                {renderInlineSafeText(trimmed.slice(2))}
              </li>
            );
          }
          return (
            <p key={idx} className="text-[#94A3B8] break-words">
              {renderInlineSafeText(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1324] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#94A3B8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#101A30]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#1E88FF]/15 text-[#1E88FF] flex items-center justify-center shrink-0">
              {activeTab === 'about' ? (
                <Info className="w-4 h-4" />
              ) : activeTab === 'dmca' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {activeTab === 'about'
                  ? 'About Platform'
                  : activeTab === 'dmca'
                  ? 'DMCA Policy & Takedown'
                  : 'Disclaimer & Terms'}
              </h2>
              <p className="text-[11px] text-[#94A3B8] truncate">Official platform policies</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-white/10 bg-[#050A14] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['about', 'dmca', 'disclaimer'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#1E88FF] text-white'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                }`}
              >
                {tabKey === 'about' ? 'About Us' : tabKey === 'dmca' ? 'DMCA Notice' : 'Disclaimer'}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]">
          {renderContent(currentContent)}

          <div className="bg-[#101A30] p-4 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
            <div className="space-y-0.5 min-w-0">
              <div className="text-xs font-bold text-white">Contact Webmaster</div>
              <div className="text-xs text-[#94A3B8] truncate">zairoxmax2.0@gmail.com</div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyEmail('zairoxmax2.0@gmail.com')}
              className="h-9 px-3.5 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Email'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
