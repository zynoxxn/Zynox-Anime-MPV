import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { CmsSiteSettings } from '../../types/cms';
import { getCmsSiteSettings, saveCmsSiteSettings, logAdminActivity } from '../../lib/firestore/cms';
import { seedDefaultCatalogToFirestore } from '../../lib/firestore/anime';
import { AdminLayout } from './AdminLayout';
import {
  Settings,
  Save,
  Loader2,
  Database,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Globe,
  Sliders,
  Megaphone,
  ArrowRight,
} from 'lucide-react';

interface AdminSettingsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CmsSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ animeCount: number; episodeCount: number } | null>(null);

  useEffect(() => {
    getCmsSiteSettings().then((res) => {
      setSettings(res);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await saveCmsSiteSettings(settings);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Updated Global Site Settings',
        'SiteSettings',
        'global',
        settings.siteName
      );
      onShowMessage('Site configuration saved successfully.');
    } catch (err: any) {
      console.error('Save settings error:', err);
      onShowMessage(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm('This will seed default anime series into your Firestore database. Continue?')) {
      return;
    }
    try {
      setSeeding(true);
      const res = await seedDefaultCatalogToFirestore();
      setSeedResult(res);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Seeded Database Catalog',
        'Database',
        'seed',
        `${res.animeCount} anime, ${res.episodeCount} eps`
      );
      onShowMessage(`Successfully seeded ${res.animeCount} anime titles and ${res.episodeCount} episodes!`);
    } catch (err: any) {
      console.error('Seed database error:', err);
      onShowMessage(`Failed to seed catalog: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AdminLayout currentTab="settings" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-5 sm:p-6 rounded-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Website Settings
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              General site settings and database configuration
            </p>
          </div>

          {settings && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-md shadow-purple-600/20 rounded-xl transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )}
        </div>

        {/* Database Seeding Utility Box */}
        <div className="bg-[#0B1322] border border-purple-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">Database Catalog Sync &amp; Seeding</h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-400 font-bold px-2 py-0.5 rounded uppercase">
                  One-Click Sync
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] max-w-xl leading-relaxed">
                Sync and seed popular anime titles, episodes, video servers, and initial taxonomy metadata to Firestore.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{seeding ? 'Seeding Firestore...' : 'Seed Catalog'}</span>
            </button>
          </div>

          {seedResult && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Synced {seedResult.animeCount} anime titles and {seedResult.episodeCount} episodes!
              </span>
            </div>
          )}
        </div>

        {/* Form Settings */}
        {loading || !settings ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading configuration...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Brand Identity</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Site Name</label>
                  <input
                    type="text"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Logo Wordmark Text</label>
                  <input
                    type="text"
                    value={settings.logoText}
                    onChange={(e) => setSettings({ ...settings, logoText: e.target.value })}
                    className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#94A3B8]">Tagline / Slogan</label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Community &amp; Features</h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-requests"
                  checked={settings.enableRequests ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, enableRequests: e.target.checked })
                  }
                  className="rounded accent-purple-500"
                />
                <label htmlFor="enable-requests" className="text-xs font-semibold text-white">
                  Allow Public Users to Submit Anime Requests
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-comments"
                  checked={settings.enableComments ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, enableComments: e.target.checked })
                  }
                  className="rounded accent-purple-500"
                />
                <label htmlFor="enable-comments" className="text-xs font-semibold text-white">
                  Enable Community Comments on Anime &amp; Episode Pages
                </label>
              </div>
            </div>

            {/* Quick Access to Website Open Popup Card Notice */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-[#0B1322] to-blue-950/30 border border-cyan-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Megaphone className="w-4 h-4" />
                  <span>Website Open Pop-Up Notice Card</span>
                </div>
                <h4 className="text-base font-bold text-white">
                  Customize the Opening Pop-up Card
                </h4>
                <p className="text-xs text-[#94A3B8]">
                  Edit the Header, Footer, and Notice message that appears whenever someone opens the website.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/announcements')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer shrink-0 transition-all"
              >
                <span>Edit Pop-Up Card</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};
