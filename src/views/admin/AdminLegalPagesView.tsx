import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsLegalPages } from '../../types/cms';
import {
  getCmsLegalPages,
  saveCmsLegalPages,
  logAdminActivity,
} from '../../lib/firestore/cms';
import {
  AdminPageHeader,
  AdminSelect,
  AdminStickySaveBar,
  AdminSkeleton,
} from '../../components/admin';
import {
  FileText,
  ExternalLink,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo2,
  Redo2,
  Eye,
  Code,
  ShieldAlert,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface AdminLegalPagesViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

type LegalPageKey = keyof CmsLegalPages;

interface LegalDef {
  key: LegalPageKey;
  label: string;
  publicPath: string;
  description: string;
}

const LEGAL_PAGES: LegalDef[] = [
  { key: 'dmca', label: 'DMCA Notice', publicPath: '/dmca', description: 'Copyright takedown procedure and designated agent contacts' },
  { key: 'disclaimer', label: 'Disclaimer', publicPath: '/disclaimer', description: 'Non-hosting legal disclosures and third-party media notice' },
  { key: 'terms', label: 'Terms of Service', publicPath: '/terms', description: 'Platform usage terms, conditions, and prohibited activities' },
  { key: 'privacy', label: 'Privacy Policy', publicPath: '/privacy', description: 'Personal data processing, cookie policies, and telemetry' },
  { key: 'about', label: 'About Us', publicPath: '/about', description: 'Zynox brand mission, platform origin, and technical features' },
  { key: 'contact', label: 'Contact Us', publicPath: '/contact', description: 'Official email addresses, Telegram bot, and community channels' },
  { key: 'communityGuidelines', label: 'Community Guidelines', publicPath: '/guidelines', description: 'Comment etiquette, spoiler tagging, and moderation rules' },
];

// Simple, secure client-side markdown to sanitized HTML renderer
function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  // 1. Escape HTML tags
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-white mt-5 mb-2.5 pb-1 border-b border-white/10">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-white mt-6 mb-3 pb-2 border-b border-white/15">$1</h1>');

  // 3. Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-[#1E88FF] pl-3 py-1 my-2 bg-white/5 text-[#CBD5E1] italic text-xs">$1</blockquote>');

  // 4. Bold and Italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em class="italic text-[#E2E8F0]">$1</em>');

  // 5. Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#1E88FF] hover:underline">$1</a>');

  // 6. Lists
  html = html.replace(/^\s*\-\s(.*$)/gim, '<li class="ml-4 list-disc text-xs text-[#94A3B8] my-1">$1</li>');
  html = html.replace(/^\s*\d+\.\s(.*$)/gim, '<li class="ml-4 list-decimal text-xs text-[#94A3B8] my-1">$1</li>');

  // 7. Paragraphs
  html = html.replace(/\n\n+/g, '</p><p class="text-xs text-[#94A3B8] leading-relaxed my-2.5">');

  return `<p class="text-xs text-[#94A3B8] leading-relaxed my-2.5">${html}</p>`;
}

