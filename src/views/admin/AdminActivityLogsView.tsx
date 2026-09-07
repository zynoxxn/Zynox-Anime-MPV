import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useAuth } from '../../lib/auth';
import type { CmsAdminLog } from '../../types/cms';
import { getAdminLogs } from '../../lib/firestore/cms';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Shield,
  FileText,
} from 'lucide-react';

interface AdminActivityLogsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminActivityLogsView: React.FC<AdminActivityLogsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CmsAdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getAdminLogs(100);
      setLogs(list);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (log.action || '').toLowerCase().includes(q) ||
      (log.userEmail || '').toLowerCase().includes(q) ||
      (log.details ? log.details.toLowerCase().includes(q) : false);
    const matchesType = targetTypeFilter === 'all' || log.targetType === targetTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout currentTab="logs" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>Security & Audit Trail</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Admin Audit Activity Logs
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Immutable logging of all admin modifications, deletions, content additions, and setting changes.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit logs by admin email, action name, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050A14] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full sm:w-auto"
          >
            <option value="all">All Modules</option>
            <option value="Anime">Anime</option>
            <option value="Episode">Episodes</option>
            <option value="Schedule">Schedule</option>
            <option value="HeroBanner">Hero Banners</option>
            <option value="HomepageCMS">Homepage Layout</option>
            <option value="genres">Genres</option>
            <option value="NavigationCMS">Navigation</option>
            <option value="SEO_CMS">SEO</option>
            <option value="LegalCMS">Legal Pages</option>
          </select>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
            No activity logs match your search.
          </div>
        ) : (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{log.action}</span>
                        <span className="text-[10px] font-mono bg-white/10 text-[#94A3B8] px-2 py-0.5 rounded">
                          {log.targetType}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#94A3B8] flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-400 font-medium">{log.userEmail}</span> •
                        {log.details && <span className="truncate">{log.details}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#64748B] font-mono shrink-0 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
