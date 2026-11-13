import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type {
  CmsNavigationItem,
  CmsFooterConfig,
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
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminListRow,
  AdminSelect,
  AdminToggle,
  AdminConfirmDialog,
  AdminStickySaveBar,
  AdminEmptyState,
  AdminSkeleton,
  AdminCopyInput,
} from '../../components/admin';
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Compass,
  Link as LinkIcon,
  MoveUp,
  MoveDown,
  Globe,
  Share2,
  RefreshCw,
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
  const [isFooterDirty, setIsFooterDirty] = useState(false);

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
      setIsFooterDirty(false);
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

  const handleSaveFooter = async () => {
    if (!footerConfig) return;

    try {
      setSaving(true);
      await saveCmsFooterConfig(footerConfig);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated Footer CMS Configuration',
        'FooterCMS',
        'footer-config',
        `Updated footer text & social links`
      );
      onShowMessage('Footer configuration saved successfully!');
      setIsFooterDirty(false);
      await loadData();
    } catch (err: any) {
      onShowMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveNav = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= navItems.length) return;

    const copy = [...navItems];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const reordered = copy.map((item, i) => ({ ...item, displayOrder: i + 1 }));
    setNavItems(reordered);

    try {
      await Promise.all(reordered.map((item) => saveCmsNavigationItem(item)));
      onShowMessage('Updated link order.');
    } catch {
      onShowMessage('Failed to update navigation order.');
    }
  };

  const updateFooterField = (field: keyof CmsFooterConfig, value: any) => {
    if (!footerConfig) return;
    const next: CmsFooterConfig = { ...footerConfig, [field]: value };
    if (field === 'description') next.aboutText = value;
    if (field === 'aboutText') next.description = value;
    if (field === 'disclaimer') next.disclaimerText = value;
    if (field === 'disclaimerText') next.disclaimer = value;
    setFooterConfig(next);
    setIsFooterDirty(true);
  };

  const updateSocialLink = (platform: string, url: string) => {
    if (!footerConfig) return;
    const current = footerConfig.socialLinks || [];
    const idx = current.findIndex((s) => s.platform === platform);
    let updated: SocialLink[];

    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], url };
    } else {
      updated = [...current, { platform, url, enabled: true }];
    }

    setFooterConfig({ ...footerConfig, socialLinks: updated });
    setIsFooterDirty(true);
  };

  return (
    <AdminLayout currentTab="navigation" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-24">
        {/* Page Header */}
        <AdminPageHeader
          title="Navigation & Footer"
          description="Configure top header navigation menus, bottom mobile nav, and footer links"
          primaryAction={
            activeTab === 'navigation'
              ? {
                  label: 'Add menu link',
                  icon: Plus,
                  onClick: handleOpenNewNav,
                }
              : undefined
          }
        />

        {/* Segmented Tabs (Header menu · Footer) */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-2.5 max-w-xs">
          <AdminSegmentedTabs
            tabs={[
              { id: 'navigation', label: `Header Menu (${navItems.length})` },
              { id: 'footer', label: 'Footer Config' },
            ]}
            activeTab={activeTab}
            onChange={(t) => setActiveTab(t as any)}
          />
        </div>

        {/* TAB 1: NAVIGATION MENU LINKS */}
        {activeTab === 'navigation' && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">
                  Main Header Navigation Menu Links ({navItems.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleOpenNewNav}
                className="h-8 px-2.5 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add link</span>
              </button>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                <AdminSkeleton variant="text" count={5} />
              </div>
            ) : navItems.length === 0 ? (
              <div className="p-8">
                <AdminEmptyState
                  icon={Compass}
                  title="No navigation links configured"
                  description="Add custom navigation items to the header top-bar."
                  actionLabel="Add link"
                  onAction={handleOpenNewNav}
                />
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {navItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-white/[0.01]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveNav(index, 'up')}
                          className="p-1 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-20 cursor-pointer"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === navItems.length - 1}
                          onClick={() => handleMoveNav(index, 'down')}
                          className="p-1 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white disabled:opacity-20 cursor-pointer"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-8 h-8 rounded-[8px] bg-white/5 border border-white/10 flex items-center justify-center text-[#1E88FF] shrink-0">
                        <LinkIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {item.title}
                          </span>
                          <span className="text-[11px] font-mono text-[#94A3B8] truncate">
                            {item.url}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#64748B] uppercase tracking-wider">
                          Target: {item.targetLocation || 'header'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <AdminToggle
                        checked={item.enabled ?? true}
                        onChange={async (checked) => {
                          const updated = { ...item, enabled: checked };
                          await saveCmsNavigationItem(updated);
                          setNavItems((prev) =>
                            prev.map((n) => (n.id === item.id ? updated : n))
                          );
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setEditingNav(item);
                          setIsNewNav(false);
                        }}
                        className="w-8 h-8 rounded hover:bg-white/10 text-[#CBD5E1] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit link"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setNavToDelete({ id: item.id, title: item.title })}
                        className="w-8 h-8 rounded hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FOOTER CONFIGURATION */}
        {activeTab === 'footer' && footerConfig && (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-white/5">
              <Globe className="w-4 h-4 text-[#1E88FF]" />
              <h3 className="text-sm font-semibold text-white">
                Public Website Footer Settings
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Footer Brand Name / Logo Text
                </label>
                <input
                  type="text"
                  value={footerConfig.brandName || 'ZYNOX ANIME'}
                  onChange={(e) => updateFooterField('brandName', e.target.value)}
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Footer Description / Tagline
                </label>
                <textarea
                  rows={2}
                  value={footerConfig.description || ''}
                  onChange={(e) => updateFooterField('description', e.target.value)}
                  placeholder="Watch Japanese anime series and movies with Hindi Dub & English Subtitles."
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Copyright Notice
                </label>
                <input
                  type="text"
                  value={footerConfig.copyrightText || '© 2026 Zynox Anime. All rights reserved.'}
                  onChange={(e) => updateFooterField('copyrightText', e.target.value)}
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Legal Disclaimer
                </label>
                <textarea
                  rows={2}
                  value={footerConfig.disclaimer || ''}
                  onChange={(e) => updateFooterField('disclaimer', e.target.value)}
                  placeholder="Zynox does not store any files on our server. All content is provided by non-affiliated third parties."
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-xs text-[#94A3B8] outline-none"
                />
              </div>

              {/* Social Links */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#1E88FF]" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Community & Social Links
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                      Telegram Channel
                    </label>
                    <input
                      type="text"
                      value={footerConfig.socialLinks?.find((s) => s.platform === 'telegram')?.url || ''}
                      onChange={(e) => updateSocialLink('telegram', e.target.value)}
                      placeholder="https://t.me/ZynoxAnime"
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                      Discord Server
                    </label>
                    <input
                      type="text"
                      value={footerConfig.socialLinks?.find((s) => s.platform === 'discord')?.url || ''}
                      onChange={(e) => updateSocialLink('discord', e.target.value)}
                      placeholder="https://discord.gg/..."
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                      X / Twitter
                    </label>
                    <input
                      type="text"
                      value={footerConfig.socialLinks?.find((s) => s.platform === 'twitter')?.url || ''}
                      onChange={(e) => updateSocialLink('twitter', e.target.value)}
                      placeholder="https://x.com/..."
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8] mb-1">
                      Reddit
                    </label>
                    <input
                      type="text"
                      value={footerConfig.socialLinks?.find((s) => s.platform === 'reddit')?.url || ''}
                      onChange={(e) => updateSocialLink('reddit', e.target.value)}
                      placeholder="https://reddit.com/r/..."
                      className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs font-mono text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Save Bar for Footer */}
        {activeTab === 'footer' && isFooterDirty && (
          <AdminStickySaveBar
            message="Unsaved footer configuration changes"
            saveLabel="Save footer"
            saving={saving}
            onSave={handleSaveFooter}
            onDiscard={loadData}
          />
        )}

        {/* New / Edit Navigation Link Modal */}
        {editingNav && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-[#0B1324] border border-white/10 rounded-[12px] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {isNewNav ? 'Add Navigation Link' : 'Edit Navigation Link'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingNav(null)}
                  className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNav} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Link Label <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNav.title || ''}
                    onChange={(e) => setEditingNav({ ...editingNav, title: e.target.value })}
                    placeholder="e.g. Schedule"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Target URL Path <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingNav.url || ''}
                    onChange={(e) => setEditingNav({ ...editingNav, url: e.target.value })}
                    placeholder="/schedule or https://..."
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm font-mono text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <AdminSelect
                      label="Menu Target"
                      value={editingNav.targetLocation || 'header'}
                      onChange={(val) => setEditingNav({ ...editingNav, targetLocation: val as any })}
                      options={[
                        { value: 'header', label: 'Top Header Bar' },
                        { value: 'mobile_drawer', label: 'Mobile Drawer' },
                        { value: 'both', label: 'Both Header & Mobile' },
                      ]}
                      sheetTitle="Menu Placement"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingNav.displayOrder || 1}
                      onChange={(e) => setEditingNav({ ...editingNav, displayOrder: parseInt(e.target.value, 10) || 1 })}
                      className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5">
                  <AdminToggle
                    checked={editingNav.enabled ?? true}
                    onChange={(checked) => setEditingNav({ ...editingNav, enabled: checked })}
                    label="Enable in Public Navigation"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingNav(null)}
                    className="h-10 px-4 rounded-[10px] border border-white/10 hover:border-white/20 text-[#CBD5E1] hover:text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={Boolean(navToDelete)}
          onClose={() => setNavToDelete(null)}
          onConfirm={handleConfirmDeleteNav}
          title={`Delete "${navToDelete?.title}"?`}
          consequence="This navigation link will be removed from your website header."
          confirmLabel="Delete link"
          isLoading={deletingNav}
        />
      </div>
    </AdminLayout>
  );
};
