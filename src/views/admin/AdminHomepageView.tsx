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
  AdminPageHeader,
  AdminSelect,
  AdminToggle,
  AdminStatusBadge,
  AdminStickySaveBar,
  AdminSkeleton,
  AdminEmptyState,
} from '../../components/admin';
import {
  Sliders,
  MoveUp,
  MoveDown,
  Save,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  EyeOff,
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
  const [expandedSectionIdx, setExpandedSectionIdx] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [secList, settings] = await Promise.all([
        getCmsHomepageSections(),
        getCmsSiteSettings(),
      ]);
      setSections(secList);
      setSiteSettings(settings);
      setIsDirty(false);
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

    const updated = newSections.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    setSections(updated);
    setIsDirty(true);
  };

  const handleToggleEnable = (index: number) => {
    const newSections = [...sections];
    newSections[index].enabled = !newSections[index].enabled;
    setSections(newSections);
    setIsDirty(true);
  };

  const handleChangeField = (index: number, field: keyof CmsHomepageSection, value: any) => {
    const newSections = [...sections];
    (newSections[index] as any)[field] = value;
    setSections(newSections);
    setIsDirty(true);
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
      setIsDirty(false);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error saving homepage layout: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const sourceLabels: Record<HomepageContentSource, string> = {
    featured: 'Featured Anime',
    trending: 'Trending Anime',
    popular: 'Popular Anime',
    latest_episodes: 'Latest Released Episodes',
    ongoing: 'Currently Airing (Ongoing)',
    upcoming: 'Upcoming Releases',
    completed: 'Completed Anime',
    recommended: 'Recommended Picks',
    recently_added: 'Recently Added',
    top_rated: 'Top Rated Anime',
    seasonal: 'Seasonal Anime',
    genres: 'By Genre Showcase',
    manual: 'Manual Selection',
  };

  return (
    <AdminLayout currentTab="homepage" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-24">
        {/* Page Header (Save is in the Sticky Save Bar) */}
        <AdminPageHeader
          title="Homepage Sections & Layout"
          description="Arrange homepage sections, display orders, algorithms, and layouts"
        />

        {/* Discovery Algorithms Configuration */}
        {siteSettings && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1E88FF]" />
              <h2 className="text-sm font-semibold text-white">
                Discovery Algorithms Configuration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <AdminSelect
                  label="Trending Anime Calculation"
                  value={siteSettings.trendingMode || 'auto'}
                  onChange={(val) => {
                    setSiteSettings({
                      ...siteSettings,
                      trendingMode: val as 'auto' | 'manual',
                    });
                    setIsDirty(true);
                  }}
                  options={[
                    { value: 'auto', label: 'Automatic (Views & Recency Formula)' },
                    { value: 'manual', label: 'Manual (Admin Trending Flag Only)' },
                  ]}
                  sheetTitle="Trending Mode"
                />
              </div>

              <div>
                <AdminSelect
                  label="Popular Anime Calculation"
                  value={siteSettings.popularMode || 'auto'}
                  onChange={(val) => {
                    setSiteSettings({
                      ...siteSettings,
                      popularMode: val as 'auto' | 'manual',
                    });
                    setIsDirty(true);
                  }}
                  options={[
                    { value: 'auto', label: 'Automatic (Rating Score Ranking)' },
                    { value: 'manual', label: 'Manual (Admin Popular Flag Only)' },
                  ]}
                  sheetTitle="Popular Mode"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reorderable Section Stack */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1E88FF]" />
              <h3 className="text-sm font-semibold text-white">
                Homepage Sections Stack (Top to Bottom)
              </h3>
            </div>
            <span className="text-xs text-[#94A3B8]">
              {sections.filter((s) => s.enabled).length} of {sections.length} sections active
            </span>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : sections.length === 0 ? (
            <div className="p-8">
              <AdminEmptyState title="No homepage sections configured" />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {sections.map((section, index) => {
                const isExpanded = expandedSectionIdx === index;

                return (
                  <div
                    key={section.id || section.key}
                    className="p-3 sm:p-4 space-y-3 hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Main Row */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Reorder buttons + Order # + Title + Source badge */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up')}
                            className="p-1 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === sections.length - 1}
                            onClick={() => handleMove(index, 'down')}
                            className="p-1 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="w-6 text-center font-mono font-bold text-xs text-[#94A3B8] shrink-0">
                          #{index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {section.title}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-white/5 text-[#94A3B8] border border-white/10 shrink-0 hidden sm:inline">
                              {sourceLabels[section.contentSource] || section.contentSource}
                            </span>
                          </div>
                          {section.subtitle && (
                            <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                              {section.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Toggle + Expand chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        <AdminStatusBadge
                          status={section.enabled ? 'live' : 'draft'}
                          className="shrink-0"
                        />

                        <button
                          type="button"
                          onClick={() => handleToggleEnable(index)}
                          className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title={section.enabled ? 'Disable section' : 'Enable section'}
                        >
                          {section.enabled ? (
                            <Eye className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-[#64748B]" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSectionIdx((cur) => (cur === index ? null : index))
                          }
                          className="w-8 h-8 rounded-[6px] hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse config' : 'Expand config'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Configuration Drawer */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#101A30]/50 p-3.5 rounded-[10px]">
                        <div>
                          <label className="block text-xs font-semibold text-white mb-1.5">
                            Section Title
                          </label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => handleChangeField(index, 'title', e.target.value)}
                            className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-white mb-1.5">
                            Subtitle / Description
                          </label>
                          <input
                            type="text"
                            value={section.subtitle || ''}
                            onChange={(e) => handleChangeField(index, 'subtitle', e.target.value)}
                            placeholder="Optional subtitle..."
                            className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs text-white outline-none"
                          />
                        </div>

                        <div>
                          <AdminSelect
                            label="Content Source"
                            value={section.contentSource}
                            onChange={(val) =>
                              handleChangeField(
                                index,
                                'contentSource',
                                val as HomepageContentSource
                              )
                            }
                            options={[
                              { value: 'featured', label: 'Featured Anime' },
                              { value: 'trending', label: 'Trending Anime' },
                              { value: 'popular', label: 'Top Rated Anime' },
                              { value: 'latest_episodes', label: 'Latest Released Episodes' },
                              { value: 'ongoing', label: 'Currently Airing (Ongoing)' },
                              { value: 'upcoming', label: 'Upcoming Releases' },
                              { value: 'completed', label: 'Completed Anime' },
                              { value: 'recommended', label: 'Recommended Picks' },
                            ]}
                            sheetTitle="Source"
                          />
                        </div>

                        <div>
                          <AdminSelect
                            label="Layout"
                            value={section.layout}
                            onChange={(val) =>
                              handleChangeField(index, 'layout', val as HomepageLayout)
                            }
                            options={[
                              { value: 'carousel', label: 'Horizontal Carousel' },
                              { value: 'grid', label: 'Responsive Grid' },
                              { value: 'ranked', label: 'Ranked Leaderboard Cards' },
                              { value: 'slider', label: 'Spotlight Slider' },
                            ]}
                            sheetTitle="Display Layout"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-white mb-1.5">
                            Max Items
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={section.maxItems || 10}
                            onChange={(e) =>
                              handleChangeField(
                                index,
                                'maxItems',
                                parseInt(e.target.value, 10) || 10
                              )
                            }
                            className="w-full h-10 bg-[#0B1324] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs text-white outline-none font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Save Bar */}
        {isDirty && (
          <AdminStickySaveBar
            message="Unsaved homepage layout adjustments"
            saveLabel="Save layout"
            saving={saving}
            onSave={handleSaveAll}
            onDiscard={loadData}
          />
        )}
      </div>
    </AdminLayout>
  );
};
