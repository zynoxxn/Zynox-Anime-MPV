import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type {
  CmsHomepageSection,
  HomepageLayout,
  HomepageContentSource,
  CmsSiteSettings,
} from '../../types/cms';
import {
  getCmsHomepageSections,
  saveCmsHomepageSections,
  getCmsSiteSettings,
  saveCmsSiteSettings,
  logAdminActivity,
} from '../../lib/firestore/cms';
import {
  Sliders,
  MoveUp,
  MoveDown,
  Eye,
  EyeOff,
  Save,
  Sparkles,
  Layers,
  LayoutGrid,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';

interface AdminHomepageViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminHomepageView: React.FC<AdminHomepageViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [sections, setSections] = useState<CmsHomepageSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<CmsSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [secList, settings] = await Promise.all([
        getCmsHomepageSections(),
        getCmsSiteSettings(),
      ]);
      setSections(secList);
      setSiteSettings(settings);
    } catch (err) {
      console.error('Failed to load homepage config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    // Update displayOrder
    const updated = newSections.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    setSections(updated);
  };

  const handleToggleEnable = (index: number) => {
    const newSections = [...sections];
    newSections[index].enabled = !newSections[index].enabled;
    setSections(newSections);
  };

  const handleChangeField = (index: number, field: keyof CmsHomepageSection, value: any) => {
    const newSections = [...sections];
    (newSections[index] as any)[field] = value;
    setSections(newSections);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await saveCmsHomepageSections(sections);
      if (siteSettings) {
        await saveCmsSiteSettings(siteSettings);
      }

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated Homepage Sections & Layout',
        'HomepageCMS',
        'homepage-layout',
        `Reordered ${sections.length} homepage sections`
      );

      onShowMessage('Homepage layout and sections saved successfully!');
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error saving homepage layout: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout currentTab="homepage" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Layout & Section Reorder CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Homepage Layout & Sections Manager
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Rearrange the order of homepage sections, change row layouts, rename titles, and toggle sections on/off.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-lg shadow-purple-600/30 rounded-xl transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save All Layout Changes'}</span>
          </button>
        </div>

        {/* Algorithm Modes (Trending & Popular) */}
        {siteSettings && (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Discovery Algorithms Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#050A14] border border-white/5 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-white block">Trending Anime Mode</label>
                <p className="text-[11px] text-[#94A3B8]">
                  Auto: computed by views & release dates. Manual: only animes flagged with Trending tag.
                </p>
                <select
                  value={siteSettings.trendingMode || 'auto'}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      trendingMode: e.target.value as 'auto' | 'manual',
                    })
                  }
                  className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                >
                  <option value="auto">Automatic (Views & Recency Formula)</option>
                  <option value="manual">Manual (Admin Trending Flag Only)</option>
                </select>
              </div>

              <div className="bg-[#050A14] border border-white/5 p-4 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-white block">Popular Anime Mode</label>
                <p className="text-[11px] text-[#94A3B8]">
                  Auto: ordered by rating score. Manual: only animes flagged with Popular flag.
                </p>
                <select
                  value={siteSettings.popularMode || 'auto'}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      popularMode: e.target.value as 'auto' | 'manual',
                    })
                  }
                  className="w-full bg-[#0B1322] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                >
                  <option value="auto">Automatic (Rating Score Ranking)</option>
                  <option value="manual">Manual (Admin Popular Flag Only)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Section List (Reorderable) */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading homepage layout...</div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider px-1">
              Homepage Sections Stack (Top to Bottom)
            </div>

            {sections.map((section, index) => (
              <div
                key={section.id || section.key}
                className={`bg-[#0B1322] border rounded-2xl p-4 sm:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  section.enabled ? 'border-white/10' : 'border-rose-500/20 bg-rose-500/5 opacity-60'
                }`}
              >
                {/* Reorder Buttons & Index */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === sections.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="w-6 text-center font-mono font-bold text-sm text-[#94A3B8]">
                    #{index + 1}
                  </span>

                  {/* Title & Subtitle inputs */}
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleChangeField(index, 'title', e.target.value)}
                      className="bg-[#050A14] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-purple-500 w-full"
                    />
                    <input
                      type="text"
                      placeholder="Optional Subtitle / Description"
                      value={section.subtitle || ''}
                      onChange={(e) => handleChangeField(index, 'subtitle', e.target.value)}
                      className="bg-[#050A14] border border-white/5 rounded-lg px-2.5 py-0.5 text-[11px] text-[#94A3B8] outline-none focus:border-purple-500 w-full"
                    />
                  </div>
                </div>

                {/* Section Configuration Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Content Source */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block">
                      Content Source
                    </label>
                    <select
                      value={section.contentSource}
                      onChange={(e) =>
                        handleChangeField(
                          index,
                          'contentSource',
                          e.target.value as HomepageContentSource
                        )
                      }
                      className="bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white outline-none focus:border-purple-500"
                    >
                      <option value="featured">Featured Anime</option>
                      <option value="trending">Trending Anime</option>
                      <option value="popular">Top Rated Anime</option>
                      <option value="latest_episodes">Latest Released Episodes</option>
                      <option value="ongoing">Currently Airing (Ongoing)</option>
                      <option value="upcoming">Upcoming Releases</option>
                      <option value="completed">Completed Anime</option>
                      <option value="recommended">Recommended Picks</option>
                    </select>
                  </div>

                  {/* Layout Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block">
                      Display Layout
                    </label>
                    <select
                      value={section.layout}
                      onChange={(e) =>
                        handleChangeField(index, 'layout', e.target.value as HomepageLayout)
                      }
                      className="bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white outline-none focus:border-purple-500"
                    >
                      <option value="carousel">Horizontal Carousel</option>
                      <option value="grid">Responsive Grid</option>
                      <option value="ranked">Ranked Leaderboard Cards</option>
                      <option value="slider">Spotlight Slider</option>
                    </select>
                  </div>

                  {/* Max Items */}
                  <div className="space-y-1 w-20">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block">
                      Max Items
                    </label>
                    <input
                      type="number"
                      value={section.maxItems || 10}
                      onChange={(e) =>
                        handleChangeField(index, 'maxItems', parseInt(e.target.value, 10) || 10)
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Enable / Disable toggle button */}
                  <button
                    type="button"
                    onClick={() => handleToggleEnable(index)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all mt-4 md:mt-0 ${
                      section.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {section.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{section.enabled ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
