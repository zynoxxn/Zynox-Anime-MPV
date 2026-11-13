import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type {
  EpisodeReport,
  ReportStatus,
  CommentReportItem,
  CommentReportStatus,
} from '../../types/library';
import {
  getAllEpisodeReports,
  updateReportStatus,
  deleteEpisodeReport,
} from '../../lib/firestore/community';
import {
  getAllCommentReports,
  updateCommentReportStatus,
  deleteComment,
} from '../../lib/firestore/comments';
import { toggleUserCommentRestriction } from '../../lib/firestore/admin-users';
import { logAdminActivity } from '../../lib/firestore/cms';
import { AdminLayout } from './AdminLayout';
import {
  AdminPageHeader,
  AdminSegmentedTabs,
  AdminListRow,
  AdminStatusBadge,
  AdminEmptyState,
  AdminSelectionBar,
  AdminConfirmDialog,
  AdminSkeleton,
} from '../../components/admin';
import {
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Ban,
  Clock,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface AdminReportsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

function formatReportTime(ts: any): string {
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'streams' | 'comments'>('streams');

  // Streams / Episode reports
  const [episodeReports, setEpisodeReports] = useState<EpisodeReport[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);

  // Comments reports
  const [commentReports, setCommentReports] = useState<CommentReportItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  // Selection mode for bulk resolve
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm dialogs
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'stream' | 'comment'; label: string } | null>(null);
  const [banTarget, setBanTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchEpisodeReports = async () => {
    try {
      setLoadingEpisodes(true);
      const items = await getAllEpisodeReports();
      setEpisodeReports(items);
    } catch (err) {
      console.warn('Could not load stream reports:', err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const fetchCommentReports = async () => {
    try {
      setLoadingComments(true);
      const items = await getAllCommentReports();
      setCommentReports(items);
    } catch (err) {
      console.warn('Could not load comment reports:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchEpisodeReports();
    fetchCommentReports();
  }, [user, isAdmin]);

  // Clear selection on tab switch
  const handleTabChange = (tab: 'streams' | 'comments') => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  // Toggle single item selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Episode report actions
  const handleMarkStreamFixed = async (id: string, animeTitle: string) => {
    try {
      await updateReportStatus(id, 'resolved');
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Marked Stream Report as Fixed',
        'Reports',
        id,
        animeTitle
      );
      setEpisodeReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'resolved' } : r))
      );
      onShowMessage(`Stream report for "${animeTitle}" marked as fixed.`);
    } catch (err: any) {
      onShowMessage(`Failed to update report: ${err.message}`);
    }
  };

  const handleDeleteStreamReport = async (id: string) => {
    try {
      setIsProcessing(true);
      await deleteEpisodeReport(id);
      setEpisodeReports((prev) => prev.filter((r) => r.id !== id));
      onShowMessage('Stream report deleted.');
      setDeleteTarget(null);
    } catch (err: any) {
      onShowMessage(`Failed to delete report: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Comment report actions
  const handleApproveComment = async (reportId: string, commentId: string) => {
    try {
      await updateCommentReportStatus(reportId, 'dismissed');
      setCommentReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r))
      );
      onShowMessage('Comment approved and report dismissed.');
    } catch (err: any) {
      onShowMessage(`Failed to approve comment: ${err.message}`);
    }
  };

  const handleDeleteCommentItem = async (reportId: string, commentId: string) => {
    try {
      setIsProcessing(true);
      await deleteComment(commentId);
      await updateCommentReportStatus(reportId, 'resolved');
      setCommentReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r))
      );
      onShowMessage('Comment deleted and report marked resolved.');
      setDeleteTarget(null);
    } catch (err: any) {
      onShowMessage(`Failed to delete comment: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    try {
      setIsProcessing(true);
      await toggleUserCommentRestriction(userId, true, userName);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        `Restricted User Comments (${userName})`,
        'Users',
        userId,
        userName
      );
      onShowMessage(`User "${userName}" has been banned from posting comments.`);
      setBanTarget(null);
    } catch (err: any) {
      onShowMessage(`Failed to restrict user: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Resolve
  const handleBulkResolve = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      if (activeTab === 'streams') {
        await Promise.all(ids.map((id) => updateReportStatus(id, 'resolved')));
        setEpisodeReports((prev) =>
          prev.map((r) => (r.id && ids.includes(r.id) ? { ...r, status: 'resolved' } : r))
        );
      } else {
        await Promise.all(ids.map((id) => updateCommentReportStatus(id, 'resolved')));
        setCommentReports((prev) =>
          prev.map((r) => (r.id && ids.includes(r.id) ? { ...r, status: 'resolved' } : r))
        );
      }
      onShowMessage(`Resolved ${ids.length} reports.`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err: any) {
      onShowMessage(`Failed bulk resolve: ${err.message}`);
    }
  };

  const tabs = [
    { id: 'streams' as const, label: 'Streams', count: episodeReports.filter((r) => r.status === 'open').length },
    { id: 'comments' as const, label: 'Comments', count: commentReports.filter((r) => r.status === 'open' || r.status === 'pending').length },
  ];

  return (
    <AdminLayout currentTab="reports" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="space-y-6 min-w-0 pb-20">
        {/* Page Header */}
        <AdminPageHeader
          title="Reports & Moderation"
          description="Review broken stream playback issues and community flagged comments"
          secondaryActions={[
            {
              label: selectionMode ? 'Exit select' : 'Select',
              onClick: () => {
                setSelectionMode((prev) => !prev);
                setSelectedIds(new Set());
              },
            },
          ]}
        />

        {/* Segmented Tabs (Normal active styling: #1E88FF) */}
        <AdminSegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {/* ================= TAB 1: STREAMS ================= */}
        {activeTab === 'streams' && (
          <div>
            {loadingEpisodes ? (
              <div className="space-y-3">
                <AdminSkeleton variant="table-row" count={4} />
              </div>
            ) : episodeReports.length === 0 ? (
              <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-6 max-h-[160px] flex items-center justify-center">
                <AdminEmptyState
                  icon={AlertTriangle}
                  title="No broken streams reported"
                  description="All video servers and episodes are operational."
                  compact
                />
              </div>
            ) : (
              <div className="bg-[#0B1324] border border-white/10 rounded-[12px] divide-y divide-white/5 overflow-hidden">
                {episodeReports.map((item) => {
                  const id = item.id || '';
                  const isResolved = item.status === 'resolved';
                  const isSelected = selectedIds.has(id);
                  const title = `${item.animeTitle} · Ep ${item.episodeNumber}`;
                  const server = item.serverName || 'Primary Server';
                  const time = formatReportTime(item.createdAt);
                  const reason = (item.reason || item.issueType || 'playback issue').replace(/_/g, ' ');
                  const meta = `${server} · ${reason} · ${time}`;

                  return (
                    <AdminListRow
                      key={id}
                      id={id}
                      title={title}
                      meta={meta}
                      badge={
                        isResolved ? (
                          <AdminStatusBadge status="live" label="Fixed" />
                        ) : (
                          <AdminStatusBadge status="archived" label="Open" />
                        )
                      }
                      selectable={selectionMode}
                      selected={isSelected}
                      onSelect={() => toggleSelect(id)}
                      menuItems={[
                        {
                          id: 'open-episode',
                          label: 'Open watch page',
                          icon: ExternalLink,
                          onClick: () =>
                            window.open(
                              `/watch/${item.animeId}/${item.episodeId || item.episodeNumber}`,
                              '_blank'
                            ),
                        },
                        ...(!isResolved
                          ? [
                              {
                                id: 'mark-fixed',
                                label: 'Mark as fixed',
                                icon: CheckCircle2,
                                onClick: () => handleMarkStreamFixed(id, item.animeTitle),
                              },
                            ]
                          : []),
                        {
                          id: 'delete',
                          label: 'Delete report',
                          icon: Trash2,
                          destructive: true,
                          onClick: () =>
                            setDeleteTarget({
                              id,
                              type: 'stream',
                              label: `${item.animeTitle} Ep ${item.episodeNumber}`,
                            }),
                        },
                      ]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: COMMENTS ================= */}
        {activeTab === 'comments' && (
          <div>
            {loadingComments ? (
              <div className="space-y-3">
                <AdminSkeleton variant="table-row" count={4} />
              </div>
            ) : commentReports.length === 0 ? (
              <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-6 max-h-[160px] flex items-center justify-center">
                <AdminEmptyState
                  icon={MessageSquare}
                  title="No flagged comments"
                  description="No visitor comments currently flagged for moderation."
                  compact
                />
              </div>
            ) : (
              <div className="bg-[#0B1324] border border-white/10 rounded-[12px] divide-y divide-white/5 overflow-hidden">
                {commentReports.map((report) => {
                  const id = report.id || '';
                  const isResolved = report.status === 'resolved' || report.status === 'dismissed';
                  const isSelected = selectedIds.has(id);
                  const author = report.commentAuthorName || 'Visitor';
                  const time = formatReportTime(report.createdAt);
                  const reason = (report.reason || 'inappropriate').replace(/_/g, ' ');
                  const commentText = report.commentContent || (report.comment?.content ?? 'Comment text unavailable');

                  return (
                    <AdminListRow
                      key={id}
                      id={id}
                      title={`"${commentText.slice(0, 100)}${commentText.length > 100 ? '...' : ''}"`}
                      meta={`By ${author} · Reason: ${reason} · ${time}`}
                      badge={
                        isResolved ? (
                          <AdminStatusBadge status="live" label="Reviewed" />
                        ) : (
                          <AdminStatusBadge status="archived" label="Flagged" />
                        )
                      }
                      selectable={selectionMode}
                      selected={isSelected}
                      onSelect={() => toggleSelect(id)}
                      menuItems={[
                        ...(!isResolved
                          ? [
                              {
                                id: 'approve',
                                label: 'Approve comment (Dismiss report)',
                                icon: CheckCircle2,
                                onClick: () => handleApproveComment(id, report.commentId),
                              },
                            ]
                          : []),
                        {
                          id: 'delete-comment',
                          label: 'Delete comment',
                          icon: Trash2,
                          destructive: true,
                          onClick: () =>
                            setDeleteTarget({
                              id,
                              type: 'comment',
                              label: `comment by ${author}`,
                            }),
                        },
                        {
                          id: 'ban-user',
                          label: `Ban ${author} from commenting`,
                          icon: Ban,
                          destructive: true,
                          onClick: () =>
                            setBanTarget({
                              userId: report.commentAuthorId,
                              userName: author,
                            }),
                        },
                      ]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Floating Bulk Selection Bar */}
        <AdminSelectionBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          actions={[
            {
              label: 'Mark resolved',
              icon: CheckCircle2,
              variant: 'primary',
              onClick: handleBulkResolve,
            },
          ]}
        />

        {/* Delete Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (!deleteTarget) return;
            if (deleteTarget.type === 'stream') {
              handleDeleteStreamReport(deleteTarget.id);
            } else {
              const rep = commentReports.find((r) => r.id === deleteTarget.id);
              if (rep) handleDeleteCommentItem(rep.id || '', rep.commentId);
            }
          }}
          title="Delete report item?"
          consequence={`Permanently delete ${deleteTarget?.label}. This action cannot be reversed.`}
          confirmLabel="Delete"
          isLoading={isProcessing}
        />

        {/* Ban User Confirmation Dialog */}
        <AdminConfirmDialog
          isOpen={!!banTarget}
          onClose={() => setBanTarget(null)}
          onConfirm={() => {
            if (banTarget) handleBanUser(banTarget.userId, banTarget.userName);
          }}
          title={`Ban user "${banTarget?.userName}"?`}
          consequence="This user will be permanently restricted from submitting new comments or replies across all anime."
          confirmLabel="Ban user"
          isLoading={isProcessing}
        />
      </div>
    </AdminLayout>
  );
};
