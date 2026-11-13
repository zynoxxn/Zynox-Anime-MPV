import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileText, Info, Mail, Check, Copy, ArrowLeft, Lock, ScrollText } from 'lucide-react';
import { getCmsLegalPages, DEFAULT_LEGAL_PAGES } from '../lib/firestore/cms';
import type { CmsLegalPages } from '../types/cms';
import { isValidSafeUrl } from '../lib/security';
import { usePageSeo } from '../hooks/usePageSeo';

export type LegalTabKey = 'about' | 'dmca' | 'disclaimer' | 'terms' | 'privacy' | 'contact';

interface LegalViewProps {
  tab: LegalTabKey;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const TAB_TITLES: Record<LegalTabKey, string> = {
  about: 'About Us | ZYNOX ANIME',
  dmca: 'DMCA Policy | ZYNOX ANIME',
  disclaimer: 'Disclaimer | ZYNOX ANIME',
  terms: 'Terms of Service | ZYNOX ANIME',
  privacy: 'Privacy Policy | ZYNOX ANIME',
  contact: 'Contact Us | ZYNOX ANIME',
};

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

export const LegalView: React.FC<LegalViewProps> = ({ tab, navigate, onShowMessage }) => {
  const [copied, setCopied] = useState(false);
  const [legalPages, setLegalPages] = useState<CmsLegalPages>(DEFAULT_LEGAL_PAGES);

  usePageSeo({
    title: TAB_TITLES[tab] || 'Legal Information | ZYNOX ANIME',
    description: `Official ${tab.toUpperCase()} information and platform policies for ZYNOX ANIME.`,
  });

  useEffect(() => {
    let isMounted = true;
    getCmsLegalPages().then((pages) => {
      if (isMounted && pages) {
        setLegalPages(pages);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard?.writeText(email);
    setCopied(true);
    onShowMessage?.('Email copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const currentContent =
    legalPages[tab as keyof CmsLegalPages] || DEFAULT_LEGAL_PAGES[tab as keyof CmsLegalPages] || '';

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3.5 leading-relaxed text-sm text-[#CBD5E1]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1" />;
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm sm:text-base font-bold text-[#1E88FF] pt-2">
                {renderInlineSafeText(trimmed.slice(4))}
              </h3>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2
                key={idx}
                className="text-base sm:text-lg font-bold text-white pt-3 border-b border-white/10 pb-1.5"
              >
                {renderInlineSafeText(trimmed.slice(3))}
              </h2>
            );
          }
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl sm:text-2xl font-black text-white pt-1">
                {renderInlineSafeText(trimmed.slice(2))}
              </h1>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <li key={idx} className="list-disc ml-5 text-[#94A3B8]">
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

  const tabs: { id: LegalTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'about', label: 'About', icon: Info },
    { id: 'dmca', label: 'DMCA', icon: FileText },
    { id: 'disclaimer', label: 'Disclaimer', icon: ShieldAlert },
    { id: 'terms', label: 'Terms', icon: ScrollText },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'contact', label: 'Contact', icon: Mail },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Breadcrumb & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#1E88FF] font-semibold transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-1 bg-[#0B1324] p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/${t.id}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#1E88FF] text-white'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#0B1324] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl space-y-6 text-[#94A3B8]">
        {renderContent(currentContent)}

        <div className="bg-[#101A30] p-4 sm:p-5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-bold text-white">Direct Webmaster Support</div>
            <div className="text-xs text-[#94A3B8] truncate">zairoxmax2.0@gmail.com</div>
          </div>
          <button
            type="button"
            onClick={() => handleCopyEmail('zairoxmax2.0@gmail.com')}
            className="h-9 px-4 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
