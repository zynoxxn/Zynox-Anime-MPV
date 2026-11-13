import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { CmsSiteSettings } from '../../types/cms';
import { getCmsSiteSettings, saveCmsSiteSettings, logAdminActivity, DEFAULT_CMS_SITE_SETTINGS } from '../../lib/firestore/cms';
import { seedDefaultCatalogToFirestore } from '../../lib/firestore/anime';
import { AdminLayout } from './AdminLayout';
import {
  AdminPageHeader,
  AdminToggle,
  AdminSelect,
  AdminColorField,
  AdminStickySaveBar,
  AdminConfirmDialog,
  AdminSkeleton,
  AdminErrorState,
  AdminCopyInput,
} from '../../components/admin';
import {
  Settings,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Palette,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Tv,
  Mail,
  Wrench,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { PINNED_SUPER_ADMIN_EMAIL, getAdminRole } from '../../lib/admin-roles';

interface AdminSettingsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
  initialTab?: 'settings' | 'branding';
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +09:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST -05:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT +00:00)' },
];

const QUALITY_OPTIONS = [
  { value: '1080p', label: '1080p Full HD' },
  { value: '720p', label: '720p HD' },
  { value: '480p', label: '480p SD' },
  { value: '360p', label: '360p Mobile' },
];

const AUDIO_OPTIONS = [
  { value: 'Hindi Dub', label: 'Hindi Dub' },
  { value: 'English Sub', label: 'English Subtitles' },
  { value: 'Japanese', label: 'Japanese Audio' },
  { value: 'Multi Audio', label: 'Multi Audio' },
];

