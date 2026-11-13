import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsSeoConfig } from '../../types/cms';
import {
  getCmsSeoConfig,
  saveCmsSeoConfig,
  logAdminActivity,
  DEFAULT_SEO_SETTINGS,
} from '../../lib/firestore/cms';
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminImageUploader,
  AdminStickySaveBar,
  AdminSkeleton,
  AdminCopyInput,
} from '../../components/admin';
import {
  Globe,
  Tag,
  Share2,
  ShieldCheck,
  Search,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
} from 'lucide-react';

interface AdminSeoSettingsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

type SeoTabId = 'general' | 'templates' | 'social' | 'verification' | 'preview';

const SEO_TABS = [
  { id: 'general' as const, label: 'General & Meta', icon: Globe },
  { id: 'templates' as const, label: 'Title Templates', icon: Tag },
  { id: 'social' as const, label: 'Open Graph & Social', icon: Share2 },
  { id: 'verification' as const, label: 'Search Verification', icon: ShieldCheck },
  { id: 'preview' as const, label: 'Google SERP Preview', icon: Search },
];

export const AdminSeoSettingsView: React.FC<AdminSeoSettingsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SeoTabId>('general');
  const [seo, setSeo] = useState<CmsSeoConfig>(DEFAULT_SEO_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Preview device mode
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Input refs for cursor-based variable chip insertion
  const animeTitleRef = useRef<HTMLTextAreaElement>(null);
  const epTitleRef = useRef<HTMLTextAreaElement>(null);
  const dlTitleRef = useRef<HTMLTextAreaElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getCmsSeoConfig();
      setSeo({
        ...DEFAULT_SEO_SETTINGS,
        ...data,
      });
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to load SEO configuration:', err);
      onShowMessage('Failed to load SEO configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateSeoField = (field: keyof CmsSeoConfig, value: any) => {
    setSeo((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const insertVariable = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    field: keyof CmsSeoConfig,
    token: string
  ) => {
    const el = ref.current;
    const currentVal = (seo[field] as string) || '';
    if (!el) {
      updateSeoField(field, `${currentVal} ${token}`.trim());
      return;
    }
    const start = el.selectionStart || currentVal.length;
    const end = el.selectionEnd || currentVal.length;
    const nextVal = currentVal.substring(0, start) + token + currentVal.substring(end);
    updateSeoField(field, nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveCmsSeoConfig(seo);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated SEO & Metadata Configuration',
        'SEO',
        'global',
        seo.homepageTitle
      );
      onShowMessage('SEO configuration saved successfully.');
      setIsDirty(false);
    } catch (err: any) {
      console.error('Failed to save SEO config:', err);
      onShowMessage(`Error saving SEO: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Character counter helpers
  const titleLen = (seo.homepageTitle || '').length;
  const getTitleStatus = (len: number) => {
    if (len === 0) return { color: 'text-[#94A3B8]', hint: 'Empty' };
    if (len <= 60) return { color: 'text-emerald-400', hint: 'Optimal (≤ 60 chars)' };
    if (len <= 70) return { color: 'text-amber-400', hint: 'Slightly long (61–70 chars)' };
    return { color: 'text-rose-400', hint: 'Too long (> 70 chars, will be truncated)' };
  };

  const descLen = (seo.homepageDescription || '').length;
  const getDescStatus = (len: number) => {
    if (len === 0) return { color: 'text-[#94A3B8]', hint: 'Empty' };
    if (len >= 140 && len <= 160) return { color: 'text-emerald-400', hint: 'Optimal (140–160 chars)' };
    if ((len >= 120 && len < 140) || (len > 160 && len <= 180)) {
      return { color: 'text-amber-400', hint: 'Acceptable (120–180 chars)' };
    }
    return { color: 'text-rose-400', hint: len < 120 ? 'Too short (< 120 chars)' : 'Too long (> 180 chars)' };
  };

  const titleStatus = getTitleStatus(titleLen);
  const descStatus = getDescStatus(descLen);

  // Live evaluated examples for templates
  const sampleAnimeTitle = (seo.animeTitleTemplate || 'Watch {title} in Hindi Dub & English Sub HD — {siteName}')
    .replace('{title}', 'Solo Leveling Season 2')
    .replace('{siteName}', 'ZYNOX')
    .replace('{epNumber}', '1');

  const sampleEpTitle = (seo.episodeTitleTemplate || 'Watch {title} Episode {epNumber} [Hindi Dub] 1080p — {siteName}')
    .replace('{title}', 'Solo Leveling')
    .replace('{epNumber}', '12')
    .replace('{siteName}', 'ZYNOX');

  const sampleDlTitle = (seo.downloadTitleTemplate || 'Download {title} [Hindi Dub] All Episodes 720p 1080p HD Zip — {siteName}')
    .replace('{title}', 'Attack on Titan Final Season')
    .replace('{siteName}', 'ZYNOX')
    .replace('{epNumber}', '1');

  return (
    <AdminLayout currentTab="seo" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-24">
        {/* Page Header (Save is in the Sticky Save Bar) */}
        <AdminPageHeader
          title="SEO & Metadata Configuration"
          description="Manage Google search engine indexing, social share preview cards, and title templates"
        />

        {/* Segmented Tabs */}
        <AdminSegmentedTabs
          tabs={SEO_TABS}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        {loading ? (
          <div className="space-y-4">
            <AdminSkeleton variant="card" count={2} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ================= TAB 1: GENERAL & META ================= */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                    <Globe className="w-4 h-4 text-[#1E88FF]" />
                    <h3 className="text-sm font-semibold text-white">Homepage Meta Tags</h3>
                  </div>

                  {/* Homepage Title with Char Counter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white">
                        Homepage Meta Title <span className="text-[#1E88FF]">*</span>
                      </label>
                      <span className={`text-[11px] font-mono ${titleStatus.color}`}>
                        {titleLen} / 60 · {titleStatus.hint}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={seo.homepageTitle || ''}
                      onChange={(e) => updateSeoField('homepageTitle', e.target.value)}
                      placeholder="Watch Anime in Hindi Dub & English Subtitles HD — ZYNOX"
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                    />
                  </div>

                  {/* Homepage Description with Char Counter */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-white">
                        Homepage Meta Description <span className="text-[#1E88FF]">*</span>
                      </label>
                      <span className={`text-[11px] font-mono ${descStatus.color}`}>
                        {descLen} / 160 · {descStatus.hint}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={seo.homepageDescription || ''}
                      onChange={(e) => updateSeoField('homepageDescription', e.target.value)}
                      placeholder="Stream and download high quality Japanese anime in Hindi Dub, Multi Audio and English Subtitles in 1080p Ultra HD on ZYNOX anime."
                      className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none resize-y min-h-[80px]"
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Meta Keywords (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={seo.homepageKeywords || ''}
                      onChange={(e) => updateSeoField('homepageKeywords', e.target.value)}
                      placeholder="anime hindi dub, watch anime online, download anime 1080p, zynox anime"
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                    />
                  </div>

                  {/* Canonical URL */}
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Canonical Site Base URL
                    </label>
                    <input
                      type="url"
                      value={seo.canonicalUrl || ''}
                      onChange={(e) => updateSeoField('canonicalUrl', e.target.value)}
                      placeholder="https://zynox.in"
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm font-mono text-white outline-none"
                    />
                  </div>
                </div>

                {/* Robots.txt Card */}
                <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#1E88FF]" />
                      <h3 className="text-sm font-semibold text-white">Robots.txt Directive</h3>
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">Crawlers & Indexing</span>
                  </div>
                  <textarea
                    rows={4}
                    value={
                      seo.robotsTxt ||
                      'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/*\nSitemap: https://zynox.in/sitemap.xml'
                    }
                    onChange={(e) => updateSeoField('robotsTxt', e.target.value)}
                    className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-xs font-mono text-[#94A3B8] outline-none"
                  />
                </div>
              </div>
            )}

            {/* ================= TAB 2: TEMPLATES ================= */}
            {activeTab === 'templates' && (
              <div className="space-y-5">
                <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Dynamic Page Title Templates</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Use chips below each field to inject live tokens like anime title, episode number, or site name.
                    </p>
                  </div>

                  {/* Anime Detail Title Template */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">
                        Anime Detail Page Title Template
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => insertVariable(animeTitleRef, 'animeTitleTemplate', '{title}')}
                          className="px-2 py-0.5 bg-[#1E88FF]/15 hover:bg-[#1E88FF]/25 border border-[#1E88FF]/30 text-[#1E88FF] rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;title&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => insertVariable(animeTitleRef, 'animeTitleTemplate', '{siteName}')}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;siteName&#125;
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={animeTitleRef}
                      rows={2}
                      value={seo.animeTitleTemplate || ''}
                      onChange={(e) => updateSeoField('animeTitleTemplate', e.target.value)}
                      placeholder="Watch {title} in Hindi Dub & English Sub HD — {siteName}"
                      className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white font-mono outline-none resize-y"
                    />
                    <div className="p-2.5 bg-[#050A14] border border-white/5 rounded-[8px] text-xs text-[#94A3B8]">
                      <span className="text-white font-semibold">Live Preview: </span>
                      <span className="text-[#1E88FF]">{sampleAnimeTitle}</span>
                    </div>
                  </div>

                  {/* Episode Watch Title Template */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">
                        Episode Player Title Template
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => insertVariable(epTitleRef, 'episodeTitleTemplate', '{title}')}
                          className="px-2 py-0.5 bg-[#1E88FF]/15 hover:bg-[#1E88FF]/25 border border-[#1E88FF]/30 text-[#1E88FF] rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;title&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => insertVariable(epTitleRef, 'episodeTitleTemplate', '{epNumber}')}
                          className="px-2 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;epNumber&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => insertVariable(epTitleRef, 'episodeTitleTemplate', '{siteName}')}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;siteName&#125;
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={epTitleRef}
                      rows={2}
                      value={seo.episodeTitleTemplate || ''}
                      onChange={(e) => updateSeoField('episodeTitleTemplate', e.target.value)}
                      placeholder="Watch {title} Episode {epNumber} [Hindi Dub] 1080p — {siteName}"
                      className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white font-mono outline-none resize-y"
                    />
                    <div className="p-2.5 bg-[#050A14] border border-white/5 rounded-[8px] text-xs text-[#94A3B8]">
                      <span className="text-white font-semibold">Live Preview: </span>
                      <span className="text-[#1E88FF]">{sampleEpTitle}</span>
                    </div>
                  </div>

                  {/* Download Page Title Template */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white">
                        Download Page Title Template
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => insertVariable(dlTitleRef, 'downloadTitleTemplate', '{title}')}
                          className="px-2 py-0.5 bg-[#1E88FF]/15 hover:bg-[#1E88FF]/25 border border-[#1E88FF]/30 text-[#1E88FF] rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;title&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() => insertVariable(dlTitleRef, 'downloadTitleTemplate', '{siteName}')}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-md text-[11px] font-mono cursor-pointer transition-colors"
                        >
                          + &#123;siteName&#125;
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={dlTitleRef}
                      rows={2}
                      value={seo.downloadTitleTemplate || ''}
                      onChange={(e) => updateSeoField('downloadTitleTemplate', e.target.value)}
                      placeholder="Download {title} [Hindi Dub] All Episodes 720p 1080p HD Zip — {siteName}"
                      className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white font-mono outline-none resize-y"
                    />
                    <div className="p-2.5 bg-[#050A14] border border-white/5 rounded-[8px] text-xs text-[#94A3B8]">
                      <span className="text-white font-semibold">Live Preview: </span>
                      <span className="text-[#1E88FF]">{sampleDlTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: SOCIAL & OPEN GRAPH ================= */}
            {activeTab === 'social' && (
              <div className="space-y-5">
                <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                    <Share2 className="w-4 h-4 text-[#1E88FF]" />
                    <h3 className="text-sm font-semibold text-white">Open Graph & Twitter Card Image</h3>
                  </div>

                  <p className="text-xs text-[#94A3B8]">
                    This fallback image appears when your website homepage is shared on Telegram, Discord, WhatsApp, or Twitter. Recommended size: 1200 × 630 px.
                  </p>

                  <AdminImageUploader
                    label="Default Social Share Image (1200 × 630)"
                    type="banner"
                    aspectRatio="16:9"
                    currentUrl={seo.defaultOgImage || seo.defaultSocialImage || ''}
                    onUrlChange={(url) => {
                      updateSeoField('defaultOgImage', url);
                      updateSeoField('defaultSocialImage', url);
                    }}
                    recommendedText="1200 × 630 px · WEBP, JPG or PNG"
                  />

                  <div className="pt-2 border-t border-white/5">
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Twitter / X Publisher Handle
                    </label>
                    <input
                      type="text"
                      value={seo.twitterHandle || ''}
                      onChange={(e) => updateSeoField('twitterHandle', e.target.value)}
                      placeholder="@ZynoxAnime"
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: SEARCH VERIFICATION ================= */}
            {activeTab === 'verification' && (
              <div className="space-y-5">
                <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                    <ShieldCheck className="w-4 h-4 text-[#1E88FF]" />
                    <h3 className="text-sm font-semibold text-white">Search Console Webmaster Verification</h3>
                  </div>

                  <p className="text-xs text-[#94A3B8]">
                    Paste the verification tokens provided by search engine consoles to verify domain ownership.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-white">
                          Google Search Console Verification Token
                        </label>
                        <span className="text-[11px] text-[#94A3B8]">meta tag content only</span>
                      </div>
                      <input
                        type="text"
                        value={seo.googleSiteVerification || ''}
                        onChange={(e) => updateSeoField('googleSiteVerification', e.target.value)}
                        placeholder="e.g. 7q8b9c... or google-site-verification token"
                        className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-xs font-mono text-white outline-none"
                      />
                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        Format: google-site-verification value from &lt;meta name=&quot;google-site-verification&quot; content=&quot;...&quot; /&gt;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <label className="block text-xs font-semibold text-white mb-1.5">
                        Bing Webmaster Verification Code
                      </label>
                      <input
                        type="text"
                        value={seo.bingSiteVerification || ''}
                        onChange={(e) => updateSeoField('bingSiteVerification', e.target.value)}
                        placeholder="e.g. 32-character Bing verification hex string"
                        className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-xs font-mono text-white outline-none"
                      />
                    </div>

                    <div className="pt-2 border-t border-white/5">
                      <label className="block text-xs font-semibold text-white mb-1.5">
                        Yandex Verification Code
                      </label>
                      <input
                        type="text"
                        value={seo.yandexVerification || ''}
                        onChange={(e) => updateSeoField('yandexVerification', e.target.value)}
                        placeholder="Yandex webmaster token"
                        className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-xs font-mono text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 5: GOOGLE SERP PREVIEW ================= */}
            {activeTab === 'preview' && (
              <div className="space-y-5">
                <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#1E88FF]" />
                      <h3 className="text-sm font-semibold text-white">Google Search Result Snippet Preview</h3>
                    </div>

                    {/* Desktop / Mobile Switch */}
                    <div className="flex items-center bg-[#050A14] border border-white/10 rounded-[8px] p-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`h-7 px-2.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                          previewDevice === 'desktop'
                            ? 'bg-[#1E88FF] text-white'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <Monitor className="w-3 h-3" />
                        <span>Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`h-7 px-2.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                          previewDevice === 'mobile'
                            ? 'bg-[#1E88FF] text-white'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Mobile</span>
                      </button>
                    </div>
                  </div>

                  {/* Google Card Representation */}
                  <div className="p-4 sm:p-6 bg-[#202124] border border-[#3c4043] rounded-[12px] max-w-2xl text-left shadow-lg">
                    {/* Breadcrumbs / URL bar */}
                    <div className="flex items-center gap-2 text-xs text-[#bdc1c6] mb-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#1E88FF] text-white flex items-center justify-center text-[10px] font-bold">
                        Z
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs text-white font-medium">Zynox Anime</div>
                        <div className="text-[11px] text-[#9aa0a6] truncate font-mono">
                          {seo.canonicalUrl || 'https://zynox.in'}
                        </div>
                      </div>
                    </div>

                    {/* Blue Title */}
                    <h3 className="text-[#8ab4f8] hover:underline cursor-pointer text-base sm:text-lg font-medium leading-snug tracking-normal line-clamp-2">
                      {seo.homepageTitle || 'Watch Anime in Hindi Dub & English Subtitles HD — ZYNOX'}
                    </h3>

                    {/* Grey Description */}
                    <p className="text-[#bdc1c6] text-xs sm:text-sm mt-1 leading-relaxed line-clamp-2">
                      {seo.homepageDescription ||
                        'Stream and download high quality Japanese anime in Hindi Dub, Multi Audio and English Subtitles in 1080p Ultra HD on ZYNOX anime.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sticky Save Bar (Single primary action) */}
        {isDirty && (
          <AdminStickySaveBar
            message="Unsaved SEO configuration changes"
            saveLabel="Save SEO configuration"
            saving={saving}
            onSave={handleSave}
            onDiscard={loadData}
          />
        )}
      </div>
    </AdminLayout>
  );
};
