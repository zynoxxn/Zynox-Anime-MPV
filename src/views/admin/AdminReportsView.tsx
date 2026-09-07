import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import type { EpisodeReport, ReportStatus, CommentReportItem, CommentReportStatus } from '../../types/library';
import {
  getAllEpisodeReports,
  updateReportStatus,
  deleteEpisodeReport,
} from '../../lib/firestore/community';
import {
  getAllCommentReports,
  updateCommentReportStatus,
  toggleHideCommentAdmin,
  deleteComment,
} from '../../lib/firestore/comments';
import { toggleUserCommentRestriction } from '../../lib/firestore/admin-users';
import { logAdminActivity } from '../../lib/firestore/cms';
import { AdminLayout } from './AdminLayout';
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  MessageSquare,
  EyeOff,
  Eye,
  ShieldAlert,
  Loader2,
  Ban,
  Film,
} from 'lucide-react';

interface AdminReportsViewProps {
  navigate: (path: string) => void;
  onShowMessage: (msg: string) => void;
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');

  // Episode reports state
  const [episodeReports, setEpisodeReports] = useState<EpisodeReport[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);

  // Comment reports state
  const [commentReports, setCommentReports] = useState<CommentReportItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const fetchEpisodeReports = async () => {
    try {
      setLoadingEpisodes(true);
      const items = await getAllEpisodeReports();
      setEpisodeReports(items);
    } catch (err) {
      console.error('Failed to load episode reports:', err);
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
      console.error('Failed to load comment reports:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchEpisodeReports();
    fetchCommentReports();
  }, []);

  const handleUpdateEpisodeReportStatus = async (id: string, newStatus: ReportStatus) => {
    await updateReportStatus(id, newStatus);
    await logAdminActivity(
      user?.uid || '',
      user?.email || '',
      `Updated Episode Report status to ${newStatus}`,
      'Reports',
      id,
      `Report #${id}`
    );
    setEpisodeReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    onShowMessage(`Report marked as ${newStatus}.`);
  };

  const handleDeleteEpisodeReport = async (id: string) => {
    if (window.confirm('Delete this episode report?')) {
      await deleteEpisodeReport(id);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Episode Report',
        'Reports',
        id,
        `Report #${id}`
      );
      setEpisodeReports((prev) => prev.filter((r) => r.id !== id));
      onShowMessage('Report deleted.');
    }
  };

  const handleUpdateCommentReportStatus = async (id: string, newStatus: CommentReportStatus) => {
    await updateCommentReportStatus(id, newStatus);
    await logAdminActivity(
      user?.uid || '',
      user?.email || '',
      `Updated Comment Report status to ${newStatus}`,
      'Reports',
      id,
      `Report #${id}`
    );
    setCommentReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    onShowMessage(`Report status updated to ${newStatus}.`);
  };

  const handleToggleHideComment = async (
    reportId: string,
    commentId: string,
    currentHidden?: boolean
  ) => {
    const nextVal = !currentHidden;
    await toggleHideCommentAdmin(commentId, nextVal);
    await logAdminActivity(
      user?.uid || '',
      user?.email || '',
      `${nextVal ? 'Hidden' : 'Unhidden'} Comment`,
      'Comments',
      commentId,
      `Comment #${commentId}`
    );
    setCommentReports((prev) =>
      prev.map((r) =>
        r.id === reportId && r.comment
          ? { ...r, comment: { ...r.comment, isHiddenByAdmin: nextVal } }
          : r
      )
    );
    onShowMessage(`Comment is now ${nextVal ? 'Hidden' : 'Visible'}.`);
  };

  const handleDeleteComment = async (reportId: string, commentId: string) => {
    if (window.confirm('Permanently delete this comment?')) {
      await deleteComment(commentId);
      await logAdminActivity(
        user?.uid || '',
        user?.email || '',
        'Deleted Inappropriate Comment',
        'Comments',
        commentId,
        `Comment #${commentId}`
      );
      setCommentReports((prev) => prev.filter((r) => r.id !== reportId));
      onShowMessage('Comment deleted.');
    }
  };

