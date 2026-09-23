import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import type { AppNotification } from '../types/library';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../lib/firestore/notifications';
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'announcements' | 'episodes' | 'community'>('all');

  const fetchNotifs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const items = await getUserNotifications(user.uid);
      setNotifications(items);
    } catch (err) {
      console.error('Notifications fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

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
      if (notif.link.startsWith('http://') || notif.link.startsWith('https://')) {
        window.location.href = notif.link;
      } else {
        navigate(notif.link);
      }
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'episode_release':
        return <Film className="w-4 h-4 text-emerald-400" />;
      case 'comment_reply':
        return <MessageSquare className="w-4 h-4 text-[#00D9FF]" />;
      case 'comment_like':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'request_status':
        return <Send className="w-4 h-4 text-amber-400" />;
      case 'system_announcement':
      case 'announcement':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#00A8FF]" />;
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#F5F9FF] flex items-center gap-3 tracking-tight">
            <Bell className="w-7 h-7 text-[#00A8FF]" />
            <span>Community &amp; Release Notifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A9B8CC] mt-1">
            Episode releases, comment replies, community likes, and anime request updates
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-[#00A8FF]/15 hover:bg-[#00A8FF]/25 border border-[#00A8FF]/30 text-[#00D9FF] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : 'bg-[#0A1628] text-[#A9B8CC] hover:text-white border border-white/5'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'unread'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : 'bg-[#0A1628] text-[#A9B8CC] hover:text-white border border-white/5'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('announcements')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'announcements'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : 'bg-[#0A1628] text-[#A9B8CC] hover:text-white border border-white/5'
          }`}
        >
          Announcements
        </button>
        <button
          type="button"
          onClick={() => setFilter('episodes')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'episodes'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : 'bg-[#0A1628] text-[#A9B8CC] hover:text-white border border-white/5'
          }`}
        >
          Episodes
        </button>
        <button
          type="button"
          onClick={() => setFilter('community')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'community'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : 'bg-[#0A1628] text-[#A9B8CC] hover:text-white border border-white/5'
          }`}
        >
          Community
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center text-xs text-[#A9B8CC]">Loading notifications...</div>
      ) : !user ? (
        <div className="text-center py-16 bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-xl">
          <Bell className="w-12 h-12 mx-auto text-[#6E7F95]" />
          <h3 className="text-lg font-bold text-[#F5F9FF]">Sign In to View Notifications</h3>
          <p className="text-xs text-[#A9B8CC] leading-relaxed">
            Create an account or sign in to receive alerts when new episodes air or people reply to your comments.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl shadow-md shadow-[#0066FF]/30"
          >
            Sign In to Profile
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-20 bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-8 max-w-md mx-auto space-y-3 shadow-xl">
          <Bell className="w-12 h-12 mx-auto text-[#6E7F95]" />
          <h3 className="text-lg font-bold text-[#F5F9FF]">No notifications</h3>
          <p className="text-xs text-[#A9B8CC] leading-relaxed">
            You will receive updates here whenever new episodes of followed anime are released or community members interact with you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer group shadow-lg ${
                n.read
                  ? 'bg-[#0D1B2E] border-white/5 text-[#A9B8CC] hover:border-white/20 hover:bg-[#11243C]'
                  : 'bg-[#0D1B2E] border-[#00A8FF]/40 text-[#F5F9FF] shadow-[#00A8FF]/5 hover:border-[#00A8FF] hover:bg-[#11243C]'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#06101F] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getNotifIcon(n.type)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-[#00A8FF] shrink-0" />
                    )}
                    <h4 className="text-sm font-bold text-[#F5F9FF] group-hover:text-[#00D9FF] transition-colors truncate">
                      {n.title}
                    </h4>
                  </div>
                  <p className="text-xs text-[#A9B8CC] leading-relaxed">{n.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.link && (
                  <ExternalLink className="w-4 h-4 text-[#6E7F95] group-hover:text-white transition-colors" />
                )}
                {n.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id!);
                    }}
                    className="p-1.5 text-[#6E7F95] hover:text-rose-400 rounded-lg transition-colors"
                    title="Delete notification"
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
