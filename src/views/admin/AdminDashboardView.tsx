import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import { getAllAnimes } from '../../lib/firestore/anime';
import { getAllEpisodes } from '../../lib/firestore/episodes';
import { getAllUsers } from '../../lib/firestore/admin-users';
import { getAllAnimeRequests, getAllEpisodeReports } from '../../lib/firestore/community';
import { getCmsPopupNotice, saveCmsPopupNotice } from '../../lib/firestore/cms';
import type { Anime } from '../../types/anime';
import type { Episode } from '../../types/episode';
import type { SitePopupNotice } from '../../types/cms';
import {
  Film,
  Tv,
  Download,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Eye,
  RefreshCw,
  Megaphone,
  Lock,
  Mail,
  LogIn,
} from 'lucide-react';

interface AdminDashboardViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin, loading, signIn, logout } = useAuth();
  const [stats, setStats] = useState({
    totalAnime: 0,
    ongoingAnime: 0,
    upcomingAnime: 0,
    completedAnime: 0,
    totalEpisodes: 0,
    totalUsers: 0,
    pendingRequests: 0,
    openReports: 0,
    totalViews: 0,
  });
  const [recentAnimes, setRecentAnimes] = useState<Anime[]>([]);
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [popupNotice, setPopupNotice] = useState<SitePopupNotice | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const loadAllData = async () => {
    try {
      setLoadingData(true);
      const [animes, eps, users, requests, reports, notice] = await Promise.all([
        getAllAnimes().catch(() => []),
        getAllEpisodes().catch(() => []),
        getAllUsers().catch(() => []),
        getAllAnimeRequests().catch(() => []),
        getAllEpisodeReports().catch(() => []),
        getCmsPopupNotice().catch(() => null),
      ]);

      const ongoing = animes.filter((a) => a.status === 'ongoing').length;
      const upcoming = animes.filter((a) => a.status === 'upcoming').length;
      const completed = animes.filter((a) => a.status === 'completed').length;
      let views = 0;
      for (const a of animes) {
        views += Number(a.viewsCount) || 0;
      }

      setStats({
        totalAnime: animes.length,
        ongoingAnime: ongoing,
        upcomingAnime: upcoming,
        completedAnime: completed,
        totalEpisodes: eps.length,
        totalUsers: users.length,
        pendingRequests: requests.filter((r) => r.status === 'pending').length,
        openReports: reports.filter((r) => r.status === 'open').length,
        totalViews: views,
      });

      setRecentAnimes(animes.slice(0, 5));
      setRecentEpisodes(eps.slice(0, 5));
      setPopupNotice(notice);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggleNotice = async () => {
    if (!popupNotice) return;
    const updated = {
      ...popupNotice,
      enabled: !popupNotice.enabled,
      version: `${Date.now()}`,
    };
    try {
      await saveCmsPopupNotice(updated);
      setPopupNotice(updated);
      onShowMessage(updated.enabled ? 'Site notice activated!' : 'Site notice disabled.');
      window.dispatchEvent(new CustomEvent('zynox:notice-updated', { detail: updated }));
    } catch {
      onShowMessage('Failed to update notice status.');
    }
  };

  const isSuperAdmin = Boolean(
    isAdmin || (user?.email && user.email.toLowerCase().trim() === 'zairoxmax2.0@gmail.com')
  );

  const [adminEmail, setAdminEmail] = useState('zairoxmax2.0@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    // 1500ms fallback so "Verifying administrator credentials..." never hangs
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllData();
    }
  }, [isSuperAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setLoginError('Please enter your password.');
      return;
    }
    setLoginSubmitting(true);
    setLoginError(null);
    try {
      const res = await signIn(adminEmail.trim(), adminPassword);
      if (!res.success) {
        setLoginError(res.error || 'Failed to sign in. Please verify your password.');
      } else {
        onShowMessage('Welcome to Admin Dashboard!');
        loadAllData();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // 1. Loading state with fast timeout
  if (loading && !authTimedOut && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#050A14] flex flex-col items-center justify-center p-4 space-y-3">
        <RefreshCw className="w-5 h-5 text-[#1683FF] animate-spin" />
        <div className="text-xs text-[#94A3B8] font-medium tracking-wide">
          Verifying administrator credentials...
        </div>
      </div>
    );
  }

  // 2. Unauthenticated or non-admin state: sleek inline login portal
  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0B1322] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#1683FF]/15 border border-[#1683FF]/30 flex items-center justify-center mx-auto text-[#1683FF]">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              ZYNOX Admin Portal
            </h2>
            <p className="text-xs text-[#94A3B8]">
              {user ? (
                <span>
                  Signed in as <strong className="text-white">{user.email}</strong> (Non-admin). Switch to the admin account below.
                </span>
              ) : (
                'Sign in with your verified administrator account to manage anime and episodes.'
              )}
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="zairoxmax2.0@gmail.com"
                  className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full bg-[#050A14] border border-white/10 focus:border-[#1683FF] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-3 bg-[#1683FF] hover:bg-[#1268cc] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-[#1683FF]/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loginSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In as Administrator</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#94A3B8]">
            {user ? (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onShowMessage('Logged out.');
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Sign out current user
              </button>
            ) : (
              <span className="text-[11px] text-[#64748B]">Admin email: zairoxmax2.0@gmail.com</span>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#1683FF] hover:underline font-semibold cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout currentTab="dashboard" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Clean Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Welcome back, <span className="text-[#1683FF] font-semibold">{user.email?.split('@')[0]}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={loadAllData}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/anime/new')}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-[#1683FF]/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Anime</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>Episodes</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/downloads')}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Downloads</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Anime */}
          <div
            onClick={() => navigate('/admin/anime')}
            className="bg-[#0B1322] border border-white/5 hover:border-[#1683FF]/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase tracking-wider">Total Anime</span>
              <Film className="w-4 h-4 text-[#1683FF] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalAnime}
            </div>
          </div>

          {/* Total Episodes */}
          <div
            onClick={() => navigate('/admin/episodes')}
            className="bg-[#0B1322] border border-white/5 hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase tracking-wider">Episodes</span>
              <Tv className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalEpisodes}
            </div>
          </div>

          {/* Site Notice Status */}
          <div
            onClick={() => navigate('/admin/notice')}
            className="bg-[#0B1322] border border-white/5 hover:border-cyan-400/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase tracking-wider">Site Notice</span>
              <Megaphone className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-bold border uppercase tracking-wider ${
                  popupNotice?.enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {popupNotice?.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Pending Requests */}
          <div
            onClick={() => navigate('/admin/requests')}
            className="bg-[#0B1322] border border-white/5 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase tracking-wider">Requests</span>
              <HelpCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.pendingRequests}
            </div>
          </div>
        </div>

        {/* Two Columns: Recent Anime Catalog & Site Open Notice Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Anime (2 Cols) */}
          <div className="lg:col-span-2 bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#1683FF]" />
                <h3 className="text-sm font-bold text-white">Recent Anime</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/anime')}
                className="text-xs text-[#1683FF] hover:underline font-semibold flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {recentAnimes.map((anime) => (
                <div
                  key={anime.id || anime.slug}
                  className="py-3 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={anime.poster}
                      alt={anime.title}
                      className="w-10 h-14 object-cover rounded-lg shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#1683FF] truncate transition-colors">
                        {anime.title}
                      </h4>
                      <div className="text-[11px] text-[#94A3B8] flex items-center gap-2 mt-0.5">
                        <span className="capitalize">{anime.status || 'ongoing'}</span> •
                        <span>{anime.year || 'N/A'}</span> •
                        <span>{anime.audioLanguage || 'Multi Audio'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/anime/edit/${anime.id || anime.slug}`)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-[#1683FF] text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/anime/${anime.id || anime.slug}/episodes`)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Episodes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site Notice Status Card (1 Col) */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Site Notice</h3>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotice}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider transition-all cursor-pointer ${
                    popupNotice?.enabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300'
                  }`}
                >
                  {popupNotice?.enabled ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2 text-left">
                <span
                  className="text-xs font-bold block truncate"
                  style={{ color: popupNotice?.header?.titleColor || '#FFFFFF' }}
                >
                  {popupNotice?.header?.title || 'Notice'}
                </span>
                <p className="text-xs text-[#94A3B8] line-clamp-3 leading-relaxed">
                  {popupNotice?.notice?.text || 'No notice configured yet.'}
                </p>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/notice')}
                className="py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Edit Notice</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('zynox:open-notice'));
                }}
                className="py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
