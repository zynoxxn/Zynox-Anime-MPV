import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { AnimeRequest, RequestStatus } from '../../types/library';
import {
  getAllAnimeRequests,
  updateRequestStatus,
  deleteAnimeRequest,
} from '../../lib/firestore/community';
import { logAdminActivity } from '../../lib/firestore/cms';
import { AdminLayout } from './AdminLayout';
import { Film, Trash2, CheckCircle2, Clock, XCircle, Loader2, MessageSquare } from 'lucide-react';

interface AdminRequestsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminRequestsView: React.FC<AdminRequestsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AnimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const items = await getAllAnimeRequests();
      setRequests(items);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusChange = async (id: string, animeTitle: string, newStatus: RequestStatus) => {
    await updateRequestStatus(id, newStatus);
    await logAdminActivity(
      user?.uid || '',
      user?.email || '',
      `Changed Anime Request Status to ${newStatus}`,
      'Requests',
      id,
      animeTitle
    );
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    onShowMessage(`Updated request status to ${newStatus}.`);
  };

  const handleDelete = async (id: string, animeTitle: string) => {
    if (window.confirm('Delete this anime request?')) {
      await deleteAnimeRequest(id);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Anime Request',
        'Requests',
        id,
        animeTitle
      );
      setRequests((prev) => prev.filter((r) => r.id !== id));
      onShowMessage('Anime request deleted.');
    }
  };

  const filtered = requests.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  return (
    <AdminLayout currentTab="requests" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Community Inbox</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Anime Title Requests
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Total requests: {requests.length} &bull; Manage user-submitted anime requests and update fulfillment status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#050A14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="all">All Statuses ({requests.length})</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="fulfilled">Fulfilled / Added</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="py-20 text-center text-xs text-[#94A3B8]">Loading community requests...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
            No anime requests found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((req) => (
              <div
                key={req.id}
                className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-400 shrink-0" />
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {req.title}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        req.status === 'fulfilled'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : req.status === 'approved'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-[#94A3B8] leading-relaxed bg-[#050A14] p-3 rounded-2xl border border-white/5">
                      "{req.notes}"
                    </p>
                  )}

                  <div className="text-[11px] text-[#64748B] flex items-center gap-2">
                    <span>From: {req.userEmail || 'Anonymous User'}</span>
                    <span>•</span>
                    <span>{req.year ? `Year ${req.year}` : 'Year N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(req.id, req.title, 'approved')}
                      className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[11px] font-bold rounded-lg transition-all"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(req.id, req.title, 'fulfilled')}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                    >
                      Fulfilled
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(req.id, req.title, 'rejected')}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-bold rounded-lg transition-all"
                    >
                      Reject
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(req.id, req.title)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500 text-[#94A3B8] hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
