import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsSeoConfig } from '../../types/cms';
import type { Anime } from '../../types/anime';
import {
  getCmsSeoConfig,
  saveCmsSeoConfig,
  logAdminActivity,
  DEFAULT_SEO_SETTINGS,
} from '../../lib/firestore/cms';
import { getPublishedAnimes, updateAnime } from '../../lib/firestore/anime';
import {
  generateAnimeSeoMetadata,
  generateAnimeGoogleTags,
  generateSitemapXml,
  generateRobotsTxt,
} from '../../lib/seo';
import {
  Globe,
  Save,
  Search,
  CheckCircle2,
  Share2,
  Code,
  Tag,
  Copy,
  Check,
  FileCode,
  Sparkles,
  Download,
  Smartphone,
  Monitor,
  ExternalLink,
  Layers,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface AdminSeoSettingsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

type SeoTab = 'settings' | 'simulator' | 'auto_tags' | 'sitemap';

export const AdminSeoSettingsView: React.FC<AdminSeoSettingsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SeoTab>('settings');
  const [seo, setSeo] = useState<CmsSeoConfig | null>(null);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auto Tags Generator State
  const [selectedAnimeId, setSelectedAnimeId] = useState<string>('');
  const [generatorMode, setGeneratorMode] = useState<'download' | 'detail' | 'episode'>('download');
  const [generatorEpisodeNum, setGeneratorEpisodeNum] = useState<number>(1);
  const [copiedTags, setCopiedTags] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [applyingToAnime, setApplyingToAnime] = useState(false);

  // SERP Simulator State
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [customSerpTitle, setCustomSerpTitle] = useState('');
  const [customSerpDesc, setCustomSerpDesc] = useState('');

  // Sitemap state
  const [generatedSitemap, setGeneratedSitemap] = useState<string>('');
  const [copiedSitemap, setCopiedSitemap] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, animeList] = await Promise.all([
        getCmsSeoConfig(),
        getPublishedAnimes(),
      ]);

      const mergedSeo = {
        ...DEFAULT_SEO_SETTINGS,
        ...data,
      };
      setSeo(mergedSeo);
      setAnimes(animeList);

      if (animeList.length > 0 && !selectedAnimeId) {
        setSelectedAnimeId(animeList[0].id || '');
      }

      setCustomSerpTitle(mergedSeo.homepageTitle || DEFAULT_SEO_SETTINGS.homepageTitle);
      setCustomSerpDesc(mergedSeo.homepageDescription || DEFAULT_SEO_SETTINGS.homepageDescription);

      // Generate initial sitemap preview
      const sitemap = generateSitemapXml(animeList);
      setGeneratedSitemap(sitemap);
    } catch (err) {
      console.error('Failed to load SEO config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!seo) return;

    try {
      setSaving(true);
      await saveCmsSeoConfig(seo);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated Global SEO & Meta Configuration',
        'SEO_CMS',
        'seo-config',
        seo.homepageTitle || seo.defaultTitle
      );
      onShowMessage('SEO and Meta tags saved successfully!');
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Selected Anime for Auto Tag generation
  const selectedAnime = useMemo(() => {
    return animes.find((a) => a.id === selectedAnimeId) || animes[0] || null;
  }, [animes, selectedAnimeId]);

  // Dynamic tags generated for selected anime
  const generatedSeo = useMemo(() => {
    if (!selectedAnime) return null;
    return generateAnimeSeoMetadata(selectedAnime, {
      isDownload: generatorMode === 'download',
      episodeNumber: generatorMode === 'episode' ? generatorEpisodeNum : undefined,
      siteName: 'ZYNOX ANIME',
    });
  }, [selectedAnime, generatorMode, generatorEpisodeNum]);

  const generatedGoogleTags = useMemo(() => {
    if (!selectedAnime) return [];
    return generateAnimeGoogleTags(selectedAnime, {
      isDownload: generatorMode === 'download',
      episodeNumber: generatorMode === 'episode' ? generatorEpisodeNum : undefined,
    });
  }, [selectedAnime, generatorMode, generatorEpisodeNum]);

  const handleCopyTags = () => {
    if (generatedGoogleTags.length === 0) return;
    navigator.clipboard.writeText(generatedGoogleTags.join(', '));
    setCopiedTags(true);
    onShowMessage('Google Search tags copied to clipboard!');
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleCopySchema = () => {
    if (!generatedSeo?.schemaJson) return;
    navigator.clipboard.writeText(JSON.stringify(generatedSeo.schemaJson, null, 2));
    setCopiedSchema(true);
    onShowMessage('Schema.org JSON-LD copied to clipboard!');
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleApplyToAnime = async () => {
    if (!selectedAnime?.id || !generatedSeo) return;
    try {
      setApplyingToAnime(true);
      await updateAnime(selectedAnime.id, {
        seoTitle: generatedSeo.title,
        seoDescription: generatedSeo.description,
        seoKeywords: generatedGoogleTags.join(', '),
        keywords: generatedGoogleTags,
      });
      onShowMessage(`SEO tags successfully written to "${selectedAnime.title}"!`);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Failed to apply tags: ${err.message}`);
    } finally {
      setApplyingToAnime(false);
    }
  };

  const handleCopySitemap = () => {
    if (!generatedSitemap) return;
    navigator.clipboard.writeText(generatedSitemap);
    setCopiedSitemap(true);
    onShowMessage('Sitemap XML copied to clipboard!');
    setTimeout(() => setCopiedSitemap(false), 2000);
  };

  const handleDownloadSitemap = () => {
    if (!generatedSitemap) return;
    const blob = new Blob([generatedSitemap], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowMessage('Downloaded sitemap.xml successfully!');
  };

  if (loading || !seo) {
    return (
      <AdminLayout currentTab="seo" navigate={navigate} onShowMessage={onShowMessage}>
        <div className="py-20 text-center text-xs text-[#94A3B8]">Loading SEO parameters...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentTab="seo" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>Search Engine Optimization & Google Traffic</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              SEO & Auto Google Search Tags
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Boost organic traffic with dynamic Hindi Dubbed titles, rich snippets, Google Search Console tags, and automated anime keyword tags.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-lg shadow-rose-500/30 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                : 'bg-[#0B1322] text-[#94A3B8] hover:text-white border border-white/5'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>General SEO & Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'simulator'
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                : 'bg-[#0B1322] text-[#94A3B8] hover:text-white border border-white/5'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Google SERP Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auto_tags')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'auto_tags'
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                : 'bg-[#0B1322] text-[#94A3B8] hover:text-white border border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto Google Tags Tool</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sitemap')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'sitemap'
                ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                : 'bg-[#0B1322] text-[#94A3B8] hover:text-white border border-white/5'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Sitemap.xml & Robots.txt</span>
          </button>
        </div>

        {/* TAB 1: GENERAL SETTINGS & TEMPLATES */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Dynamic Title Templates */}
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1683FF]/10 border border-[#1683FF]/20 flex items-center justify-center text-[#1683FF]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Dynamic Page Title Templates</h3>
                  <p className="text-xs text-[#94A3B8]">
                    Variables: <code className="text-rose-400 font-mono">{"{title}"}</code>, <code className="text-rose-400 font-mono">{"{siteName}"}</code>, <code className="text-rose-400 font-mono">{"{epNumber}"}</code>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Anime Download Page Title Format
                  </label>
                  <input
                    type="text"
                    value={
                      seo.downloadTitleTemplate ||
                      'Download {title} [Hindi Dubbed] All Episodes 720p 1080p HD Batch Zip — {siteName}'
                    }
                    onChange={(e) =>
                      setSeo({ ...seo, downloadTitleTemplate: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                  <span className="text-[10px] text-emerald-400 block">
                    Example: Download Naruto Shippuden [Hindi Dubbed] All Episodes 720p 1080p HD Batch Zip — ZYNOX ANIME
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Anime Details Streaming Page Title Format
                  </label>
                  <input
                    type="text"
                    value={
                      seo.animeTitleTemplate ||
                      'Watch {title} in Hindi Dub & English Sub (All Episodes HD) — {siteName}'
                    }
                    onChange={(e) =>
                      setSeo({ ...seo, animeTitleTemplate: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Watch Episode Page Title Format
                  </label>
                  <input
                    type="text"
                    value={
                      seo.episodeTitleTemplate ||
                      'Watch {title} Episode {epNumber} [Hindi Dub & Sub] 1080p HD Online — {siteName}'
                    }
                    onChange={(e) =>
                      setSeo({ ...seo, episodeTitleTemplate: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>
            </div>

            {/* Main Homepage SEO */}
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-[#1683FF]" />
                <span>Homepage Search Defaults</span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Homepage SEO Title</label>
                  <input
                    type="text"
                    value={seo.homepageTitle || seo.defaultTitle || ''}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        homepageTitle: e.target.value,
                        defaultTitle: e.target.value,
                      })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Title Suffix</label>
                  <input
                    type="text"
                    value={seo.titleSuffix || '— ZYNOX ANIME'}
                    onChange={(e) => setSeo({ ...seo, titleSuffix: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Homepage Meta Description</label>
                  <textarea
                    rows={3}
                    value={seo.homepageDescription || seo.defaultDescription || ''}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        homepageDescription: e.target.value,
                        defaultDescription: e.target.value,
                      })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF] resize-none"
                  />
                  <div className="flex justify-between text-[10px] text-[#94A3B8]">
                    <span>Recommended: 140 - 160 characters for optimal Google display</span>
                    <span className={(seo.homepageDescription?.length || 0) > 160 ? 'text-amber-400' : 'text-emerald-400'}>
                      {seo.homepageDescription?.length || 0} / 160 chars
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Target Keywords (Comma separated)</label>
                  <input
                    type="text"
                    value={
                      Array.isArray(seo.keywords)
                        ? seo.keywords.join(', ')
                        : seo.homepageKeywords || ''
                    }
                    onChange={(e) => {
                      const list = e.target.value.split(',').map((s) => s.trim());
                      setSeo({
                        ...seo,
                        keywords: list,
                        homepageKeywords: e.target.value,
                      });
                    }}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>
            </div>

            {/* Social Share / Open Graph */}
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Open Graph & Social Previews</span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Default Social Share Banner URL</label>
                  <input
                    type="url"
                    value={seo.defaultOgImage || seo.ogImage || ''}
                    onChange={(e) =>
                      setSeo({
                        ...seo,
                        defaultOgImage: e.target.value,
                        ogImage: e.target.value,
                      })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Twitter / X Handle</label>
                  <input
                    type="text"
                    placeholder="@zynoxanimes"
                    value={seo.twitterHandle || ''}
                    onChange={(e) => setSeo({ ...seo, twitterHandle: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>
            </div>

            {/* Webmaster Verification */}
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Google Search Console Verification</span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Google Site Verification Token
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. google-site-verification=abc123xyz"
                    value={seo.googleSiteVerification || ''}
                    onChange={(e) => setSeo({ ...seo, googleSiteVerification: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#1683FF] font-mono"
                  />
                  <span className="text-[10px] text-[#94A3B8]">
                    Paste the verification code from Google Search Console HTML tag method. It will automatically be injected into all pages.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE GOOGLE SERP SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Device Mode:</span>
                <button
                  type="button"
                  onClick={() => setSerpDevice('desktop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    serpDevice === 'desktop'
                      ? 'bg-[#1683FF] text-white'
                      : 'bg-white/5 text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSerpDevice('mobile')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    serpDevice === 'mobile'
                      ? 'bg-[#1683FF] text-white'
                      : 'bg-white/5 text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>

              <span className="text-xs text-[#94A3B8]">
                Simulates real Google Search click card appearance
              </span>
            </div>

            {/* Test Input Fields */}
            <div className="bg-[#0B1322] border border-white/5 p-5 rounded-2xl space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#94A3B8]">
                  <span>Test Snippet Title</span>
                  <span className={customSerpTitle.length > 60 ? 'text-amber-400' : 'text-emerald-400'}>
                    {customSerpTitle.length} / 60 characters
                  </span>
                </div>
                <input
                  type="text"
                  value={customSerpTitle}
                  onChange={(e) => setCustomSerpTitle(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#94A3B8]">
                  <span>Test Snippet Meta Description</span>
                  <span className={customSerpDesc.length > 160 ? 'text-amber-400' : 'text-emerald-400'}>
                    {customSerpDesc.length} / 160 characters
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={customSerpDesc}
                  onChange={(e) => setCustomSerpDesc(e.target.value)}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF] resize-none"
                />
              </div>
            </div>

            {/* Realistic Google SERP Card Preview */}
            <div className="bg-[#202124] border border-white/10 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-xs text-[#9AA0A6] border-b border-white/10 pb-3">
                <Search className="w-3.5 h-3.5 text-[#8AB4F8]" />
                <span>Google Search Preview (Dark Mode)</span>
              </div>

              <div className={`space-y-2 ${serpDevice === 'mobile' ? 'max-w-md mx-auto bg-[#171717] p-4 rounded-2xl' : ''}`}>
                {/* Google URL Header */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1683FF] flex items-center justify-center text-[10px] font-black text-white">
                    Z
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#E8EAED] font-medium leading-none">
                      ZYNOX ANIME
                    </span>
                    <span className="text-[11px] text-[#9AA0A6] truncate">
                      https://zynoxanime.com &gt; anime &gt; download
                    </span>
                  </div>
                </div>

                {/* SERP Click Title */}
                <h3 className="text-base sm:text-lg text-[#8AB4F8] hover:underline cursor-pointer font-medium leading-snug">
                  {customSerpTitle || 'Watch Anime in Hindi Dub & English Sub in 1080p HD — ZYNOX ANIME'}
                </h3>

                {/* Rating Rich Snippet */}
                <div className="flex items-center gap-2 text-xs text-[#BDC1C6]">
                  <span className="text-amber-400">★★★★★</span>
                  <span className="font-bold">4.9</span>
                  <span className="text-[#9AA0A6]">(2,419 reviews)</span>
                  <span className="text-[#9AA0A6]">· Free · 1080p Full HD</span>
                </div>

                {/* Snippet Description */}
                <p className="text-xs sm:text-sm text-[#BDC1C6] leading-relaxed">
                  {customSerpDesc ||
                    'Stream and download your favorite anime series online in Multi Audio (Hindi Dub, English Sub) in crystal clear 1080p HD. Zero buffering and batch zip links.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUTO GOOGLE TAGS GENERATOR & TOOL */}
        {activeTab === 'auto_tags' && (
          <div className="space-y-6">
            {/* Selector Bar */}
            <div className="bg-[#0B1322] border border-white/5 p-6 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Auto Google Search Tags Engine</span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Select an anime to generate optimized Google organic search tags, download titles, and Schema.org metadata.
                  </p>
                </div>

                {/* Apply Directly Button */}
                <button
                  type="button"
                  onClick={handleApplyToAnime}
                  disabled={applyingToAnime || !selectedAnime}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30 self-start sm:self-auto"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{applyingToAnime ? 'Applying...' : 'Apply Directly to Anime'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Anime Dropdown */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-[#94A3B8]">Choose Anime:</label>
                  <select
                    value={selectedAnimeId}
                    onChange={(e) => setSelectedAnimeId(e.target.value)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    {animes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} {a.audioLanguage ? `(${a.audioLanguage})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mode Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Page Intent:</label>
                  <select
                    value={generatorMode}
                    onChange={(e) => setGeneratorMode(e.target.value as any)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#1683FF]"
                  >
                    <option value="download">Download Page (Batch Zip / Mega)</option>
                    <option value="detail">Anime Detail / Streaming Page</option>
                    <option value="episode">Episode Watch Page</option>
                  </select>
                </div>
              </div>

              {generatorMode === 'episode' && (
                <div className="space-y-1 max-w-xs">
                  <label className="text-xs font-bold text-[#94A3B8]">Episode Number:</label>
                  <input
                    type="number"
                    min={1}
                    value={generatorEpisodeNum}
                    onChange={(e) => setGeneratorEpisodeNum(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              )}
            </div>

            {/* Generated Results Preview */}
            {generatedSeo && (
              <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-5">
                {/* Generated Title & Copy */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">Generated Google Search Title:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSeo.title);
                        onShowMessage('Title copied!');
                      }}
                      className="text-[11px] text-[#1683FF] hover:underline cursor-pointer"
                    >
                      Copy Title
                    </button>
                  </div>
                  <div className="p-3 bg-[#050A14] border border-white/5 rounded-xl text-xs font-bold text-white select-all">
                    {generatedSeo.title}
                  </div>
                </div>

                {/* Generated Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">Generated Meta Description:</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSeo.description);
                        onShowMessage('Description copied!');
                      }}
                      className="text-[11px] text-[#1683FF] hover:underline cursor-pointer"
                    >
                      Copy Description
                    </button>
                  </div>
                  <div className="p-3 bg-[#050A14] border border-white/5 rounded-xl text-xs text-[#CBD5E1] leading-relaxed select-all">
                    {generatedSeo.description}
                  </div>
                </div>

                {/* Generated High-Conversion Search Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#1683FF]" />
                      <span className="text-xs font-bold text-white">
                        Google Search Tags & High Intent Keywords ({generatedGoogleTags.length}):
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyTags}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors border border-white/10"
                    >
                      {copiedTags ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#94A3B8]" />
                          <span>Copy All Tags</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-4 bg-[#050A14] border border-white/5 rounded-2xl max-h-48 overflow-y-auto">
                    {generatedGoogleTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-[#0B1322] border border-white/10 text-[#CBD5E1] px-2.5 py-1 rounded-lg hover:border-[#1683FF]/40 hover:text-white transition-colors select-all"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Schema.org Structured Data Viewer */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#94A3B8]">
                      Generated Schema.org JSON-LD (Rich Google Snippets):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySchema}
                      className="text-[11px] text-[#1683FF] hover:underline cursor-pointer"
                    >
                      {copiedSchema ? 'Copied!' : 'Copy JSON-LD'}
                    </button>
                  </div>
                  <pre className="p-3 bg-[#050A14] border border-white/5 rounded-xl text-[11px] font-mono text-emerald-400 max-h-40 overflow-y-auto select-all">
                    {JSON.stringify(generatedSeo.schemaJson, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SITEMAP.XML & ROBOTS.TXT */}
        {activeTab === 'sitemap' && (
          <div className="space-y-6">
            {/* Sitemap Info Card */}
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#1683FF]" />
                    <span>Live Google Sitemap.xml Generator</span>
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Generates standardized XML sitemap of all anime pages, download mirrors, and static URLs.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCopySitemap}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                  >
                    {copiedSitemap ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>Copy XML</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSitemap}
                    className="px-3.5 py-2 bg-[#1683FF] hover:bg-[#0066ff] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-[#1683FF]/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download sitemap.xml</span>
                  </button>
                </div>
              </div>

              {/* Sitemap Code Viewer */}
              <div className="space-y-1">
                <pre className="p-4 bg-[#050A14] border border-white/5 rounded-2xl text-[11px] font-mono text-[#CBD5E1] max-h-72 overflow-y-auto leading-relaxed select-all">
                  {generatedSitemap}
                </pre>
              </div>

              <div className="flex items-center gap-2 pt-2 text-xs text-[#94A3B8]">
                <ExternalLink className="w-3.5 h-3.5 text-[#1683FF]" />
                <span>
                  Submit your sitemap URL to{' '}
                  <a
                    href="https://search.google.com/search-console"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1683FF] hover:underline"
                  >
                    Google Search Console
                  </a>{' '}
                  to index your site within 24-48 hours.
                </span>
              </div>
            </div>

            {/* Robots.txt Card */}
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>robots.txt Configuration</span>
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Crawl Directives</label>
                <textarea
                  rows={6}
                  value={seo.robotsTxt || generateRobotsTxt()}
                  onChange={(e) => setSeo({ ...seo, robotsTxt: e.target.value })}
                  className="w-full bg-[#050A14] border border-white/10 rounded-2xl p-4 text-xs font-mono text-white outline-none focus:border-[#1683FF] resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
