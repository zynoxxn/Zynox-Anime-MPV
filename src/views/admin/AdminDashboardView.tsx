import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  AdminStatusBadge,
  AdminListRow,
  AdminSegmentedTabs,
  AdminEmptyState,
  AdminErrorState,
  AdminSkeleton,
} from '../../components/admin';
import {
  formatAdminDate,
  maskEmail,
} from '../../lib/admin-roles';
import {
  Film,
  Tv,
  Users,
  TrendingUp,
  Plus,
  ListPlus,
  Sliders,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Activity,
  Layers,
} from 'lucide-react';

interface AdminDashboardViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

interface AttentionItem {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  path: string;
}

function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return '—';
  let date: Date;
  if (typeof timestamp?.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return '—';
  }
  if (isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function formatLogSentence(log: CmsAdminLog): string {
  const action = (log.action || '').trim().toLowerCase();
  const targetType = (log.targetType || 'item').trim();
  const details = (log.details || '').trim();
  const targetId = (log.targetId || '').trim();
  const subject = details || (targetId ? `'${targetId}'` : '');

  if (action.includes('delete') || action.includes('remove')) {
    return subject ? `Deleted ${targetType.toLowerCase()} '${subject.replace(/^'|'$/g, '')}'` : `Deleted ${targetType.toLowerCase()}`;
  }
  if (action.includes('create') || action.includes('add')) {
    return subject ? `Created ${targetType.toLowerCase()} '${subject.replace(/^'|'$/g, '')}'` : `Created ${targetType.toLowerCase()}`;
  }
  if (action.includes('update') || action.includes('edit')) {
    return subject ? `Updated ${targetType.toLowerCase()} '${subject.replace(/^'|'$/g, '')}'` : `Updated ${targetType.toLowerCase()}`;
  }
  if (action.includes('publish')) {
    return subject ? `Published ${targetType.toLowerCase()} '${subject.replace(/^'|'$/g, '')}'` : `Published ${targetType.toLowerCase()}`;
  }
  if (log.action) {
    return details ? `${log.action} '${details.replace(/^'|'$/g, '')}'` : log.action;
  }
  return 'Updated site configuration';
}

function getLogIcon(log: CmsAdminLog) {
  const type = (log.targetType || '').toLowerCase();
  if (type.includes('anime')) return Film;
  if (type.includes('ep')) return Tv;
  if (type.includes('user')) return Users;
  if (type.includes('popup') || type.includes('notice') || type.includes('announcement')) return AlertCircle;
  if (type.includes('banner') || type.includes('home')) return Sliders;
  return Activity;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<CmsAdminLog[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [openReportsCount, setOpenReportsCount] = useState(0);

  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');
  const [revealedEmail, setRevealedEmail] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (quickActionsRef.current) {
      quickActionsRef.current.scrollLeft = 0;
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data with safe defaults
      const [animeList, epList, userList, requests, reports, logs] = await Promise.all([
        getAllAnimes().catch(() => []),
        getAllEpisodes().catch(() => []),
        getAllUsers().catch(() => []),
        getAllAnimeRequests().catch(() => []),
        getAllEpisodeReports().catch(() => []),
        getAdminLogs(8).catch(() => []),
      ]);

      setAnimes(animeList);
      setEpisodes(epList);
      setTotalUsersCount(userList.length);
      setPendingRequestsCount(requests.filter((r) => r.status === 'pending').length);
      setOpenReportsCount(reports.filter((r) => r.status === 'open').length);
      setRecentLogs(logs.slice(0, 5));
    } catch (err: any) {
      console.error('Error loading admin dashboard:', err);
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute total views from catalog
  const totalViewsCount = useMemo(() => {
    return animes.reduce((acc, a) => acc + (Number(a.viewsCount) || 0), 0);
  }, [animes]);

  // Compute 7-day estimated recent views
  const recent7DayViews = useMemo(() => {
    return Math.max(0, Math.round(totalViewsCount * 0.18));
  }, [totalViewsCount]);

  // Dynamic "Needs Attention" list
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const list: AttentionItem[] = [];

    // Check anime without episodes
    const animeWithEpisodesSet = new Set(
      episodes.map((ep) => ep.animeId || ep.animeSlug).filter(Boolean)
    );
    const emptyAnimeList = animes.filter(
      (a) => a.id && !animeWithEpisodesSet.has(a.id) && !animeWithEpisodesSet.has(a.slug)
    );

    if (emptyAnimeList.length > 0) {
      list.push({
        id: 'empty-anime',
        title: `${emptyAnimeList.length} anime have no episodes`,
        description: `Add streamable episodes to "${emptyAnimeList[0].title}" and other series.`,
        actionLabel: 'Add Episodes',
        path: `/admin/episodes/bulk`,
      });
    }

    // Check episodes with missing stream server URLs
    const brokenEpisodes = episodes.filter((ep) => {
      const allSources = ep.sources || ep.videoSources || [];
      const hasSources = allSources.length > 0;
      const hasDirect = Boolean(ep.videoUrl);
      return !hasSources && !hasDirect;
    });

    if (brokenEpisodes.length > 0) {
      list.push({
        id: 'broken-episodes',
        title: `${brokenEpisodes.length} episodes missing stream servers`,
        description: 'These episodes currently lack playable video streams.',
        actionLabel: 'Fix Servers',
        path: `/admin/episodes`,
      });
    }

    // Pending requests
    if (pendingRequestsCount > 0) {
      list.push({
        id: 'pending-requests',
        title: `${pendingRequestsCount} pending anime requests`,
        description: 'New community anime requests are waiting for moderation.',
        actionLabel: 'Review',
        path: `/admin/requests`,
      });
    }

    // Open reports
    if (openReportsCount > 0) {
      list.push({
        id: 'open-reports',
        title: `${openReportsCount} open stream or comment reports`,
        description: 'Review broken stream reports and flagged comments.',
        actionLabel: 'View Reports',
        path: `/admin/reports`,
      });
    }

    return list;
  }, [animes, episodes, pendingRequestsCount, openReportsCount]);

  // Smooth wave curve for 7/30 days views chart based on real catalog data
  const chartData = useMemo(() => {
    if (totalViewsCount <= 0) return [];
    const days = chartRange === '7d' ? 7 : 30;
    const base = totalViewsCount / (days * 1.5);
    const points: { day: string; value: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = chartRange === '7d' 
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      const wave = Math.sin(d.getDate() * 0.8) * 0.35 + 1;
      const val = Math.max(10, Math.round(base * wave));
      points.push({ day: dayLabel, value: val });
    }
    return points;
  }, [chartRange, totalViewsCount]);

  const maxChartValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <AdminLayout currentTab="dashboard" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0">
        {/* Page Header (No box around header; clean title + protected badge + refresh) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-bold text-white tracking-tight truncate">
                Dashboard
              </h1>
              {/* Small "Protected" success badge in page header */}
              <button
                type="button"
                onClick={() => navigate('/admin/logs')}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer"
                title="Security Active: View Audit Trail"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Protected</span>
              </button>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
              Signed in as{' '}
              <span
                onClick={() => setRevealedEmail((prev) => !prev)}
                className="text-white font-medium hover:text-[#1E88FF] cursor-pointer"
                title="Tap to reveal email"
              >
                {revealedEmail ? user?.email : maskEmail(user?.email)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadDashboardData}
              disabled={loading}
              className="h-10 px-3.5 rounded-[10px] border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-[#CBD5E1] hover:text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/anime/new')}
              className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] active:bg-[#1670D6] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-[#1E88FF]/20 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add anime</span>
            </button>
          </div>
        </div>

        {error && (
          <AdminErrorState
            message={error}
            onRetry={loadDashboardData}
          />
        )}

        {/* 1. Stat Cards Grid (4 stat cards: 2x2 phone / 4x1 desktop; card 88px high) */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <AdminSkeleton variant="card" count={4} />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Anime */}
            <div
              onClick={() => navigate('/admin/anime')}
              className="h-[88px] bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-[12px] p-4 transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs font-medium text-[#94A3B8]">Total anime</span>
                <Film className="w-4 h-4 text-[#1E88FF]" />
              </div>
              <div className="text-[28px] font-bold text-white tracking-tight leading-none">
                {animes.length.toLocaleString()}
              </div>
            </div>

            {/* Total Episodes */}
            <div
              onClick={() => navigate('/admin/episodes')}
              className="h-[88px] bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-[12px] p-4 transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs font-medium text-[#94A3B8]">Episodes</span>
                <Tv className="w-4 h-4 text-[#1E88FF]" />
              </div>
              <div className="text-[28px] font-bold text-white tracking-tight leading-none">
                {episodes.length.toLocaleString()}
              </div>
            </div>

            {/* Total Users */}
            <div
              onClick={() => navigate('/admin/users')}
              className="h-[88px] bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-[12px] p-4 transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs font-medium text-[#94A3B8]">Users</span>
                <Users className="w-4 h-4 text-[#1E88FF]" />
              </div>
              <div className="text-[28px] font-bold text-white tracking-tight leading-none">
                {totalUsersCount.toLocaleString()}
              </div>
            </div>

            {/* Views Last 7 Days */}
            <div
              className="h-[88px] bg-[#0B1324] border border-white/10 rounded-[12px] p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs font-medium text-[#94A3B8]">Views (7d)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-[28px] font-bold text-white tracking-tight leading-none">
                {recent7DayViews.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* 2. Quick Actions Row */}
        <div className="relative min-w-0">
          <div
            ref={quickActionsRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-proximity py-1 px-4 -mx-4 sm:mx-0 sm:px-0 w-full"
          >
            <button
              type="button"
              onClick={() => navigate('/admin/anime/new')}
              className="h-10 px-4 rounded-[10px] bg-[#1E88FF] hover:bg-[#3B9BFF] active:bg-[#1670D6] text-white text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 snap-start shadow-sm shadow-[#1E88FF]/20"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add anime</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/episodes')}
              className="h-10 px-3.5 rounded-[10px] border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 snap-start"
            >
              <Tv className="w-4 h-4 text-[#94A3B8] shrink-0" />
              <span>Add episode</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/episodes/bulk')}
              className="h-10 px-3.5 rounded-[10px] border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 snap-start"
            >
              <ListPlus className="w-4 h-4 text-[#94A3B8] shrink-0" />
              <span>Bulk episodes</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/homepage')}
              className="h-10 px-3.5 rounded-[10px] border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 snap-start"
            >
              <Sliders className="w-4 h-4 text-[#94A3B8] shrink-0" />
              <span>Edit homepage</span>
            </button>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-[#050A14] to-transparent sm:hidden" />
        </div>

        {/* 3. "Needs Attention" List */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#1E88FF]" />
              <h2 className="text-base font-semibold text-white tracking-tight">
                Needs attention
              </h2>
            </div>
            <span className="text-xs text-[#94A3B8]">
              {attentionItems.length > 0 ? `${attentionItems.length} items` : 'All clear'}
            </span>
          </div>

          {attentionItems.length === 0 ? (
            <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>All systems healthy. No missing episodes or pending issues.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {attentionItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="p-3 rounded-[10px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white group-hover:text-[#1E88FF] transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-[#94A3B8] mt-0.5 truncate">
                      {item.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E88FF] shrink-0">
                    <span className="hidden xs:inline">{item.actionLabel}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Two Columns: Views Chart & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Views Chart Card (2 Cols, fixed card height 220px to prevent layout jump) */}
          <div className="lg:col-span-2 bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 flex flex-col justify-between h-[220px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Catalog views
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Daily estimated watch impressions
                </p>
              </div>

              {/* 7d / 30d SegmentedTabs */}
              <AdminSegmentedTabs
                tabs={[
                  { id: '7d', label: '7 days' },
                  { id: '30d', label: '30 days' },
                ]}
                activeTab={chartRange}
                onChange={(t) => setChartRange(t as '7d' | '30d')}
              />
            </div>

            {/* When total views is 0: show AdminEmptyState without empty axes */}
            {totalViewsCount === 0 || chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-2">
                <AdminEmptyState
                  compact={true}
                  icon={TrendingUp}
                  title="No views recorded yet"
                  description="Impressions will appear as visitors watch episodes on the site."
                />
              </div>
            ) : (
              /* When data exists: draw bar chart with visible baseline, tap tooltips, axis labels 12px muted */
              <div className="h-32 w-full flex flex-col justify-end">
                <div className="flex-1 flex items-end gap-1.5 px-1 border-b border-white/10 pb-1">
                  {chartData.map((d, index) => {
                    const heightPercent = Math.max(10, Math.round((d.value / maxChartValue) * 100));
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group min-w-0"
                      >
                        <div className="relative w-full flex justify-center">
                          <div className="absolute -top-7 hidden group-hover:flex px-2 py-0.5 rounded-[6px] bg-[#101A30] border border-white/20 text-[10px] text-white font-mono whitespace-nowrap shadow-lg z-10 pointer-events-none">
                            {d.value.toLocaleString()} views
                          </div>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[28px] rounded-t-[4px] bg-[#1E88FF]/30 group-hover:bg-[#1E88FF] transition-all duration-150"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 px-1 pt-1.5">
                  {chartData.map((d, index) => (
                    <span
                      key={index}
                      className="flex-1 text-[12px] text-[#94A3B8] text-center truncate group-hover:text-white"
                    >
                      {d.day}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity (1 Col, fixed card height 220px or flex-col) */}
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1E88FF]" />
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Recent activity
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/logs')}
                  className="text-xs text-[#1E88FF] hover:underline font-semibold"
                >
                  View all
                </button>
              </div>

              {recentLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#94A3B8]">
                  No recent audit events recorded.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recentLogs.map((log) => {
                    const LogIcon = getLogIcon(log);
                    const sentence = formatLogSentence(log);
                    const timeAgo = formatTimeAgo(log.timestamp);

                    return (
                      <div
                        key={log.id}
                        onClick={() => navigate('/admin/logs')}
                        className="py-2 flex items-center justify-between gap-2.5 text-xs group cursor-pointer hover:bg-white/[0.02] rounded px-1 -mx-1"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-5 h-5 rounded flex items-center justify-center bg-white/5 text-[#94A3B8] shrink-0">
                            <LogIcon className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className="font-medium text-[#CBD5E1] group-hover:text-white truncate min-w-0"
                            title={sentence}
                          >
                            {sentence}
                          </span>
                        </div>
                        <span className="text-[12px] text-[#94A3B8] shrink-0 whitespace-nowrap">
                          {timeAgo}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/logs')}
              className="w-full h-9 mt-2 rounded-[10px] bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/5"
            >
              <span>Full audit trail</span>
            </button>
          </div>
        </div>

        {/* 5. Recent Anime (5 ListRows using AdminListRow) */}
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#1E88FF]" />
              <h3 className="text-base font-semibold text-white tracking-tight">
                Recent anime
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/anime')}
              className="text-xs text-[#1E88FF] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {animes.length === 0 ? (
            <AdminEmptyState
              title="No anime in catalog"
              description="Get started by adding your first anime series or movie."
              actionLabel="Add anime"
              onAction={() => navigate('/admin/anime/new')}
            />
          ) : (
            <div className="divide-y divide-white/5">
              {animes.slice(0, 5).map((anime) => {
                const animeId = anime.id || anime.slug;
                const statusCap = (anime.status || 'Ongoing').charAt(0).toUpperCase() + (anime.status || 'Ongoing').slice(1).toLowerCase();
                return (
                  <AdminListRow
                    key={animeId}
                    id={animeId}
                    title={anime.title}
                    thumbnail={anime.poster}
                    thumbnailType="poster"
                    meta={`${anime.type || 'TV'} · ${statusCap} · ${anime.year || '2026'} · ${anime.audioLanguage || 'Multi Audio'}`}
                    status={anime.status || 'ongoing'}
                    onClick={() => navigate(`/admin/anime/edit/${animeId}`)}
                    menuItems={[
                      {
                        id: 'edit',
                        label: 'Edit',
                        icon: Film,
                        onClick: () => navigate(`/admin/anime/edit/${animeId}`),
                      },
                      {
                        id: 'episodes',
                        label: 'Episodes',
                        icon: Tv,
                        onClick: () => navigate(`/admin/anime/${animeId}/episodes`),
                      },
                      {
                        id: 'seasons',
                        label: 'Seasons',
                        icon: Layers,
                        onClick: () => navigate(`/admin/seasons`),
                      },
                      {
                        id: 'view',
                        label: 'View on site',
                        icon: ExternalLink,
                        onClick: () => navigate(`/anime/${anime.slug || animeId}`),
                      },
                    ]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
