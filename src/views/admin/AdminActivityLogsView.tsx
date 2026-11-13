import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsAdminLog } from '../../types/cms';
import { getAdminLogs } from '../../lib/firestore/cms';
import {
  AdminPageHeader,
  AdminSelect,
  AdminListRow,
  AdminStatusBadge,
  AdminSkeleton,
  AdminEmptyState,
  AdminSearchInput,
} from '../../components/admin';
import {
  Activity,
  Film,
  Tv,
  Calendar,
  Settings,
  Users,
  AlertTriangle,
  FileText,
  Globe,
  Database,
  Download,
  Clock,
  User,
  Shield,
  X,
  RefreshCw,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { maskEmail } from '../../lib/admin-roles';

interface AdminActivityLogsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules' },
  { value: 'Anime', label: 'Anime Library' },
  { value: 'Episode', label: 'Episodes' },
  { value: 'Schedule', label: 'Schedule' },
  { value: 'SiteSettings', label: 'Settings & Branding' },
  { value: 'Users', label: 'Users & Roles' },
  { value: 'Reports', label: 'Reports' },
  { value: 'Requests', label: 'Requests' },
  { value: 'SEO', label: 'SEO & Metadata' },
  { value: 'LegalCMS', label: 'Legal Pages' },
  { value: 'Database', label: 'Database & Seeding' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

function parseLogTimestamp(ts: any): { fullDate: string; timeAgo: string; millis: number } {
  if (!ts) return { fullDate: '—', timeAgo: '—', millis: 0 };
  try {
    let date: Date;
    if (ts.toDate && typeof ts.toDate === 'function') {
      date = ts.toDate();
    } else if (typeof ts === 'object' && typeof ts.seconds === 'number') {
      date = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
    } else if (typeof ts === 'number') {
      date = new Date(ts);
    } else if (typeof ts === 'string') {
      const parsed = Date.parse(ts);
      if (!isNaN(parsed)) {
        date = new Date(parsed);
      } else {
        return { fullDate: '—', timeAgo: '—', millis: 0 };
      }
    } else {
      return { fullDate: '—', timeAgo: '—', millis: 0 };
    }

    const millis = date.getTime();
    if (isNaN(millis)) {
      return { fullDate: '—', timeAgo: '—', millis: 0 };
    }

    const now = Date.now();
    const diff = Math.floor((now - millis) / 1000);
    let timeAgo = 'just now';
    if (diff >= 60 && diff < 3600) {
      timeAgo = `${Math.floor(diff / 60)}m ago`;
    } else if (diff >= 3600 && diff < 86400) {
      timeAgo = `${Math.floor(diff / 3600)}h ago`;
    } else if (diff >= 86400 && diff < 604800) {
      timeAgo = `${Math.floor(diff / 86400)}d ago`;
    } else if (diff >= 604800) {
      timeAgo = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const fullDate = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return { fullDate, timeAgo, millis };
  } catch {
    return { fullDate: '—', timeAgo: '—', millis: 0 };
  }
}

function generateLogSentence(log: CmsAdminLog, currentUserEmail?: string): string {
  const isActor =
    currentUserEmail &&
    log.userEmail?.toLowerCase() === currentUserEmail.toLowerCase();
  const actor = isActor ? 'You' : log.userEmail ? maskEmail(log.userEmail) : 'Admin';
  const action = (log.action || '').trim();
  const target = log.details || log.targetId || '';

  const lowAction = action.toLowerCase();
  if (lowAction.includes('update_popup_notice') || lowAction.includes('cms_popup_notice')) {
    return `${actor} updated website popup notice`;
  }
  if (lowAction.startsWith('created anime')) {
    return `${actor} created anime ${target ? `'${target}'` : ''}`;
  }
  if (lowAction.startsWith('deleted anime')) {
    return `${actor} deleted anime ${target ? `'${target}'` : ''}`;
  }
  if (lowAction.startsWith('updated anime')) {
    return `${actor} updated anime ${target ? `'${target}'` : ''}`;
  }
  if (lowAction.startsWith('created episode')) {
    return `${actor} created episode ${target ? `'${target}'` : ''}`;
  }
  if (lowAction.startsWith('updated episode')) {
    return `${actor} updated episode ${target ? `'${target}'` : ''}`;
  }
  if (lowAction.startsWith('deleted episode')) {
    return `${actor} deleted episode ${target ? `'${target}'` : ''}`;
  }
  if (lowAction.includes('seed')) {
    return `${actor} seeded database catalog`;
  }
  if (lowAction.includes('setting')) {
    return `${actor} updated site settings & branding`;
  }
  if (lowAction.includes('schedule')) {
    return `${actor} updated weekly release schedule`;
  }
  if (lowAction.includes('role')) {
    return `${actor} updated staff role privileges`;
  }
  if (lowAction.includes('seo')) {
    return `${actor} updated SEO metadata configuration`;
  }
  if (lowAction.includes('legal')) {
    return `${actor} updated legal compliance policies`;
  }

  const clean = action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return `${actor} ${clean}${target ? `: '${target}'` : ''}`;
}

function getModuleIcon(type: string) {
  switch (type) {
    case 'Anime':
      return Film;
    case 'Episode':
      return Tv;
    case 'Schedule':
      return Calendar;
    case 'SiteSettings':
      return Settings;
    case 'Users':
      return Users;
    case 'Reports':
      return AlertTriangle;
    case 'Requests':
      return FileText;
    case 'SEO':
      return Globe;
    case 'Database':
      return Database;
    case 'LegalCMS':
      return FileText;
    default:
      return Activity;
  }
}

export const AdminActivityLogsView: React.FC<AdminActivityLogsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CmsAdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [displayCount, setDisplayCount] = useState(25);

  // Detail drawer
  const [selectedLog, setSelectedLog] = useState<CmsAdminLog | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getAdminLogs(150);
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      onShowMessage('Failed to load audit activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    try {
      const headers = ['Timestamp', 'Admin Email', 'Action', 'Module', 'Target ID', 'Details'];
      const rows = logs.map((l) => {
        const { fullDate } = parseLogTimestamp(l.timestamp);
        return [
          `"${fullDate}"`,
          `"${maskEmail(l.userEmail || '')}"`,
          `"${(l.action || '').replace(/"/g, '""')}"`,
          `"${l.targetType || ''}"`,
          `"${l.targetId || ''}"`,
          `"${(l.details || '').replace(/"/g, '""')}"`,
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `zynox-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowMessage('Exported activity logs to CSV.');
    } catch {
      onShowMessage('Failed to export CSV file.');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase().trim();
    const sentence = generateLogSentence(log, user?.email || '').toLowerCase();
    const matchesSearch =
      !q ||
      sentence.includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.userEmail || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q);

    const matchesModule = moduleFilter === 'all' || log.targetType === moduleFilter;

    let matchesDate = true;
    if (dateRangeFilter !== 'all') {
      const { millis } = parseLogTimestamp(log.timestamp);
      if (millis > 0) {
        const now = Date.now();
        const diffMs = now - millis;
        if (dateRangeFilter === '24h') matchesDate = diffMs <= 86400000;
        else if (dateRangeFilter === '7d') matchesDate = diffMs <= 7 * 86400000;
        else if (dateRangeFilter === '30d') matchesDate = diffMs <= 30 * 86400000;
      }
    }

    return matchesSearch && matchesModule && matchesDate;
  });

  const visibleLogs = filteredLogs.slice(0, displayCount);
  const hasMore = filteredLogs.length > displayCount;

  return (
    <AdminLayout currentTab="logs" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-20">
        {/* Page Header */}
        <AdminPageHeader
          title="Audit Activity Logs"
          description="Tamper-evident record of all administrative content additions, edits, and deletions"
          secondaryActions={[
            {
              label: 'Refresh',
              icon: RefreshCw,
              onClick: loadData,
            },
            {
              label: 'Export CSV',
              icon: Download,
              onClick: handleExportCsv,
            },
          ]}
        />

        {/* Filters Row: Search + Module + Date Range */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <AdminSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search actions, masked emails, or targets..."
            />
          </div>
          <div className="sm:col-span-3">
            <AdminSelect
              value={moduleFilter}
              options={MODULE_OPTIONS}
              onChange={(val) => setModuleFilter(String(val))}
            />
          </div>
          <div className="sm:col-span-3">
            <AdminSelect
              value={dateRangeFilter}
              options={DATE_RANGE_OPTIONS}
              onChange={(val) => setDateRangeFilter(String(val))}
            />
          </div>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="space-y-3">
            <AdminSkeleton variant="table-row" count={6} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-6 max-h-[160px] flex items-center justify-center">
            <AdminEmptyState
              icon={Activity}
              title="No activity logs match your filter"
              description="Administrative actions across all modules are logged here."
              compact
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#0B1324] border border-white/10 rounded-[12px] divide-y divide-white/5 overflow-hidden">
              {visibleLogs.map((log) => {
                const sentence = generateLogSentence(log, user?.email || '');
                const { fullDate, timeAgo } = parseLogTimestamp(log.timestamp);
                const Icon = getModuleIcon(log.targetType);

                return (
                  <AdminListRow
                    key={log.id}
                    id={log.id}
                    title={sentence}
                    meta={`Logged ${fullDate} · ${maskEmail(log.userEmail || '')}`}
                    badge={
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#94A3B8] font-mono shrink-0">
                          {timeAgo}
                        </span>
                        <AdminStatusBadge status="draft" label={log.targetType || 'System'} />
                      </div>
                    }
                    onClick={() => setSelectedLog(log)}
                  />
                );
              })}
            </div>

            {/* Load More 25 per page */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setDisplayCount((prev) => prev + 25)}
                  className="h-10 px-5 rounded-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Load 25 more ({filteredLogs.length - displayCount} remaining)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Read-Only Log Detail Drawer */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md h-full bg-[#0B1324] border-l border-white/10 p-5 sm:p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between animate-fadeIn">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1E88FF]" />
                    <h3 className="text-sm font-semibold text-white">Audit Event Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="w-7 h-7 rounded hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Event Summary */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Event Summary</span>
                  <p className="text-sm font-bold text-white leading-snug">
                    {generateLogSentence(selectedLog, user?.email || '')}
                  </p>
                </div>

                {/* Fields */}
                <div className="bg-[#101A30] border border-white/5 rounded-[10px] p-4 space-y-3 text-xs">
                  <div>
                    <span className="text-[#94A3B8] block mb-0.5">Timestamp</span>
                    <span className="font-mono text-white">
                      {parseLogTimestamp(selectedLog.timestamp).fullDate}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[#94A3B8] block mb-0.5">Admin Operator</span>
                    <span className="font-mono text-white">{maskEmail(selectedLog.userEmail || '')}</span>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[#94A3B8] block mb-0.5">Target Module</span>
                    <span className="text-white font-semibold">{selectedLog.targetType || 'System'}</span>
                  </div>

                  {selectedLog.targetId && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[#94A3B8] block mb-0.5">Target Record ID</span>
                      <span className="font-mono text-white text-[11px] break-all">{selectedLog.targetId}</span>
                    </div>
                  )}

                  {selectedLog.details && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[#94A3B8] block mb-0.5">Additional Details</span>
                      <p className="text-[#CBD5E1] leading-relaxed break-words">{selectedLog.details}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="w-full h-10 rounded-[10px] bg-white/5 hover:bg-white/10 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
