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
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminListRow,
  AdminStatusBadge,
  AdminEmptyState,
  AdminSkeleton,
  AdminConfirmDialog,
} from '../../components/admin';
import {
  Film,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Mail,
  Trash2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface AdminRequestsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

type RequestTab = 'all' | 'pending' | 'approved' | 'done' | 'rejected';

function formatTimestamp(ts: any): string {
  if (!ts) return '—';
  try {
    let date: Date;
    if (ts.toDate && typeof ts.toDate === 'function') {
      date = ts.toDate();
    } else if (ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else if (typeof ts === 'string' || typeof ts === 'number') {
      date = new Date(ts);
    } else {
      return '—';
    }
    if (isNaN(date.getTime())) return '—';

    const now = Date.now();
    const diff = Math.floor((now - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const AdminRequestsView: React.FC<AdminRequestsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AnimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestTab>('all');
  const [requestToDelete, setRequestToDelete] = useState<AnimeRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const items = await getAllAnimeRequests();
      setRequests(items);
    } catch (err) {
      console.error('Failed to load anime requests:', err);
      onShowMessage('Failed to load anime requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusChange = async (id: string, animeTitle: string, newStatus: RequestStatus) => {
    try {
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
      onShowMessage(`Request for "${animeTitle}" marked as ${newStatus}.`);
    } catch (err: any) {
      onShowMessage(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!requestToDelete?.id) return;
    const reqTitle = requestToDelete.animeTitle || (requestToDelete as any).title || 'Untitled Request';
    try {
      setDeleting(true);
      await deleteAnimeRequest(requestToDelete.id);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Anime Request',
        'Requests',
        requestToDelete.id,
        reqTitle
      );
      setRequests((prev) => prev.filter((r) => r.id !== requestToDelete.id));
      onShowMessage(`Deleted request for "${reqTitle}".`);
      setRequestToDelete(null);
    } catch (err: any) {
      onShowMessage(`Failed to delete request: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Filter counts for tabs
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved' || r.status === 'in_progress').length;
  const doneCount = requests.filter((r) => r.status === 'completed' || r.status === 'fulfilled').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const tabs = [
    { id: 'all' as const, label: 'All', count: requests.length },
    { id: 'pending' as const, label: 'Pending', count: pendingCount },
    { id: 'approved' as const, label: 'Approved', count: approvedCount },
    { id: 'done' as const, label: 'Done', count: doneCount },
    { id: 'rejected' as const, label: 'Rejected', count: rejectedCount },
  ];

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'approved') return r.status === 'approved' || r.status === 'in_progress';
    if (activeTab === 'done') return r.status === 'completed' || r.status === 'fulfilled';
    if (activeTab === 'rejected') return r.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'approved':
      case 'in_progress':
        return <AdminStatusBadge status="live" label="Approved" />;
      case 'completed':
      case 'fulfilled':
        return <AdminStatusBadge status="live" label="Done" />;
      case 'rejected':
        return <AdminStatusBadge status="archived" label="Rejected" />;
      case 'pending':
      default:
        return <AdminStatusBadge status="pending" label="Pending" />;
    }
  };

  return (
    <AdminLayout currentTab="requests" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-20">
        {/* Page Header */}
        <AdminPageHeader
          title="Anime Community Requests"
          description="Visitor submissions for requested series, movies, and missing seasons"
          primaryAction={{
            label: 'Add anime to catalog',
            icon: Plus,
            onClick: () => navigate('/admin/anime/new'),
          }}
        />

        {/* Segmented Tabs */}
        <AdminSegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        {loading ? (
          <div className="space-y-3">
            <AdminSkeleton variant="table-row" count={4} />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-6 max-h-[160px] flex items-center justify-center">
            <AdminEmptyState
              icon={Film}
              title={
                activeTab === 'all'
                  ? 'No anime requests yet'
                  : `No ${activeTab} requests found`
              }
              description="New visitor submissions from /requests will appear here."
              compact
            />
          </div>
        ) : (
          <div className="bg-[#0B1324] border border-white/10 rounded-[12px] divide-y divide-white/5 overflow-hidden">
            {filteredRequests.map((req) => {
              const reqTitle = req.animeTitle || (req as any).title || 'Untitled Request';
              const reqNotes = req.notes || req.message || req.reason || (req as any).preferredLanguage || '';
              const requester = req.userName || req.userEmail || 'Anonymous Visitor';
              const dateText = formatTimestamp(req.createdAt);
              const metaText = `${requester} · ${dateText}${reqNotes ? ` · "${reqNotes}"` : ''}`;

              return (
                <AdminListRow
                  key={req.id || `${reqTitle}-${dateText}`}
                  id={req.id || ''}
                  title={reqTitle}
                  meta={metaText}
                  badge={getStatusBadge(req.status)}
                  menuItems={[
                    ...(req.status !== 'approved'
                      ? [
                          {
                            id: 'approve',
                            label: 'Approve request',
                            icon: CheckCircle2,
                            onClick: () => req.id && handleStatusChange(req.id, reqTitle, 'approved'),
                          },
                        ]
                      : []),
                    ...(req.status !== 'completed' && req.status !== 'fulfilled'
                      ? [
                          {
                            id: 'done',
                            label: 'Mark as done',
                            icon: Check,
                            onClick: () => req.id && handleStatusChange(req.id, reqTitle, 'completed'),
                          },
                        ]
                      : []),
                    ...(req.status !== 'rejected'
                      ? [
                          {
                            id: 'reject',
                            label: 'Reject request',
                            icon: XCircle,
                            onClick: () => req.id && handleStatusChange(req.id, reqTitle, 'rejected'),
                          },
                        ]
                      : []),
                    {
                      id: 'draft',
                      label: 'Create anime draft',
                      icon: Plus,
                      onClick: () =>
                        navigate(`/admin/anime/new?title=${encodeURIComponent(reqTitle)}`),
                    },
                    ...(req.userEmail
                      ? [
                          {
                            id: 'reply',
                            label: `Email requester (${req.userEmail})`,
                            icon: Mail,
                            onClick: () => {
                              window.location.href = `mailto:${req.userEmail}?subject=${encodeURIComponent(
                                `Regarding your request: ${reqTitle}`
                              )}`;
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'delete',
                      label: 'Delete request',
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setRequestToDelete(req),
                    },
                  ]}
                />
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={!!requestToDelete}
          onClose={() => setRequestToDelete(null)}
          onConfirm={handleDelete}
          title="Delete anime request?"
          consequence={`Permanently remove the submission for "${requestToDelete?.animeTitle || (requestToDelete as any)?.title || 'Untitled Request'}". This action cannot be reversed.`}
          confirmLabel="Delete request"
          isLoading={deleting}
        />
      </div>
    </AdminLayout>
  );
};