export const AdminLegalPagesView: React.FC<AdminLegalPagesViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [legalData, setLegalData] = useState<CmsLegalPages | null>(null);
  const [selectedKey, setSelectedKey] = useState<LegalPageKey>('dmca');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-page text edits and dirty tracking
  const [textMap, setTextMap] = useState<Record<LegalPageKey, string>>({
    dmca: '',
    disclaimer: '',
    terms: '',
    privacy: '',
    about: '',
    contact: '',
    communityGuidelines: '',
  });
  const [dirtyMap, setDirtyMap] = useState<Record<LegalPageKey, boolean>>({
    dmca: false,
    disclaimer: false,
    terms: false,
    privacy: false,
    about: false,
    contact: false,
    communityGuidelines: false,
  });

  // Editor states
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvancedMarkdown, setShowAdvancedMarkdown] = useState(false);

  // Undo / Redo history stack for active page
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getCmsLegalPages();
      setLegalData(data);
      const initialMap: Record<LegalPageKey, string> = {
        dmca: data.dmca || '',
        disclaimer: data.disclaimer || '',
        terms: data.terms || '',
        privacy: data.privacy || '',
        about: data.about || '',
        contact: data.contact || '',
        communityGuidelines: data.communityGuidelines || '',
      };
      setTextMap(initialMap);
      setHistory([initialMap[selectedKey]]);
      setHistoryIdx(0);
      setDirtyMap({
        dmca: false,
        disclaimer: false,
        terms: false,
        privacy: false,
        about: false,
        contact: false,
        communityGuidelines: false,
      });
    } catch (err) {
      console.error('Failed to load legal pages:', err);
      onShowMessage('Failed to load legal pages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPage = (key: LegalPageKey) => {
    setSelectedKey(key);
    setHistory([textMap[key] || '']);
    setHistoryIdx(0);
    setShowPreview(false);
  };

  const handleTextChange = (val: string) => {
    setTextMap((prev) => ({ ...prev, [selectedKey]: val }));
    setDirtyMap((prev) => ({ ...prev, [selectedKey]: true }));

    // Append to undo history
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIdx + 1);
      return [...sliced, val];
    });
    setHistoryIdx((prev) => prev + 1);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIdx > 0) {
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      const val = history[nextIdx];
      setTextMap((prev) => ({ ...prev, [selectedKey]: val }));
      setDirtyMap((prev) => ({ ...prev, [selectedKey]: true }));
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      const val = history[nextIdx];
      setTextMap((prev) => ({ ...prev, [selectedKey]: val }));
      setDirtyMap((prev) => ({ ...prev, [selectedKey]: true }));
    }
  };

  // Toolbar Formatting helper
  const applyFormat = (prefix: string, suffix = '') => {
    const el = textareaRef.current;
    const current = textMap[selectedKey] || '';
    if (!el) {
      handleTextChange(`${current}\n${prefix}${suffix}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const nextVal = current.substring(0, start) + replacement + current.substring(end);
    handleTextChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 0);
  };

  const handleSave = async () => {
    if (!legalData) return;
    try {
      setSaving(true);
      const updated: CmsLegalPages = {
        ...legalData,
        ...textMap,
      };
      await saveCmsLegalPages(updated);
      setLegalData(updated);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Updated Legal Pages (${selectedKey})`,
        'LegalCMS',
        selectedKey,
        `Page: ${selectedKey}`
      );
      setDirtyMap({
        dmca: false,
        disclaimer: false,
        terms: false,
        privacy: false,
        about: false,
        contact: false,
        communityGuidelines: false,
      });
      onShowMessage(`Saved "${LEGAL_PAGES.find((p) => p.key === selectedKey)?.label}" successfully.`);
    } catch (err: any) {
      console.error('Failed to save legal page:', err);
      onShowMessage(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const activeDef = LEGAL_PAGES.find((p) => p.key === selectedKey) || LEGAL_PAGES[0];
  const isAnyDirty = Object.values(dirtyMap).some(Boolean);

  const selectOptions = LEGAL_PAGES.map((p) => ({
    value: p.key,
    label: `${p.label}${dirtyMap[p.key] ? ' (Unsaved)' : ''}`,
  }));

  return (
    <AdminLayout currentTab="legal" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-24">
        {/* Page Header (Save is in the Sticky Save Bar) */}
        <AdminPageHeader
          title="Legal & Compliance CMS"
          description="Manage Terms, DMCA, Disclaimer, Privacy, and Community Guidelines"
          secondaryActions={[
            {
              label: 'View on site',
              icon: ExternalLink,
              onClick: () => navigate(activeDef.publicPath),
            },
          ]}
        />

        {loading ? (
          <div className="space-y-4">
            <AdminSkeleton variant="card" count={2} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Phone View: AdminSelect Dropdown */}
            <div className="block lg:hidden col-span-12">
              <AdminSelect
                label="Select Legal Policy Document"
                value={selectedKey}
                options={selectOptions}
                onChange={(val) => handleSelectPage(val as LegalPageKey)}
              />
            </div>

            {/* Desktop Left Rail (280px list): 4 Cols on lg */}
            <div className="hidden lg:block lg:col-span-4 bg-[#0B1324] border border-white/10 rounded-[12px] p-2 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-[#94A3B8] uppercase tracking-wider border-b border-white/5 mb-1">
                Policy Documents
              </div>
              {LEGAL_PAGES.map((page) => {
                const isActive = page.key === selectedKey;
                const isDirty = dirtyMap[page.key];
                return (
                  <button
                    key={page.key}
                    type="button"
                    onClick={() => handleSelectPage(page.key)}
                    className={`w-full text-left p-3 rounded-[10px] transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-[#1E88FF]/15 border border-[#1E88FF]/40 text-white'
                        : 'hover:bg-white/5 text-[#CBD5E1] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1E88FF]' : 'text-[#94A3B8]'}`} />
                        <span className="text-xs font-semibold truncate">{page.label}</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] line-clamp-1">{page.description}</p>
                    </div>

                    {isDirty && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5 animate-pulse" title="Unsaved changes" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Editor Right: 8 Cols on lg */}
            <div className="col-span-12 lg:col-span-8 bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              {/* Document Header & Mode Toggles */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{activeDef.label}</h3>
                    {dirtyMap[selectedKey] && (
                      <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full text-[10px] font-semibold">
                        Unsaved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>Auto-applies live timestamp upon saving</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview((prev) => !prev)}
                    className={`h-8 px-3 rounded-[8px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                      showPreview
                        ? 'bg-[#1E88FF] text-white'
                        : 'bg-white/5 hover:bg-white/10 text-[#CBD5E1] border border-white/10'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showPreview ? 'Edit mode' : 'Preview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedMarkdown((prev) => !prev)}
                    className={`h-8 px-3 rounded-[8px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                      showAdvancedMarkdown
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-white/5 hover:bg-white/10 text-[#94A3B8]'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Markdown</span>
                  </button>
                </div>
              </div>

              {/* 44px Formatting Toolbar (Hidden in Preview mode) */}
              {!showPreview && (
                <div className="h-11 bg-[#101A30] border border-white/10 rounded-[10px] px-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => applyFormat('## ')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Heading 2 (## )"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('### ')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Heading 3 (### )"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />

                  <button
                    type="button"
                    onClick={() => applyFormat('**', '**')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('*', '*')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />

                  <button
                    type="button"
                    onClick={() => applyFormat('- ')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Bullet List (- )"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('1. ')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Numbered List (1. )"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('> ')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Quote (> )"
                  >
                    <Quote className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('[Link text](', 'https://...)')}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />

                  <button
                    type="button"
                    disabled={historyIdx <= 0}
                    onClick={handleUndo}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-30"
                    title="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={historyIdx >= history.length - 1}
                    onClick={handleRedo}
                    className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 disabled:opacity-30"
                    title="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Editor Area or Live HTML Preview */}
              {showPreview ? (
                <div className="bg-[#050A14] border border-white/10 rounded-[10px] p-5 min-h-[380px] max-h-[550px] overflow-y-auto">
                  <div
                    className="prose prose-invert max-w-none text-xs text-[#94A3B8]"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(textMap[selectedKey] || ''),
                    }}
                  />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={textMap[selectedKey] || ''}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Write ${activeDef.label} policy content in structured Markdown...`}
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-4 text-xs sm:text-sm text-white font-mono outline-none min-h-[380px] max-h-[550px] resize-y leading-relaxed"
                />
              )}

              <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1">
                <span>{(textMap[selectedKey] || '').length} characters · {(textMap[selectedKey] || '').split(/\s+/).filter(Boolean).length} words</span>
                <span>Active document: {activeDef.publicPath}</span>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Save Bar (Single primary save button) */}
        {isAnyDirty && (
          <AdminStickySaveBar
            message="Unsaved legal policy modifications"
            saveLabel="Save legal policies"
            saving={saving}
            onSave={handleSave}
            onDiscard={loadData}
          />
        )}
      </div>
    </AdminLayout>
  );
};
