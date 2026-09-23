import React, { useState, useEffect } from 'react';
import type { SitePopupNotice, PopupNoticeTheme } from '../../types/cms';
import {
  getCmsPopupNotice,
  saveCmsPopupNotice,
  DEFAULT_POPUP_NOTICE,
  logAdminActivity,
} from '../../lib/firestore/cms';
import { useAuth } from '../../lib/auth';
import {
  Save,
  Eye,
  RefreshCw,
  Sliders,
  FileText,
  ArrowRight,
  Check,
  X,
  Palette,
  Clock,
} from 'lucide-react';

interface AdminPopupNoticeEditorProps {
  onShowMessage?: (msg: string, type?: 'success' | 'error') => void;
  onPreviewModal?: (notice: SitePopupNotice) => void;
}

export const AdminPopupNoticeEditor: React.FC<AdminPopupNoticeEditorProps> = ({
  onShowMessage,
  onPreviewModal,
}) => {
  const { user } = useAuth();
  const [notice, setNotice] = useState<SitePopupNotice>(DEFAULT_POPUP_NOTICE);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'header' | 'notice' | 'footer'>('header');

  useEffect(() => {
    let mounted = true;
    getCmsPopupNotice()
      .then((data) => {
        if (mounted) {
          setNotice(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load popup notice:', err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Auto-bump version on save so any users (and admin) who dismissed previous versions see the new notice
      const newVersion = `${Date.now()}`;
      const updated: SitePopupNotice = {
        ...notice,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      };
      await saveCmsPopupNotice(updated);
      setNotice(updated);

      // Clear local storage and session suppression so immediate testing works
      try {
        localStorage.removeItem('zynox_popup_notice_ver');
        localStorage.removeItem('zynox_popup_notice_time');
        sessionStorage.removeItem('zynox_popup_notice_session');
      } catch {}

      // Dispatch global notice updated event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('zynox:notice-updated', { detail: updated })
        );
      }

      if (user) {
        logAdminActivity(
          user.uid,
          user.email || 'admin',
          'update_popup_notice',
          'cms_popup_notice',
          'popupNotice',
          `Updated site open 1:1 popup notice: "${notice.header?.title}" (enabled: ${notice.enabled})`
        );
      }

      onShowMessage?.('Popup notice card saved successfully! (Version updated)', 'success');
    } catch (err) {
      console.error('Failed to save popup notice:', err);
      onShowMessage?.('Failed to save popup notice.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetVersion = () => {
    const newVersion = `${Date.now()}`;
    setNotice((prev) => ({ ...prev, version: newVersion }));
    onShowMessage?.(
      'Popup version reset. All users will see this notice again immediately.',
      'success'
    );
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset popup notice to clean 1:1 default?')) {
      setNotice(DEFAULT_POPUP_NOTICE);
      onShowMessage?.('Reset to default. Click "Save Changes" to apply.', 'success');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-[#94A3B8]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span>Loading popup card configuration...</span>
      </div>
    );
  }

  const themeOptions: { id: PopupNoticeTheme; label: string; color: string }[] = [
    { id: 'blue', label: 'Cyan / Blue', color: 'bg-[#00A8FF]' },
    { id: 'purple', label: 'Purple', color: 'bg-purple-500' },
    { id: 'amber', label: 'Amber Gold', color: 'bg-amber-500' },
    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
    { id: 'rose', label: 'Rose Red', color: 'bg-rose-500' },
  ];

  const headingColorPresets = [
    { label: 'Pure White', hex: '#FFFFFF' },
    { label: 'Sky Blue', hex: '#00A8FF' },
    { label: 'Neon Cyan', hex: '#00F0FF' },
    { label: 'Emerald', hex: '#10B981' },
    { label: 'Amber Gold', hex: '#F59E0B' },
    { label: 'Crimson', hex: '#EF4444' },
    { label: 'Rose Pink', hex: '#F43F5E' },
    { label: 'Purple', hex: '#A855F7' },
    { label: 'Sunset Orange', hex: '#F97316' },
    { label: 'Hot Pink', hex: '#EC4899' },
    { label: 'Lemon Yellow', hex: '#FACC15' },
  ];

  const getPreviewStyles = (theme: PopupNoticeTheme = 'blue') => {
    switch (theme) {
      case 'purple':
        return {
          border: 'border-purple-500/40',
          btn: 'bg-purple-600 text-white',
          highlight: 'text-purple-400',
        };
      case 'amber':
        return {
          border: 'border-amber-500/40',
          btn: 'bg-amber-500 text-black font-bold',
          highlight: 'text-amber-400',
        };
      case 'emerald':
        return {
          border: 'border-emerald-500/40',
          btn: 'bg-emerald-600 text-white',
          highlight: 'text-emerald-400',
        };
      case 'rose':
      case 'red':
        return {
          border: 'border-rose-500/40',
          btn: 'bg-rose-600 text-white',
          highlight: 'text-rose-400',
        };
      case 'blue':
      default:
        return {
          border: 'border-[#00A8FF]/40',
          btn: 'bg-[#00A8FF] text-white',
          highlight: 'text-[#00A8FF]',
        };
    }
  };

  const previewStyles = getPreviewStyles(notice.header?.themeColor || 'blue');

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-[#050A14] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-black text-white">
              Website Open Popup Notice (1:1 Square)
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                notice.enabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {notice.enabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Clean, compact 1:1 square card shown automatically when opening the website.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Master Toggle */}
          <button
            type="button"
            onClick={() => setNotice((p) => ({ ...p, enabled: !p.enabled }))}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              notice.enabled
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                : 'bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                notice.enabled ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span>{notice.enabled ? 'Enabled' : 'Disabled'}</span>
          </button>

          {/* Screen Test Button */}
          {onPreviewModal && (
            <button
              type="button"
              onClick={() => onPreviewModal(notice)}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Preview Live</span>
            </button>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Entrance Timing / Delay Control */}
      <div className="bg-[#050A14] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Entrance Popup Delay (वेबसाइट में एंटर करने के बाद कब दिखे)</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Pop-up website me enter karne ke {notice.displayDelaySeconds ?? 6} second badh show hoga.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {[3, 5, 6, 7, 10].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setNotice((p) => ({ ...p, displayDelaySeconds: sec }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                (notice.displayDelaySeconds ?? 6) === sec
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-[#081222] text-[#94A3B8] border-white/10 hover:text-white hover:bg-white/5'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-white/10 gap-1 bg-[#050A14] p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('header')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'header'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Header</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('notice')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'notice'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>2. Notice (Message)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('footer')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeSubTab === 'footer'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>3. Footer</span>
            </button>
          </div>

          {/* TAB 1: HEADER */}
          {activeSubTab === 'header' && (
            <div className="bg-[#050A14] border border-white/10 rounded-2xl p-5 space-y-4 text-left">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white">Header Settings</h3>
                <p className="text-[11px] text-[#64748B]">Set title and accent theme.</p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#94A3B8]">Header Title</label>
                <input
                  type="text"
                  value={notice.header?.title || ''}
                  onChange={(e) =>
                    setNotice((p) => ({
                      ...p,
                      header: { ...p.header, title: e.target.value },
                    }))
                  }
                  placeholder="e.g. Notice"
                  className="w-full bg-[#081222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* Heading Title Color */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#94A3B8] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Heading Title Color (हेडिंग का रंग)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold tracking-tight px-2.5 py-0.5 rounded-lg border border-white/10 bg-black/50 shadow-inner"
                      style={{ color: notice.header?.titleColor || '#FFFFFF' }}
                    >
                      {notice.header?.title || 'Notice'}
                    </span>
                  </div>
                </div>

                {/* Preset Color Swatches */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {headingColorPresets.map((preset) => {
                    const current = (notice.header?.titleColor || '#FFFFFF').toUpperCase();
                    const isSelected = current === preset.hex.toUpperCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() =>
                          setNotice((p) => ({
                            ...p,
                            header: { ...p.header, titleColor: preset.hex },
                          }))
                        }
                        title={`${preset.label} (${preset.hex})`}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-white bg-white/20 text-white ring-1 ring-white/50 scale-105 shadow-sm'
                            : 'border-white/10 bg-black/40 text-[#94A3B8] hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0 shadow-sm"
                          style={{ backgroundColor: preset.hex }}
                        />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-3 bg-[#081222] border border-white/10 rounded-xl p-2.5">
                  <label
                    htmlFor="custom-title-color"
                    className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#94A3B8] hover:text-white shrink-0"
                  >
                    <input
                      id="custom-title-color"
                      type="color"
                      value={notice.header?.titleColor || '#FFFFFF'}
                      onChange={(e) =>
                        setNotice((p) => ({
                          ...p,
                          header: { ...p.header, titleColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="font-semibold text-xs text-white">Custom Picker</span>
                  </label>
                  <input
                    type="text"
                    value={notice.header?.titleColor || '#FFFFFF'}
                    onChange={(e) =>
                      setNotice((p) => ({
                        ...p,
                        header: { ...p.header, titleColor: e.target.value },
                      }))
                    }
                    placeholder="#FFFFFF"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNotice((p) => ({
                        ...p,
                        header: { ...p.header, titleColor: '#FFFFFF' },
                      }))
                    }
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#94A3B8] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                  >
                    Reset White
                  </button>
                </div>
              </div>

              {/* Color Theme */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#94A3B8]">Accent Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {themeOptions.map((th) => {
                    const isSelected = (notice.header?.themeColor || 'blue') === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() =>
                          setNotice((p) => ({
                            ...p,
                            header: { ...p.header, themeColor: th.id },
                          }))
                        }
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white/10 border-white/40 text-white ring-1 ring-white/30'
                            : 'bg-black/30 border-white/5 text-[#94A3B8] hover:bg-white/5'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${th.color}`} />
                        <span>{th.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTICE MESSAGE */}
          {activeSubTab === 'notice' && (
            <div className="bg-[#050A14] border border-white/10 rounded-2xl p-5 space-y-4 text-left">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white">Notice Message</h3>
                <p className="text-[11px] text-[#64748B]">Clean text content without clutter.</p>
              </div>

              {/* Notice Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#94A3B8]">Main Notice Text</label>
                <textarea
                  rows={5}
                  value={notice.notice?.text || ''}
                  onChange={(e) =>
                    setNotice((p) => ({
                      ...p,
                      notice: { ...p.notice, text: e.target.value },
                    }))
                  }
                  placeholder="Enter notice message here..."
                  className="w-full bg-[#081222] border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-cyan-400 font-sans leading-relaxed"
                />
              </div>

              {/* Highlight Line */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#94A3B8]">
                  Optional Highlight Note
                </label>
                <input
                  type="text"
                  value={notice.notice?.highlightText || ''}
                  onChange={(e) =>
                    setNotice((p) => ({
                      ...p,
                      notice: { ...p.notice, highlightText: e.target.value },
                    }))
                  }
                  placeholder="e.g. Join Telegram for latest releases."
                  className="w-full bg-[#081222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: FOOTER */}
          {activeSubTab === 'footer' && (
            <div className="bg-[#050A14] border border-white/10 rounded-2xl p-5 space-y-4 text-left">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white">Footer & Actions</h3>
                <p className="text-[11px] text-[#64748B]">Action buttons and dismiss option.</p>
              </div>

              {/* Primary Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Primary Button Label
                  </label>
                  <input
                    type="text"
                    value={notice.footer?.primaryButtonText || ''}
                    onChange={(e) =>
                      setNotice((p) => ({
                        ...p,
                        footer: { ...p.footer, primaryButtonText: e.target.value },
                      }))
                    }
                    placeholder="e.g. Join Telegram"
                    className="w-full bg-[#081222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8]">
                    Primary Button Link
                  </label>
                  <input
                    type="text"
                    value={notice.footer?.primaryButtonUrl || ''}
                    onChange={(e) =>
                      setNotice((p) => ({
                        ...p,
                        footer: { ...p.footer, primaryButtonUrl: e.target.value },
                      }))
                    }
                    placeholder="https://t.me/ZynoxAnime"
                    className="w-full bg-[#081222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Secondary Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#94A3B8]">
                  Secondary Button Label
                </label>
                <input
                  type="text"
                  value={notice.footer?.secondaryButtonText || ''}
                  onChange={(e) =>
                    setNotice((p) => ({
                      ...p,
                      footer: { ...p.footer, secondaryButtonText: e.target.value },
                    }))
                  }
                  placeholder="e.g. Close / Continue"
                  className="w-full bg-[#081222] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* Don't show again toggle */}
              <label className="flex items-center gap-3 p-3 bg-[#081222] rounded-xl border border-white/5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notice.footer?.showDontShowAgain ?? true}
                  onChange={(e) =>
                    setNotice((p) => ({
                      ...p,
                      footer: { ...p.footer, showDontShowAgain: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-white">
                  Show &ldquo;Don&apos;t show again today&rdquo; checkbox
                </span>
              </label>

              {/* Reset Version */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#64748B]">
                  Version: <span className="font-mono text-cyan-400">{notice.version}</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetVersion}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Force Re-Show to Users</span>
                </button>
              </div>
            </div>
          )}

          {/* Reset link */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] text-[#64748B] hover:text-[#94A3B8] transition-colors cursor-pointer"
            >
              Reset to clean default
            </button>
          </div>
        </div>

        {/* Right Column: Exact 1:1 Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3 sticky top-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              1:1 Live Preview
            </h3>
            <span className="text-[11px] text-[#64748B]">Square Aspect Ratio</span>
          </div>

          <div className="bg-[#030712] p-4 rounded-2xl border border-white/10 shadow-xl flex items-center justify-center">
            {/* 1:1 Square Card Preview */}
            <div
              className={`w-full max-w-[320px] aspect-square bg-[#070D18] border ${previewStyles.border} rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between text-left`}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2 shrink-0">
                <h4
                  className="text-sm font-bold tracking-tight truncate"
                  style={{ color: notice.header?.titleColor || '#FFFFFF' }}
                >
                  {notice.header?.title || 'Notice'}
                </h4>
                <div className="p-1 rounded-md text-[#64748B] bg-white/5 border border-white/10 shrink-0">
                  <X className="w-3 h-3" />
                </div>
              </div>

              {/* Body */}
              <div className="px-4 py-2 flex-1 overflow-y-auto flex flex-col justify-center text-xs leading-relaxed text-[#CBD5E1] space-y-2">
                <p className="whitespace-pre-line font-normal text-[#CBD5E1]">
                  {notice.notice?.text || 'Notice content will appear here...'}
                </p>
                {notice.notice?.highlightText && (
                  <p className={`font-semibold ${previewStyles.highlight}`}>
                    {notice.notice.highlightText}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 pt-2 shrink-0 space-y-2 border-t border-white/5 bg-[#050912]">
                <div className="grid grid-cols-2 gap-2">
                  <span className="py-1.5 px-2 rounded-xl text-xs font-semibold text-[#94A3B8] bg-white/5 border border-white/10 text-center truncate">
                    {notice.footer?.secondaryButtonText || 'Close'}
                  </span>
                  <span
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold text-center truncate ${previewStyles.btn}`}
                  >
                    {notice.footer?.primaryButtonText || 'Join'}
                  </span>
                </div>

                {notice.footer?.showDontShowAgain && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#94A3B8]">
                    <div className="w-3 h-3 rounded border border-white/20 bg-black/40 flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                    <span>Don&apos;t show again today</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
