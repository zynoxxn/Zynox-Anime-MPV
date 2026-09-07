import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type {
  CmsGenre,
  CmsStatus,
  CmsYear,
  CmsRatingRange,
  CmsType,
  CmsLanguage,
  CmsStudio,
} from '../../types/cms';
import {
  getCmsGenres,
  saveCmsGenre,
  deleteCmsGenre,
  getCmsStatuses,
  saveCmsStatus,
  deleteCmsStatus,
  getCmsYears,
  saveCmsYear,
  deleteCmsYear,
  getCmsRatingRanges,
  saveCmsRatingRange,
  deleteCmsRatingRange,
  getCmsTypes,
  saveCmsType,
  deleteCmsType,
  getCmsLanguages,
  saveCmsLanguage,
  deleteCmsLanguage,
  getCmsStudios,
  saveCmsStudio,
  deleteCmsStudio,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Tag,
  Calendar,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Globe,
  Radio,
  Sliders,
} from 'lucide-react';

interface AdminTaxonomyViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

type TaxonomyTab = 'genres' | 'statuses' | 'years' | 'ratings' | 'types' | 'languages' | 'studios';

export const AdminTaxonomyView: React.FC<AdminTaxonomyViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TaxonomyTab>('genres');
  const [loading, setLoading] = useState(true);

  // Lists
  const [genres, setGenres] = useState<CmsGenre[]>([]);
  const [statuses, setStatuses] = useState<CmsStatus[]>([]);
  const [years, setYears] = useState<CmsYear[]>([]);
  const [ratings, setRatings] = useState<CmsRatingRange[]>([]);
  const [types, setTypes] = useState<CmsType[]>([]);
  const [languages, setLanguages] = useState<CmsLanguage[]>([]);
  const [studios, setStudios] = useState<CmsStudio[]>([]);

  // Modals state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [gList, sList, yList, rList, tList, lList, stList] = await Promise.all([
        getCmsGenres(),
        getCmsStatuses(),
        getCmsYears(),
        getCmsRatingRanges(),
        getCmsTypes(),
        getCmsLanguages(),
        getCmsStudios(),
      ]);
      setGenres(gList);
      setStatuses(sList);
      setYears(yList);
      setRatings(rList);
      setTypes(tList);
      setLanguages(lList);
      setStudios(stList);
    } catch (err) {
      console.error('Failed to load taxonomies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleOpenNew = () => {
    setIsNew(true);
    if (activeTab === 'genres') {
      setEditingItem({ id: '', name: '', slug: '', description: '', displayOrder: genres.length + 1, enabled: true });
    } else if (activeTab === 'statuses') {
      setEditingItem({ id: '', name: '', slug: '', description: '', badgeColor: '#10B981', displayOrder: statuses.length + 1, enabled: true });
    } else if (activeTab === 'years') {
      setEditingItem({ id: '', year: 2027, displayOrder: years.length + 1, enabled: true });
    } else if (activeTab === 'ratings') {
      setEditingItem({ id: `r-${Date.now()}`, label: '8.5+ Excellent', minRating: 8.5, displayOrder: ratings.length + 1, enabled: true });
    } else if (activeTab === 'types') {
      setEditingItem({ id: '', name: '', slug: '', description: '', displayOrder: types.length + 1, enabled: true });
    } else if (activeTab === 'languages') {
      setEditingItem({ id: '', name: '', shortCode: '', badgeName: '', displayOrder: languages.length + 1, enabled: true });
    } else if (activeTab === 'studios') {
      setEditingItem({ id: '', name: '', slug: '', description: '', website: '', enabled: true });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSaving(true);
      const safeName = (editingItem.name || '').toLowerCase().replace(/\s+/g, '-');
      if (activeTab === 'genres') {
        const item = { ...editingItem, id: editingItem.id || editingItem.slug || safeName || `genre-${Date.now()}` };
        await saveCmsGenre(item);
      } else if (activeTab === 'statuses') {
        const item = { ...editingItem, id: editingItem.id || editingItem.slug || safeName || `status-${Date.now()}` };
        await saveCmsStatus(item);
      } else if (activeTab === 'years') {
        const item = { ...editingItem, id: (editingItem.year || new Date().getFullYear()).toString() };
        await saveCmsYear(item);
      } else if (activeTab === 'ratings') {
        await saveCmsRatingRange(editingItem);
      } else if (activeTab === 'types') {
        const item = { ...editingItem, id: editingItem.id || editingItem.slug || safeName || `type-${Date.now()}` };
        await saveCmsType(item);
      } else if (activeTab === 'languages') {
        const item = { ...editingItem, id: editingItem.id || editingItem.shortCode || (editingItem.name || '').toLowerCase() || `lang-${Date.now()}` };
        await saveCmsLanguage(item);
      } else if (activeTab === 'studios') {
        const item = { ...editingItem, id: editingItem.id || editingItem.slug || safeName || `studio-${Date.now()}` };
        await saveCmsStudio(item);
      }

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Saved Taxonomy Item (${activeTab})`,
        activeTab,
        editingItem.id || '',
        JSON.stringify(editingItem)
      );

      onShowMessage(`Saved ${activeTab} item successfully!`);
      setEditingItem(null);
      await loadAll();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setDeleting(true);
      if (activeTab === 'genres') await deleteCmsGenre(itemToDelete.id);
      else if (activeTab === 'statuses') await deleteCmsStatus(itemToDelete.id);
      else if (activeTab === 'years') await deleteCmsYear(itemToDelete.id);
      else if (activeTab === 'ratings') await deleteCmsRatingRange(itemToDelete.id);
      else if (activeTab === 'types') await deleteCmsType(itemToDelete.id);
      else if (activeTab === 'languages') await deleteCmsLanguage(itemToDelete.id);
      else if (activeTab === 'studios') await deleteCmsStudio(itemToDelete.id);

      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Deleted Taxonomy Item (${activeTab})`,
        activeTab,
        itemToDelete.id,
        itemToDelete.name
      );

      onShowMessage(`Deleted "${itemToDelete.name}"`);
      setItemToDelete(null);
      await loadAll();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout currentTab="taxonomy" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Tag className="w-4 h-4" />
              <span>Taxonomies & Categorization CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Metadata, Genres & Filters Manager
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Create, reorder, edit, and toggle all public dropdown filter options with zero hardcoded code.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/30 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New {activeTab.slice(0, -1).toUpperCase()}</span>
          </button>
        </div>

        {/* Taxonomy Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-[#0B1322] border border-white/5 p-2 rounded-2xl">
          {(
            [
              { id: 'genres', label: 'Genres', icon: Tag, count: genres.length },
              { id: 'statuses', label: 'Statuses', icon: Radio, count: statuses.length },
              { id: 'years', label: 'Years', icon: Calendar, count: years.length },
              { id: 'ratings', label: 'Ratings', icon: Sparkles, count: ratings.length },
              { id: 'types', label: 'Types (TV/Movie)', icon: Layers, count: types.length },
              { id: 'languages', label: 'Audio Languages', icon: Globe, count: languages.length },
              { id: 'studios', label: 'Studios', icon: Sliders, count: studios.length },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isCurrent
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-70">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading taxonomy entries...</div>
        ) : (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6">
            <div className="divide-y divide-white/5">
              {/* GENRES */}
              {activeTab === 'genres' &&
                genres.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">/{item.slug}</span>
                        {item.enabled ? (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsNew(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Genre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* STATUSES */}
              {activeTab === 'statuses' &&
                statuses.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: item.badgeColor || '#10B981' }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-[#94A3B8]">{item.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsNew(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Status"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* YEARS */}
              {activeTab === 'years' &&
                years.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white font-mono">{item.year}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {item.enabled ? 'Enabled' : 'Hidden'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.year.toString() })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Year"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* RATINGS */}
              {activeTab === 'ratings' &&
                ratings.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">{item.label}</div>
                      <div className="text-[11px] text-[#94A3B8]">Min Score: {item.minRating}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsNew(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.label })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Rating"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* TYPES */}
              {activeTab === 'types' &&
                types.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">{item.name}</div>
                      <div className="text-[11px] text-[#94A3B8]">{item.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsNew(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Type"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* LANGUAGES */}
              {activeTab === 'languages' &&
                languages.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.name}</span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono font-bold">
                          {item.badgeName}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">Code: {item.shortCode}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsNew(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Language"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

              {/* STUDIOS */}
              {activeTab === 'studios' &&
                studios.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-white">{item.name}</div>
                      <div className="text-[11px] text-[#94A3B8]">{item.description}</div>
                      {item.website && (
                        <a
                          href={item.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[#1683FF] hover:underline"
                        >
                          {item.website}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setIsNew(false);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemToDelete({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        title="Delete Studio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Simple Edit / Add Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#0B1322] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {isNew ? `Add New ${activeTab.slice(0, -1)}` : `Edit ${activeTab.slice(0, -1)}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3">
                {activeTab !== 'years' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Title / Name</label>
                    <input
                      type="text"
                      value={editingItem.name || editingItem.label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'ratings') {
                          setEditingItem({ ...editingItem, label: val });
                        } else {
                          setEditingItem({
                            ...editingItem,
                            name: val,
                            slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                          });
                        }
                      }}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                )}

                {activeTab === 'years' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Year (Number)</label>
                    <input
                      type="number"
                      value={editingItem.year || 2026}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          year: parseInt(e.target.value, 10) || 2026,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                )}

                {activeTab === 'languages' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#94A3B8]">Short Code (e.g. hi, ja, en)</label>
                      <input
                        type="text"
                        value={editingItem.shortCode || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, shortCode: e.target.value })}
                        className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#94A3B8]">Badge Label (e.g. HINDI DUB)</label>
                      <input
                        type="text"
                        value={editingItem.badgeName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, badgeName: e.target.value })}
                        className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'statuses' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Badge Color Hex</label>
                    <input
                      type="text"
                      value={editingItem.badgeColor || '#10B981'}
                      onChange={(e) => setEditingItem({ ...editingItem, badgeColor: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {activeTab === 'ratings' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Minimum Rating Score</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingItem.minRating || 8.0}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          minRating: parseFloat(e.target.value) || 8.0,
                        })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {(activeTab === 'genres' || activeTab === 'types' || activeTab === 'studios') && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Description</label>
                    <textarea
                      rows={2}
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                )}

                {/* Enabled Toggle */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="tax-enabled"
                    checked={editingItem.enabled ?? true}
                    onChange={(e) => setEditingItem({ ...editingItem, enabled: e.target.checked })}
                    className="rounded accent-emerald-500"
                  />
                  <label htmlFor="tax-enabled" className="text-xs font-semibold text-white">
                    Visible & Enabled on Public Site
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Item'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Modal */}
        <ConfirmModal
          isOpen={!!itemToDelete}
          title={`Delete ${activeTab.slice(0, -1)} Item?`}
          message={itemToDelete ? `Are you sure you want to delete "${itemToDelete.name}" from ${activeTab}?` : ''}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Item'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setItemToDelete(null)}
        />
      </div>
    </AdminLayout>
  );
};
