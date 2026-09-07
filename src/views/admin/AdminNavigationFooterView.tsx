import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type {
  CmsNavigationItem,
  CmsFooterConfig,
  FooterColumn,
  SocialLink,
} from '../../types/cms';
import {
  getCmsNavigation,
  saveCmsNavigationItem,
  deleteCmsNavigationItem,
  getCmsFooterConfig,
  saveCmsFooterConfig,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Compass,
  Link,
  MoveUp,
  MoveDown,
  Globe,
  Share2,
} from 'lucide-react';

interface AdminNavigationFooterViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
  initialTab?: 'navigation' | 'footer';
}

export const AdminNavigationFooterView: React.FC<AdminNavigationFooterViewProps> = ({
  navigate,
  onShowMessage,
  initialTab = 'navigation',
}) => {
  const { user } = useAuth();
  const [navItems, setNavItems] = useState<CmsNavigationItem[]>([]);
  const [footerConfig, setFooterConfig] = useState<CmsFooterConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'navigation' | 'footer'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New/Edit Nav modal
  const [editingNav, setEditingNav] = useState<Partial<CmsNavigationItem> | null>(null);
  const [navToDelete, setNavToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isNewNav, setIsNewNav] = useState(false);
  const [deletingNav, setDeletingNav] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [navs, footer] = await Promise.all([getCmsNavigation(), getCmsFooterConfig()]);
      setNavItems(navs);
      setFooterConfig(footer);
    } catch (err) {
      console.error('Failed to load nav & footer config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewNav = () => {
    setEditingNav({
      id: `nav-${Date.now()}`,
      title: 'New Link',
      url: '/browse',
      iconName: 'Compass',
      targetLocation: 'header',
      enabled: true,
      displayOrder: navItems.length + 1,
    });
    setIsNewNav(true);
  };

  const handleSaveNav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNav || !editingNav.title || !editingNav.url) return;

    try {
      setSaving(true);
      const toSave = editingNav as CmsNavigationItem;
      await saveCmsNavigationItem(toSave);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isNewNav ? 'Added Navigation Item' : 'Updated Navigation Item',
        'NavigationCMS',
        toSave.id,
        toSave.title
      );
      onShowMessage(`Navigation item "${toSave.title}" saved!`);
      setEditingNav(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteNav = async () => {
    if (!navToDelete) return;
    try {
      setDeletingNav(true);
      await deleteCmsNavigationItem(navToDelete.id);
      onShowMessage(`Navigation item "${navToDelete.title}" deleted.`);
      setNavToDelete(null);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setDeletingNav(false);
    }
  };

  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerConfig) return;

    try {
      setSaving(true);
      await saveCmsFooterConfig(footerConfig);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated Footer CMS Configuration',
        'FooterCMS',
        'footer-settings',
        footerConfig.copyrightText
      );
      onShowMessage('Footer configuration saved successfully!');
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error saving footer: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout currentTab="navigation-footer" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Navigation & Layout Architecture CMS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Header Menus & Footer Links CMS
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Configure top navigation buttons, footer link columns, copyright notices, and social handles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('navigation')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'navigation'
                  ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                  : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
              }`}
            >
              Header Menus
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('footer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'footer'
                  ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30'
                  : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
              }`}
            >
              Footer Settings
            </button>
          </div>
        </div>

        {/* Tab 1: Navigation Menu */}
        {activeTab === 'navigation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Public Header Links ({navItems.length})
              </div>
              <button
                type="button"
                onClick={handleOpenNewNav}
                className="px-3.5 py-1.5 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-[#1683FF]/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Menu Link</span>
              </button>
            </div>

            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 divide-y divide-white/5">
              {navItems.map((item, i) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-mono text-xs font-bold text-[#94A3B8]">#{i + 1}</span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">
                          {item.url}
                        </span>
                        {item.requiresAuth && (
                          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 rounded">
                            Auth Only
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#94A3B8] mt-0.5">
                        Icon: {item.iconName || 'Default'} • Target: {item.targetLocation}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNav(item);
                        setIsNewNav(false);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNavToDelete({ id: item.id, title: item.title })}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                      title="Delete Menu Link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Footer Settings */}
        {activeTab === 'footer' && footerConfig && (
          <form onSubmit={handleSaveFooter} className="space-y-6">
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">General Footer Information</h3>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">About Summary Text</label>
                <textarea
                  rows={3}
                  value={footerConfig.aboutText || ''}
                  onChange={(e) =>
                    setFooterConfig({ ...footerConfig, aboutText: e.target.value })
                  }
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Copyright Notice Text</label>
                  <input
                    type="text"
                    value={footerConfig.copyrightText || ''}
                    onChange={(e) =>
                      setFooterConfig({ ...footerConfig, copyrightText: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Contact / Support Email</label>
                  <input
                    type="email"
                    value={footerConfig.contactEmail || ''}
                    onChange={(e) =>
                      setFooterConfig({ ...footerConfig, contactEmail: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Telegram Channel URL</label>
                  <input
                    type="url"
                    value={footerConfig.telegramUrl || ''}
                    onChange={(e) =>
                      setFooterConfig({ ...footerConfig, telegramUrl: e.target.value })
                    }
                    placeholder="https://t.me/ZynoxAnime"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">YouTube Channel URL</label>
                  <input
                    type="url"
                    value={(footerConfig as any).youtubeUrl || ''}
                    onChange={(e) =>
                      setFooterConfig({ ...footerConfig, youtubeUrl: e.target.value } as any)
                    }
                    placeholder="https://youtube.com/@neox_xn?si=qUlnuIAFmgaCgtv0"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Instagram Profile URL</label>
                  <input
                    type="url"
                    value={(footerConfig as any).instagramUrl || ''}
                    onChange={(e) =>
                      setFooterConfig({ ...footerConfig, instagramUrl: e.target.value } as any)
                    }
                    placeholder="https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl"
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Discord Community URL</label>
                  <input
                    type="url"
                    value={footerConfig.discordUrl || ''}
                    onChange={(e) =>
                      setFooterConfig({ ...footerConfig, discordUrl: e.target.value })
                    }
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Non-Hosting Disclaimer</label>
                <textarea
                  rows={2}
                  value={footerConfig.disclaimerText || ''}
                  onChange={(e) =>
                    setFooterConfig({ ...footerConfig, disclaimerText: e.target.value })
                  }
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white rounded-xl shadow-lg shadow-[#1683FF]/30 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Footer Settings'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Modal for Navigation Item */}
        {editingNav && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#0B1322] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">
                  {isNewNav ? 'Add Navigation Link' : 'Edit Navigation Link'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingNav(null)}
                  className="text-[#94A3B8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNav} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Link Title</label>
                  <input
                    type="text"
                    value={editingNav.title || ''}
                    onChange={(e) => setEditingNav({ ...editingNav, title: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Destination URL / Path</label>
                  <input
                    type="text"
                    placeholder="e.g. /schedule or /ongoing or https://..."
                    value={editingNav.url || ''}
                    onChange={(e) => setEditingNav({ ...editingNav, url: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Icon Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Compass, Calendar, Tv"
                      value={editingNav.iconName || ''}
                      onChange={(e) => setEditingNav({ ...editingNav, iconName: e.target.value })}
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#94A3B8]">Display Location</label>
                    <select
                      value={editingNav.targetLocation || 'header'}
                      onChange={(e) =>
                        setEditingNav({ ...editingNav, targetLocation: e.target.value as any })
                      }
                      className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#1683FF]"
                    >
                      <option value="header">Header Nav</option>
                      <option value="mobile_menu">Mobile Menu Only</option>
                      <option value="bottom_nav">Bottom Nav</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="nav-auth-only"
                    checked={editingNav.requiresAuth ?? false}
                    onChange={(e) => setEditingNav({ ...editingNav, requiresAuth: e.target.checked })}
                    className="rounded accent-[#1683FF]"
                  />
                  <label htmlFor="nav-auth-only" className="text-xs font-semibold text-white">
                    Requires Signed In User (e.g. Watchlist)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingNav(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-[#94A3B8] rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white rounded-xl shadow-lg shadow-[#1683FF]/30 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Link'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Nav Modal */}
        <ConfirmModal
          isOpen={!!navToDelete}
          title="Delete Header Navigation Link?"
          message={navToDelete ? `Are you sure you want to remove "${navToDelete.title}" from the main website navigation?` : ''}
          confirmLabel={deletingNav ? 'Deleting...' : 'Delete Link'}
          onConfirm={handleConfirmDeleteNav}
          onCancel={() => setNavToDelete(null)}
        />
      </div>
    </AdminLayout>
  );
};
