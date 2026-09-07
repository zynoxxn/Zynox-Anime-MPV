import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminLayout } from './AdminLayout';
import { getAllAnimes } from '../../lib/firestore/anime';
import { getAllEpisodes } from '../../lib/firestore/episodes';
import { getAllUsers } from '../../lib/firestore/admin-users';
import { getAllAnimeRequests, getAllEpisodeReports } from '../../lib/firestore/community';
import { getAdminLogs } from '../../lib/firestore/cms';
import type { Anime } from '../../types/anime';
import type { Episode } from '../../types/episode';
import type { CmsAdminLog } from '../../types/cms';
import {
  Film,
  Tv,
  Download,
  Users,
  Calendar,
  Layers,
  Sliders,
  PlusCircle,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  CheckCircle2,
  HelpCircle,
  FileText,
  Shield,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin, loading } = useAuth();
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
  const [recentLogs, setRecentLogs] = useState<CmsAdminLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadAllData = async () => {
    try {
      setLoadingData(true);
      const [animes, eps, users, requests, reports, logs] = await Promise.all([
        getAllAnimes().catch(() => []),
        getAllEpisodes().catch(() => []),
        getAllUsers().catch(() => []),
        getAllAnimeRequests().catch(() => []),
        getAllEpisodeReports().catch(() => []),
        getAdminLogs(8).catch(() => []),
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
      setRecentLogs(logs);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center text-xs text-[#94A3B8]">
        Verifying administrator credentials...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-8 rounded-3xl max-w-md text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
          <p className="text-xs text-[#94A3B8]">
            Your user account ({user?.email || 'Guest'}) does not have administrator privileges.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#1683FF] text-white text-xs font-bold rounded-xl"
          >
            Back to Home
          </button>
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

          <div className="flex items-center gap-2">
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
              className="px-4 py-2 rounded-xl bg-[#1683FF] hover:bg-[#1268cc] text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-[#1683FF]/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Anime</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-400" />
              <span>Episodes</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/downloads')}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Add Downloads</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Anime */}
          <div
            onClick={() => navigate('/admin/anime')}
            className="bg-[#0B1322] border border-white/5 hover:border-[#1683FF]/40 rounded-2xl p-4 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase">Total Anime</span>
              <Film className="w-4 h-4 text-[#1683FF] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalAnime}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              {stats.ongoingAnime} Ongoing
            </div>
          </div>

          {/* Total Episodes */}
          <div
            onClick={() => navigate('/admin/episodes')}
            className="bg-[#0B1322] border border-white/5 hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase">Episodes</span>
              <Tv className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalEpisodes}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              All seasons
            </div>
          </div>

          {/* Total Users */}
          <div
            onClick={() => navigate('/admin/users')}
            className="bg-[#0B1322] border border-white/5 hover:border-purple-500/40 rounded-2xl p-4 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase">Users</span>
              <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.totalUsers}
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-1">
              Registered users
            </div>
          </div>

          {/* Pending Requests & Reports */}
          <div
            onClick={() => navigate('/admin/requests')}
            className="bg-[#0B1322] border border-white/5 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span className="text-xs font-bold uppercase">Requests</span>
              <HelpCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {stats.pendingRequests + stats.openReports}
            </div>
            <div className="text-[11px] text-amber-400 font-semibold mt-1">
              {stats.pendingRequests} requests • {stats.openReports} reports
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider px-1">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/admin/downloads')}
              className="bg-[#0B1322] border border-white/5 hover:border-amber-500/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-amber-400">
                Downloads
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/schedule')}
              className="bg-[#0B1322] border border-white/5 hover:border-[#1683FF]/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-[#1683FF] group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-[#1683FF]">
                Schedule
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/hero-banners')}
              className="bg-[#0B1322] border border-white/5 hover:border-cyan-500/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-cyan-400">
                Hero Banners
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/homepage')}
              className="bg-[#0B1322] border border-white/5 hover:border-purple-500/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Sliders className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-purple-400">
                Homepage
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/navigation-footer')}
              className="bg-[#0B1322] border border-white/5 hover:border-blue-400/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Sliders className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-blue-400">
                Nav & Footer
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/taxonomy')}
              className="bg-[#0B1322] border border-white/5 hover:border-emerald-500/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-emerald-400">
                Genres
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/announcements')}
              className="bg-[#0B1322] border border-white/5 hover:border-amber-500/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-amber-400">
                Announce
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/settings')}
              className="bg-[#0B1322] border border-white/5 hover:border-rose-500/40 rounded-xl p-3 text-center transition-all group flex flex-col items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-rose-400 mb-0 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white group-hover:text-rose-400">
                Settings
              </div>
            </button>
          </div>
        </div>

        {/* Two Columns: Recent Anime Catalog & Recent Audit Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Anime (2 Cols) */}
          <div className="lg:col-span-2 bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#1683FF]" />
                <h3 className="text-sm font-bold text-white">Recent Anime Titles</h3>
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

          {/* Recent Admin Audit Logs (1 Col) */}
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Recent Audit Logs</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/logs')}
                className="text-xs text-[#1683FF] hover:underline font-semibold"
              >
                All Logs
              </button>
            </div>

            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="text-xs bg-white/5 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[#94A3B8]">
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="text-[10px] text-emerald-400">{log.targetType}</span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-[#A9B8CC] truncate">{log.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