  const handleToggleMuteUser = async (userId: string, isRestricted: boolean) => {
    const nextVal = !isRestricted;
    await toggleUserCommentRestriction(userId, nextVal);
    await logAdminActivity(
      user?.uid || '',
      user?.email || '',
      `${nextVal ? 'Restricted' : 'Unrestricted'} User Comments`,
      'Users',
      userId,
      `User #${userId}`
    );
    onShowMessage(`User commenting privileges ${nextVal ? 'revoked' : 'restored'}.`);
  };

  return (
    <AdminLayout currentTab="reports" navigate={navigate} onShowMessage={onShowMessage}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1322] border border-white/5 p-6 rounded-3xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Moderation &amp; Issues Desk</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Broken Streams &amp; Flagged Content
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              Review playback errors, dead video links, and flagged community comments.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#050A14] p-1.5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('episodes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'episodes'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Broken Streams ({episodeReports.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'comments'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Flagged Comments ({commentReports.length})</span>
            </button>
          </div>
        </div>

        {/* EPISODE STREAM REPORTS */}
        {activeTab === 'episodes' && (
          <div>
            {loadingEpisodes ? (
              <div className="py-20 text-center text-xs text-[#94A3B8]">Loading stream issue reports...</div>
            ) : episodeReports.length === 0 ? (
              <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
                No broken stream reports reported by users. All systems operational!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {episodeReports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {r.animeTitle} - Ep {r.episodeNumber}
                          </h3>
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            r.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'investigating'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <div className="p-3 bg-[#050A14] rounded-2xl border border-white/5 space-y-1">
                        <div className="text-xs font-bold text-rose-300">
                          Problem: <span className="capitalize font-normal text-white">{r.issueType}</span>
                        </div>
                        {r.description && (
                          <p className="text-xs text-[#94A3B8] leading-relaxed">
                            "{r.description}"
                          </p>
                        )}
                      </div>

                      <div className="text-[11px] text-[#64748B] flex items-center gap-2">
                        <span>Reported by: {r.userEmail || 'Anonymous'}</span>
                        {r.serverName && <span>&bull; Server: {r.serverName}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateEpisodeReportStatus(r.id, 'investigating')}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold rounded-lg transition-all"
                        >
                          Investigate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateEpisodeReportStatus(r.id, 'resolved')}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                        >
                          Resolved
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteEpisodeReport(r.id)}
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
        )}

        {/* COMMENT REPORTS */}
        {activeTab === 'comments' && (
          <div>
            {loadingComments ? (
              <div className="py-20 text-center text-xs text-[#94A3B8]">Loading flagged comments...</div>
            ) : commentReports.length === 0 ? (
              <div className="bg-[#0B1322] border border-white/5 rounded-3xl p-12 text-center text-[#94A3B8]">
                No reported comments found. Community moderation clean.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commentReports.map((cr) => (
                  <div
                    key={cr.id}
                    className="bg-[#0B1322] border border-white/5 rounded-3xl p-5 space-y-4 hover:border-white/10 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs font-bold text-rose-400">
                          Flag: <span className="text-white uppercase font-bold">{cr.reason}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            cr.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {cr.status}
                        </span>
                      </div>

                      {cr.comment && (
                        <div className="p-3 bg-[#050A14] rounded-2xl border border-white/5 space-y-1">
                          <div className="text-[11px] font-bold text-white">
                            Author: {cr.comment.userName}
                          </div>
                          <p className="text-xs text-[#94A3B8] leading-relaxed">
                            "{cr.comment.text}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        {cr.comment && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleHideComment(
                                cr.id,
                                cr.commentId,
                                cr.comment?.isHiddenByAdmin
                              )
                            }
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                          >
                            {cr.comment.isHiddenByAdmin ? (
                              <Eye className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-rose-400" />
                            )}
                            <span>{cr.comment.isHiddenByAdmin ? 'Unhide' : 'Hide'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleUpdateCommentReportStatus(cr.id, 'resolved')}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg transition-all"
                        >
                          Dismiss / Resolve
                        </button>
                      </div>

                      {cr.comment && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(cr.id, cr.commentId)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-colors"
                          title="Delete Comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
