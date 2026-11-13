import React, { useEffect, useState, useMemo } from 'react';
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
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminListRow,
  AdminToggle,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
} from '../../components/admin';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  X,
  Layers,
  Calendar,
  Sparkles,
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
      const safeId = editingItem.id || safeName || `item-${Date.now()}`;

      if (activeTab === 'genres') {
        const item: CmsGenre = {
          id: safeId,
          name: editingItem.name,
          slug: editingItem.slug || safeName,
          description: editingItem.description || '',
          displayOrder: Number(editingItem.displayOrder) || 1,
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsGenre(item);
        onShowMessage(`Saved genre "${item.name}".`);
      } else if (activeTab === 'statuses') {
        const item: CmsStatus = {
          id: safeId,
          name: editingItem.name,
          slug: editingItem.slug || safeName,
          description: editingItem.description || '',
          badgeColor: editingItem.badgeColor || '#10B981',
          displayOrder: Number(editingItem.displayOrder) || 1,
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsStatus(item);
        onShowMessage(`Saved status "${item.name}".`);
      } else if (activeTab === 'years') {
        const item: CmsYear = {
          id: safeId || String(editingItem.year),
          year: Number(editingItem.year) || 2026,
          displayOrder: Number(editingItem.displayOrder) || 1,
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsYear(item);
        onShowMessage(`Saved year ${item.year}.`);
      } else if (activeTab === 'ratings') {
        const item: CmsRatingRange = {
          id: safeId,
          label: editingItem.label,
          minRating: Number(editingItem.minRating) || 8.0,
          displayOrder: Number(editingItem.displayOrder) || 1,
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsRatingRange(item);
        onShowMessage(`Saved rating filter "${item.label}".`);
      } else if (activeTab === 'types') {
        const item: CmsType = {
          id: safeId,
          name: editingItem.name,
          slug: editingItem.slug || safeName,
          description: editingItem.description || '',
          displayOrder: Number(editingItem.displayOrder) || 1,
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsType(item);
        onShowMessage(`Saved format "${item.name}".`);
      } else if (activeTab === 'languages') {
        const item: CmsLanguage = {
          id: safeId,
          name: editingItem.name,
          shortCode: editingItem.shortCode || 'HI',
          badgeName: editingItem.badgeName || editingItem.name,
          displayOrder: Number(editingItem.displayOrder) || 1,
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsLanguage(item);
        onShowMessage(`Saved audio option "${item.name}".`);
      } else if (activeTab === 'studios') {
        const item: CmsStudio = {
          id: safeId,
          name: editingItem.name,
          slug: editingItem.slug || safeName,
          description: editingItem.description || '',
          website: editingItem.website || '',
          enabled: editingItem.enabled ?? true,
        };
        await saveCmsStudio(item);
        onShowMessage(`Saved studio "${item.name}".`);
      }

      setEditingItem(null);
      await loadAll();
    } catch (err: any) {
      onShowMessage(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
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

      onShowMessage(`Deleted "${itemToDelete.name}".`);
      setItemToDelete(null);
      await loadAll();
    } catch (err: any) {
      onShowMessage(`Delete error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const getAddActionLabel = () => {
    switch (activeTab) {
      case 'genres': return 'Add genre';
      case 'statuses': return 'Add status';
      case 'years': return 'Add year';
      case 'ratings': return 'Add rating';
      case 'types': return 'Add format';
      case 'languages': return 'Add audio';
      case 'studios': return 'Add studio';
      default: return 'Add item';
    }
  };

  const tabsConfig = [
    { id: 'genres', label: `Genres (${genres.length})` },
    { id: 'statuses', label: `Statuses (${statuses.length})` },
    { id: 'years', label: `Years (${years.length})` },
    { id: 'ratings', label: `Ratings (${ratings.length})` },
    { id: 'types', label: `Formats (${types.length})` },
    { id: 'languages', label: `Audio (${languages.length})` },
    { id: 'studios', label: `Studios (${studios.length})` },
  ];

  return (
    <AdminLayout currentTab="taxonomy" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0">
        {/* Page Header (Primary action label adapts to active tab) */}
        <AdminPageHeader
          title="Taxonomy & Metadata"
          description="Manage catalog genres, statuses, years, ratings, formats, and audio tags"
          primaryAction={{
            label: getAddActionLabel(),
            icon: Plus,
            onClick: handleOpenNew,
          }}
        />

        {/* Taxonomy Segmented Tabs */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-2.5 overflow-x-auto no-scrollbar">
          <AdminSegmentedTabs
            tabs={tabsConfig}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as TaxonomyTab)}
          />
        </div>

        {/* Taxonomy Items List */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              <AdminSkeleton variant="text" count={6} />
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {activeTab === 'genres' && genres.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No genres configured" actionLabel="Add genre" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'genres' &&
                genres.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    meta={`/${item.slug} · Display Order: ${item.displayOrder || 1}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit genre',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete genre',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: item.name }),
                      },
                    ]}
                  />
                ))}

              {activeTab === 'statuses' && statuses.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No statuses configured" actionLabel="Add status" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'statuses' &&
                statuses.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    meta={`Slug: /${item.slug} · Color: ${item.badgeColor || '#10B981'}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit status',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete status',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: item.name }),
                      },
                    ]}
                  />
                ))}

              {activeTab === 'years' && years.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No release years configured" actionLabel="Add year" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'years' &&
                years.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={String(item.year)}
                    meta={`Year tag for catalog filtering · Order: ${item.displayOrder || 1}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit year',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete year',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: String(item.year) }),
                      },
                    ]}
                  />
                ))}

              {activeTab === 'ratings' && ratings.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No rating thresholds configured" actionLabel="Add rating" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'ratings' &&
                ratings.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.label}
                    meta={`Minimum Score: ${item.minRating} · Order: ${item.displayOrder || 1}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit rating',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete rating',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: item.label }),
                      },
                    ]}
                  />
                ))}

              {activeTab === 'types' && types.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No formats configured" actionLabel="Add format" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'types' &&
                types.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    meta={item.description || `Format /${item.slug}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit format',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete format',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: item.name }),
                      },
                    ]}
                  />
                ))}

              {activeTab === 'languages' && languages.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No audio options configured" actionLabel="Add audio" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'languages' &&
                languages.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    meta={`Badge: ${item.badgeName} · Code: ${item.shortCode}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit audio',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete audio',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: item.name }),
                      },
                    ]}
                  />
                ))}

              {activeTab === 'studios' && studios.length === 0 && (
                <div className="p-8">
                  <AdminEmptyState title="No studios configured" actionLabel="Add studio" onAction={handleOpenNew} />
                </div>
              )}
              {activeTab === 'studios' &&
                studios.map((item) => (
                  <AdminListRow
                    key={item.id}
                    id={item.id}
                    title={item.name}
                    meta={item.website ? `${item.website} · /${item.slug}` : `Studio /${item.slug}`}
                    status={item.enabled ? 'live' : 'draft'}
                    onClick={() => {
                      setEditingItem(item);
                      setIsNew(false);
                    }}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit studio',
                        icon: Edit2,
                        onClick: () => {
                          setEditingItem(item);
                          setIsNew(false);
                        },
                      },
                      {
                        id: 'delete',
                        label: 'Delete studio',
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setItemToDelete({ id: item.id, name: item.name }),
                      },
                    ]}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Edit / Create Item Drawer / Modal */}
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-[#0B1324] border border-white/10 rounded-[12px] p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {isNew ? getAddActionLabel() : `Edit ${activeTab.slice(0, -1)}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {activeTab !== 'years' ? (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Name / Label <span className="text-[#1E88FF]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.name || editingItem.label || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeTab === 'ratings') {
                          setEditingItem({ ...editingItem, label: val });
                        } else {
                          setEditingItem({
                            ...editingItem,
                            name: val,
                            slug: editingItem.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                          });
                        }
                      }}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Release Year <span className="text-[#1E88FF]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1950"
                      max="2035"
                      value={editingItem.year || 2026}
                      onChange={(e) => setEditingItem({ ...editingItem, year: parseInt(e.target.value, 10) || 2026 })}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white font-mono outline-none"
                    />
                  </div>
                )}

                {editingItem.slug !== undefined && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={editingItem.slug || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm font-mono text-white outline-none"
                    />
                  </div>
                )}

                {activeTab === 'ratings' && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Minimum Rating Score (e.g. 8.5)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={editingItem.minRating || 8.0}
                      onChange={(e) => setEditingItem({ ...editingItem, minRating: parseFloat(e.target.value) || 0 })}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                    />
                  </div>
                )}

                {activeTab === 'languages' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1.5">
                        Badge Text (e.g. HIN)
                      </label>
                      <input
                        type="text"
                        value={editingItem.badgeName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, badgeName: e.target.value })}
                        className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white mb-1.5">
                        Short Code (e.g. hi)
                      </label>
                      <input
                        type="text"
                        value={editingItem.shortCode || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, shortCode: e.target.value })}
                        className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'studios' && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={editingItem.website || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, website: e.target.value })}
                      placeholder="https://..."
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm font-mono text-white outline-none"
                    />
                  </div>
                )}

                {editingItem.description !== undefined && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Description / Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-white/5">
                  <AdminToggle
                    checked={editingItem.enabled ?? true}
                    onChange={(checked) => setEditingItem({ ...editingItem, enabled: checked })}
                    label="Enabled in Public Filters"
                    description="If turned off, this tag will be hidden from public filter dropdowns."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="h-10 px-4 rounded-[10px] border border-white/10 hover:border-white/20 text-[#CBD5E1] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(itemToDelete)}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete "${itemToDelete?.name}"?`}
          consequence="This item will be removed from your catalog taxonomies."
          confirmLabel="Delete"
          isLoading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
