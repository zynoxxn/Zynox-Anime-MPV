import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import type { AppNotification } from '../types/library';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../lib/firestore/notifications';
import { isValidSafeUrl } from '../lib/security';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  Bell,
  Trash2,
  CheckCheck,
  Film,
  ExternalLink,
  MessageSquare,
  Heart,
  Send,
  Sparkles,
} from 'lucide-react';

interface NotificationsViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'announcements' | 'episodes' | 'community'>('all');

  usePageSeo({
    title: 'Notifications | ZYNOX ANIME',
    description: 'Episode release alerts, comment replies, and community updates.',
  });

  const fetchNotifs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const items = await getUserNotifications(user.uid);
      setNotifications(items);
    } catch (err) {
      console.error('Notifications fetch error:', err);
      setError('Failed to load your notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onShowMessage?.('All notifications marked as read.');
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id, user?.uid);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (notif.id && !notif.read) {
      await markNotificationRead(notif.id, user?.uid);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    if (notif.link) {
      const link = notif.link.trim();
      if (link.startsWith('/')) {
        navigate(link);
      } else if (isValidSafeUrl(link)) {
        window.location.href = link;
      }
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'episode_release':
        return <Film className="w-4 h-4 text-emerald-400" />;
      case 'comment_reply':
        return <MessageSquare className="w-4 h-4 text-[#1E88FF]" />;
      case 'comment_like':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'request_status':
        return <Send className="w-4 h-4 text-amber-400" />;
      case 'system_announcement':
      case 'announcement':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#1E88FF]" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'announcements')
      return n.type === 'system_announcement' || n.type === 'announcement';
    if (filter === 'episodes') return n.type === 'episode_release';
    if (filter === 'community')
      return (
        n.type === 'comment_reply' ||
        n.type === 'comment_like' ||
        n.type === 'request_status'
      );
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const FILTER_TABS: { id: typeof filter; label: string }[] = [
    { id: 'all', label: `All (${notifications.length})` },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'announcements', label: 'Announcements' },
    { id: 'episodes', label: 'Episodes' },
    { id: 'community', label: 'Community' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Bell className="w-6 h-6 sm:w-7 sm:h-7 text-[#1E88FF] shrink-0" />
            <span className="truncate">Notifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Episode releases, comment replies, and request status updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="h-9 px-3.5 bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shrink-0 whitespace-nowrap"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#1E88FF] shrink-0" />
            <span>Mark all read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border cursor-pointer ${
              filter === t.id
                ? 'bg-[#1E88FF] text-white border-[#1E88FF]'
                : 'bg-[#0B1324] text-[#94A3B8] hover:text-white border-white/10 hover:bg-[#101A30]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load Notifications"
          message={error}
          onRetry={fetchNotifs}
        />
      ) : !user ? (
        <EmptyState
          icon={<Bell className="w-7 h-7 text-[#1E88FF]" />}
          title="Sign in to view notifications"
          description="Create an account or sign in to receive alerts when new episodes air or people reply to you."
          actionLabel="Sign In"
          onAction={() => navigate('/login')}
        />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-7 h-7 text-[#1E88FF]" />}
          title="No notifications"
          description="You will receive updates here whenever new episodes release or community members reply."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex items-start justify-between gap-3 cursor-pointer group min-w-0 ${
                n.read
                  ? 'bg-[#0B1324] border-white/10 text-[#94A3B8] hover:bg-[#101A30]'
                  : 'bg-[#0B1324] border-[#1E88FF]/40 text-white hover:border-[#1E88FF]'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#101A30] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotifIcon(n.type)}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#1E88FF] shrink-0" />
                    )}
                    <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#1E88FF] transition-colors truncate">
                      {n.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#94A3B8] leading-relaxed break-words">
                    {n.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {n.link && isValidSafeUrl(n.link) && (
                  <ExternalLink className="w-4 h-4 text-[#64748B] group-hover:text-white transition-colors" />
                )}
                {n.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id!);
                    }}
                    className="w-8 h-8 text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