const BRAND_SWATCHES = [
  '#1E88FF', // Zynox Electric Blue (Primary)
  '#00CFFF', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
];

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  navigate,
  onShowMessage,
  initialTab = 'settings',
}) => {
  const { user, isAdmin } = useAuth();
  const effectiveRole = getAdminRole(user, isAdmin);
  const isSuperAdmin =
    effectiveRole === 'super_admin' ||
    user?.email?.toLowerCase().trim() === PINNED_SUPER_ADMIN_EMAIL;

  const [settings, setSettings] = useState<CmsSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Developer Danger Zone State
  const [devZoneOpen, setDevZoneOpen] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ animeCount: number; episodeCount: number } | null>(null);

  const isBrandingPage = initialTab === 'branding';

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      // Timeout promise for 8 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Settings query timed out after 8s')), 8000)
      );
      const res = await Promise.race([
        getCmsSiteSettings(),
        timeoutPromise,
      ]);
      setSettings(res || DEFAULT_CMS_SITE_SETTINGS);
      setIsDirty(false);
    } catch (err: any) {
      console.warn('Failed to load site settings or timed out:', err);
      // If Firestore doc is missing or query times out, use default settings so user is not stuck on skeleton
      setSettings(DEFAULT_CMS_SITE_SETTINGS);
      setLoadError(err?.message || 'Failed to fetch settings from Firestore');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = (field: keyof CmsSiteSettings, value: any) => {
    if (!settings) return;
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
    setIsDirty(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await saveCmsSiteSettings(settings);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        isBrandingPage ? 'Updated Branding Identity' : 'Updated Global Site Settings',
        'SiteSettings',
        'global',
        settings.siteName
      );
      onShowMessage(isBrandingPage ? 'Branding settings saved successfully.' : 'Website settings saved successfully.');
      setIsDirty(false);
    } catch (err: any) {
      console.error('Save settings error:', err);
      onShowMessage(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!isSuperAdmin) {
      onShowMessage('Permission denied: Super Admin privilege required to seed database.');
      return;
    }
    try {
      setSeeding(true);
      const res = await seedDefaultCatalogToFirestore();
      setSeedResult(res);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Seeded Database Catalog (Missing docs only)',
        'Database',
        'seed',
        `${res.animeCount} anime, ${res.episodeCount} episodes created`
      );
      setShowSeedConfirm(false);
      onShowMessage(`Seeding complete: ${res.animeCount} anime titles and ${res.episodeCount} episodes preserved.`);
    } catch (err: any) {
      console.error('Seed database error:', err);
      onShowMessage(`Failed to seed catalog: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleExportBackup = () => {
    if (!settings) return;
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        siteSettings: settings,
        zynoxVersion: '3.0.0',
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zynox-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowMessage('Configuration JSON snapshot exported.');
    } catch {
      onShowMessage('Failed to generate export file.');
    }
  };

  return (
    <AdminLayout currentTab={isBrandingPage ? 'branding' : 'settings'} navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 max-w-4xl mx-auto pb-24">
        {/* Page Header (Save is in the Sticky Save Bar) */}
        <AdminPageHeader
          title={isBrandingPage ? 'Branding Identity' : 'Website Settings'}
          description={
            isBrandingPage
              ? 'Configure logo, wordmark, tagline, and primary brand theme'
              : 'Global platform configuration, player defaults, community features, and maintenance'
          }
          secondaryActions={[
            isBrandingPage
              ? {
                  label: 'General Settings',
                  icon: Settings,
                  onClick: () => navigate('/admin/settings'),
                }
              : {
                  label: 'Branding Identity',
                  icon: Palette,
                  onClick: () => navigate('/admin/branding'),
                },
          ]}
        />

        {loading && !settings ? (
          <div className="space-y-4">
            <AdminSkeleton variant="card" count={3} />
          </div>
        ) : loadError && !settings ? (
          <AdminErrorState
            message={loadError}
            onRetry={loadSettings}
          />
        ) : isBrandingPage ? (
          /* ================= BRANDING PAGE ONLY ================= */
          <div className="space-y-6">
            {/* 1. Identity Card */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Palette className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">Brand Assets & Identity</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Website Name <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.siteName}
                    onChange={(e) => updateSetting('siteName', e.target.value)}
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Logo Wordmark Text
                  </label>
                  <input
                    type="text"
                    value={settings.logoText || ''}
                    onChange={(e) => updateSetting('logoText', e.target.value)}
                    placeholder="ZYNOX"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Tagline / Header Slogan
                </label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => updateSetting('tagline', e.target.value)}
                  placeholder="Watch Japanese anime series with Hindi Dub & Multi Audio"
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Logo Image URL (Optional)
                  </label>
                  <AdminCopyInput
                    type="url"
                    value={settings.logoUrl || ''}
                    onChange={(val) => updateSetting('logoUrl', val)}
                    placeholder="https://.../logo.png"
                    showPaste={true}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Favicon URL (Optional)
                  </label>
                  <AdminCopyInput
                    type="url"
                    value={settings.faviconUrl || ''}
                    onChange={(val) => updateSetting('faviconUrl', val)}
                    placeholder="https://.../favicon.ico"
                    showPaste={true}
                  />
                </div>
              </div>
            </div>

            {/* 2. Colors & Typography Card */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Sparkles className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">Theme & UI Styling</h3>
              </div>

              {/* 6 Preset Swatches + Hex */}
              <AdminColorField
                label="Primary Brand Theme Accent"
                value={settings.themeAccent || settings.primaryColor || '#1E88FF'}
                onChange={(val) => {
                  updateSetting('themeAccent', val);
                  updateSetting('primaryColor', val);
                }}
                presetSwatches={BRAND_SWATCHES}
                helperText="Primary brand accent color used for navigation glows, playback highlights, and interactive controls."
              />

              {/* Shape Selection */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-white mb-2">
                  Component Shape & Corner Radius
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'rounded-xl', label: 'Rounded Standard (12px)', sampleClass: 'rounded-xl' },
                    { id: 'rounded-full', label: 'Pill / Fluid (Full)', sampleClass: 'rounded-full' },
                    { id: 'rounded-md', label: 'Compact / Sharp (6px)', sampleClass: 'rounded-md' },
                  ].map((shape) => {
                    const isSelected = (settings.themeShape || 'rounded-xl') === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => updateSetting('themeShape', shape.id)}
                        className={`h-11 px-3.5 border transition-all text-xs font-medium flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E88FF]/15 border-[#1E88FF] text-white'
                            : 'bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
                        } rounded-[10px]`}
                      >
                        <span className="truncate">{shape.label}</span>
                        <div
                          className={`w-4 h-4 border border-current shrink-0 ml-2 ${shape.sampleClass}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Selection */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-white mb-2">
                  Typography & Font Family
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'Modern Sans', label: 'Modern Sans (Plus Jakarta / Inter)', fontStyle: 'font-sans' },
                    { id: 'System UI', label: 'System UI (Native OS Platform)', fontStyle: 'font-sans' },
                    { id: 'Display', label: 'Display (Cabinet / Geometric)', fontStyle: 'font-sans' },
                    { id: 'Clean Minimal', label: 'Clean Minimal (Space Grotesk)', fontStyle: 'font-sans' },
                  ].map((fontItem) => {
                    const isSelected = (settings.themeFont || 'Modern Sans') === fontItem.id;
                    return (
                      <button
                        key={fontItem.id}
                        type="button"
                        onClick={() => updateSetting('themeFont', fontItem.id)}
                        className={`h-11 px-3.5 border transition-all text-xs font-medium flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E88FF]/15 border-[#1E88FF] text-white'
                            : 'bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20'
                        } rounded-[10px]`}
                      >
                        <span className="truncate">{fontItem.label}</span>
                        <span className="text-[10px] uppercase font-bold text-[#1E88FF] shrink-0 ml-2">Aa</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Live Mini Preview */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#1E88FF]" />
                  <h3 className="text-sm font-semibold text-white">Live Brand Preview</h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1E88FF]/15 text-[#1E88FF] font-semibold">
                  Real-time Preview
                </span>
              </div>

              {/* Preview Box Container */}
              <div className="p-4 sm:p-6 rounded-[12px] bg-[#050A14] border border-white/5 space-y-4 shadow-inner">
                {/* Mock Navbar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                    ) : (
                      <div
                        className="w-7 h-7 flex items-center justify-center font-bold text-xs text-white"
                        style={{
                          backgroundColor: settings.themeAccent || '#1E88FF',
                          borderRadius: settings.themeShape === 'rounded-full' ? '9999px' : settings.themeShape === 'rounded-md' ? '6px' : '10px',
                        }}
                      >
                        {(settings.logoText || 'Z').charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-bold text-white tracking-tight">
                      {settings.logoText || settings.siteName || 'ZYNOX'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      style={{
                        backgroundColor: settings.themeAccent || '#1E88FF',
                        borderRadius: settings.themeShape === 'rounded-full' ? '9999px' : settings.themeShape === 'rounded-md' ? '6px' : '10px',
                      }}
                      className="h-8 px-3 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Watch</span>
                    </button>
                  </div>
                </div>

                {/* Mock Tagline Banner */}
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {settings.siteName || 'ZYNOX ANIME'}
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    {settings.tagline || 'High Performance Anime Streaming in Multi Audio'}
                  </p>
                </div>

                {/* Sample Buttons & Badges */}
                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  <button
                    type="button"
                    style={{
                      backgroundColor: settings.themeAccent || '#1E88FF',
                      borderRadius: settings.themeShape === 'rounded-full' ? '9999px' : settings.themeShape === 'rounded-md' ? '6px' : '10px',
                    }}
                    className="h-9 px-4 text-white text-xs font-semibold shadow-sm"
                  >
                    Primary Button
                  </button>
                  <button
                    type="button"
                    style={{
                      borderRadius: settings.themeShape === 'rounded-full' ? '9999px' : settings.themeShape === 'rounded-md' ? '6px' : '10px',
                    }}
                    className="h-9 px-3.5 bg-white/5 border border-white/10 text-white text-xs font-medium"
                  >
                    Secondary Button
                  </button>
                  <span
                    style={{
                      borderColor: `${settings.themeAccent || '#1E88FF'}40`,
                      color: settings.themeAccent || '#1E88FF',
                      backgroundColor: `${settings.themeAccent || '#1E88FF'}15`,
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold border rounded-full"
                  >
                    HINDI DUB
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= 7 STACKED CARDS FOR SETTINGS ================= */
          <div className="space-y-5">
            {/* 1. GENERAL CARD */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#1E88FF]" />
                  <h3 className="text-sm font-semibold text-white">General Information</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/branding')}
                  className="text-xs text-[#1E88FF] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span>Brand Identity & Logo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Website Name <span className="text-[#1E88FF]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.siteName}
                    onChange={(e) => updateSetting('siteName', e.target.value)}
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <AdminSelect
                    label="Platform Timezone"
                    value={settings.timezone || 'Asia/Kolkata'}
                    options={TIMEZONE_OPTIONS}
                    onChange={(val) => updateSetting('timezone', val)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Platform Tagline
                </label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => updateSetting('tagline', e.target.value)}
                  placeholder="Watch Japanese anime with Hindi Dub & English Subtitles"
                  className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                />
              </div>

              <div
                onClick={() => navigate('/admin/branding')}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[10px] flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-[#1E88FF]" />
                  <div>
                    <p className="text-xs font-semibold text-white">Customize Logo, Wordmark & Accent Color</p>
                    <p className="text-[11px] text-[#94A3B8]">Manage visual branding elements in the dedicated Branding view.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
              </div>
            </div>

            {/* 2. FEATURES CARD */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Sparkles className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">Community & Catalog Features</h3>
              </div>

              <div className="divide-y divide-white/5">
                <AdminToggle
                  checked={settings.enableComments ?? true}
                  onChange={(val) => {
                    updateSetting('enableComments', val);
                    updateSetting('enableCommunityComments', val);
                  }}
                  label="Community Comments System"
                  description="Allow visitors and signed-in members to post comments and episode reactions."
                />

                <AdminToggle
                  checked={settings.enableRequests ?? true}
                  onChange={(val) => updateSetting('enableRequests', val)}
                  label="Anime Request Portal"
                  description="Enable community requests form on /requests for missing titles."
                />

                <AdminToggle
                  checked={settings.trendingMode === 'auto'}
                  onChange={(val) => updateSetting('trendingMode', val ? 'auto' : 'manual')}
                  label="Automated Trending Algorithm"
                  description="When enabled, trending anime are computed from real visitor views instead of manual curation."
                />

                <AdminToggle
                  checked={settings.popularMode === 'auto'}
                  onChange={(val) => updateSetting('popularMode', val ? 'auto' : 'manual')}
                  label="Automated Popular Algorithm"
                  description="Dynamically orders popular shelf based on aggregate historical watch sessions."
                />
              </div>
            </div>

            {/* 3. PLAYER CARD */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Tv className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">Video Player Defaults</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AdminSelect
                  label="Default Streaming Quality"
                  value={settings.defaultQuality || '1080p'}
                  options={QUALITY_OPTIONS}
                  onChange={(val) => updateSetting('defaultQuality', val)}
                  helperText="Initial resolution requested before adaptive bitrate switches."
                />

                <AdminSelect
                  label="Default Audio Language"
                  value={settings.defaultLanguage || 'Hindi Dub'}
                  options={AUDIO_OPTIONS}
                  onChange={(val) => updateSetting('defaultLanguage', val)}
                  helperText="Preferred server audio stream loaded on watch screen."
                />
              </div>
            </div>

            {/* 4. CONTACT & LINKS CARD */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Mail className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">Contact & Social Links</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.contactEmail || ''}
                    onChange={(e) => updateSetting('contactEmail', e.target.value)}
                    placeholder="support@zynox.in"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Telegram Channel URL
                  </label>
                  <input
                    type="url"
                    value={settings.telegramUrl || ''}
                    onChange={(e) => updateSetting('telegramUrl', e.target.value)}
                    placeholder="https://t.me/ZynoxAnime"
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm font-mono text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Discord Community URL
                  </label>
                  <input
                    type="url"
                    value={settings.discordUrl || ''}
                    onChange={(e) => updateSetting('discordUrl', e.target.value)}
                    placeholder="https://discord.gg/..."
                    className="w-full h-11 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] px-3.5 text-sm font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Platform Disclaimer Summary
                </label>
                <textarea
                  rows={2}
                  value={settings.disclaimerText || ''}
                  onChange={(e) => updateSetting('disclaimerText', e.target.value)}
                  placeholder="Zynox does not store any files on our server. All content is provided by non-affiliated third parties."
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-xs text-[#94A3B8] outline-none"
                />
              </div>
            </div>

            {/* 5. MAINTENANCE CARD */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Wrench className="w-4 h-4 text-[#1E88FF]" />
                <h3 className="text-sm font-semibold text-white">Maintenance Mode</h3>
              </div>

              <div className="space-y-4">
                <AdminToggle
                  checked={settings.maintenanceMode ?? false}
                  onChange={(val) => updateSetting('maintenanceMode', val)}
                  label="Enable Website Maintenance Mode"
                  description="When active, non-admin visitors will see the maintenance screen."
                />

                {settings.maintenanceMode && (
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">
                      Visitor Maintenance Notice
                    </label>
                    <textarea
                      rows={2}
                      value={settings.maintenanceMessage || ''}
                      onChange={(e) => updateSetting('maintenanceMessage', e.target.value)}
                      placeholder="We are upgrading our servers for faster playback. Please check back shortly!"
                      className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[10px] p-3 text-sm text-white outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 6. BACKUP CARD */}
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#1E88FF]" />
                  <h3 className="text-sm font-semibold text-white">Configuration Backup & Snapshot</h3>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  Export a timestamped JSON snapshot of your active CMS settings for safekeeping.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportBackup}
                className="h-10 px-4 rounded-[10px] bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 flex items-center gap-2 shrink-0 cursor-pointer transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Export JSON Snapshot</span>
              </button>
            </div>

            {/* 7. DEVELOPER CARD (Danger zone, Super Admin only, collapsed by default) */}
            <div className="bg-[#0B1324] border border-rose-500/30 rounded-[12px] overflow-hidden">
              <button
                type="button"
                onClick={() => setDevZoneOpen((prev) => !prev)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-rose-500/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-rose-400">Developer & Database Danger Zone</h3>
                    <p className="text-xs text-[#94A3B8]">Advanced seeding utilities (Restricted to Super Admin)</p>
                  </div>
                </div>
                {devZoneOpen ? (
                  <ChevronUp className="w-4 h-4 text-[#94A3B8]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
                )}
              </button>

              {devZoneOpen && (
                <div className="p-4 sm:p-5 border-t border-rose-500/20 bg-rose-500/5 space-y-4">
                  {!isSuperAdmin ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-[8px] text-xs text-rose-300">
                      Super Admin access required. Contact the root administrator to unlock developer controls.
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-rose-400" />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Catalog Sync & Database Seeding
                            </h4>
                          </div>
                          <p className="text-xs text-[#94A3B8] max-w-xl">
                            Creates default anime series and episode documents if missing from Firestore. Existing database documents are never overwritten. All actions are recorded to audit logs.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowSeedConfirm(true)}
                          disabled={seeding}
                          className="h-10 px-4 rounded-[10px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>Seed Catalog (SEED)</span>
                        </button>
                      </div>

                      {seedResult && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-[8px] flex items-center gap-2 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            Catalog intact: {seedResult.animeCount} anime and {seedResult.episodeCount} episodes verified in database.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sticky Save Bar (Single primary save button) */}
        {isDirty && (
          <AdminStickySaveBar
            message="Unsaved website settings"
            saveLabel="Save settings"
            saving={saving}
            onSave={handleSave}
            onDiscard={loadSettings}
          />
        )}

        {/* Seed Confirmation Dialog requiring keyword SEED */}
        <AdminConfirmDialog
          isOpen={showSeedConfirm}
          onClose={() => setShowSeedConfirm(false)}
          onConfirm={handleSeedDatabase}
          title="Seed Catalog to Database?"
          consequence="This will populate initial anime series, episodes, and stream sources into Firestore if they do not exist. Existing documents are safely preserved."
          confirmLabel="Seed Database"
          requireKeyword="SEED"
          isDestructive={true}
          isLoading={seeding}
        />
      </div>
    </AdminLayout>
  );
};
