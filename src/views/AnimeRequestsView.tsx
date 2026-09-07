import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import type { AnimeRequest } from '../types/library';
import {
  submitAnimeRequest,
  getUserAnimeRequests,
  getAllAnimeRequests,
} from '../lib/firestore/community';
import {
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  Tv,
} from 'lucide-react';

interface AnimeRequestsViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const AnimeRequestsView: React.FC<AnimeRequestsViewProps> = ({
  navigate,
  onShowMessage,
}) => {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<AnimeRequest[]>([]);
  const [myRequests, setMyRequests] = useState<AnimeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [animeTitle, setAnimeTitle] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'community' | 'mine'>('community');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const all = await getAllAnimeRequests();
      setRequests(all);
      if (user?.uid) {
        const mine = await getUserAnimeRequests(user.uid);
        setMyRequests(mine);
      }
    } catch (err) {
      console.warn('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const title = animeTitle.trim();
    const res = reason.trim();
    if (!title) {
      setFormError('Please enter an anime title.');
      return;
    }
    if (!res) {
      setFormError('Please specify a reason or category.');
      return;
    }

    setSubmitting(true);
    try {
      await submitAnimeRequest({
        userId: user?.uid,
        userName: userProfile?.displayName || user?.displayName || 'Anonymous Fan',
        userEmail: user?.email || undefined,
        animeTitle: title,
        reason: res,
        message: message.trim() || undefined,
      });

      onShowMessage?.(`Request for "${title}" submitted successfully!`);
      setShowModal(false);
      setAnimeTitle('');
      setReason('');
      setMessage('');
      loadRequests();
    } catch (err: any) {
      setFormError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: AnimeRequest['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Added to Catalog</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00A8FF]/15 text-[#00D9FF] border border-[#00A8FF]/30 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Approved (In Queue)</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Declined
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Under Review</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A8FF]/15 border border-[#00A8FF]/30 text-[#00D9FF] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Request Desk</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#F5F9FF] tracking-tight">
            Request an Anime Series or Movie
          </h1>
          <p className="text-xs sm:text-sm text-[#A9B8CC] max-w-xl">
            Can&apos;t find your favorite anime on ZYNOX? Submit a request and our content curators will review and upload it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-[#0066FF] to-[#00A8FF] hover:from-[#0052cc] hover:to-[#0088cc] text-black font-black text-xs rounded-2xl transition-all shadow-xl shadow-[#00A8FF]/20 flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>New Anime Request</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`px-5 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'community'
              ? 'border-[#00A8FF] text-[#00D9FF]'
              : 'border-transparent text-[#A9B8CC] hover:text-white'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Community Requests ({requests.length})</span>
        </button>
        {user && (
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`px-5 py-3 font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'mine'
                ? 'border-[#00A8FF] text-[#00D9FF]'
                : 'border-transparent text-[#A9B8CC] hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>My Submitted Requests ({myRequests.length})</span>
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#A9B8CC] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00A8FF]" />
          <span className="text-xs font-semibold">Loading requests...</span>
        </div>
      ) : (activeTab === 'community' ? requests : myRequests).length === 0 ? (
        <div className="text-center py-16 bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-8 max-w-md mx-auto space-y-3 shadow-xl">
          <Tv className="w-10 h-10 mx-auto text-[#6E7F95]" />
          <h3 className="text-base font-bold text-[#F5F9FF]">No requests yet</h3>
          <p className="text-xs text-[#A9B8CC]">
            Be the first to submit a request for an anime series you want to watch!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(activeTab === 'community' ? requests : myRequests).map((r) => (
            <div
              key={r.id}
              className="bg-[#0D1B2E] border border-white/5 hover:border-[#00A8FF]/40 rounded-2xl p-5 space-y-3 transition-colors flex flex-col justify-between shadow-lg hover:bg-[#11243C]"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#F5F9FF] leading-snug">{r.animeTitle}</h3>
                  {getStatusBadge(r.status)}
                </div>

                <div className="text-xs text-[#A9B8CC] bg-[#06101F] border border-white/5 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-[#00D9FF] uppercase tracking-wider block mb-1">
                    Reason / Category
                  </span>
                  <p>{r.reason}</p>
                  {r.message && <p className="text-[#6E7F95] mt-1">{r.message}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#6E7F95] pt-2 border-t border-white/5 font-semibold">
                <span>Requested by {r.userName || 'Community Fan'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A1628] border border-[#00A8FF]/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-[#F5F9FF] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#00A8FF]" />
                <span>Submit Anime Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#A9B8CC] hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#A9B8CC] uppercase tracking-wider mb-1">
                  Anime Title *
                </label>
                <input
                  type="text"
                  value={animeTitle}
                  onChange={(e) => setAnimeTitle(e.target.value)}
                  placeholder="e.g. Solo Leveling Season 2"
                  disabled={submitting}
                  className="w-full bg-[#0D1B2E] border border-white/10 focus:border-[#00A8FF] rounded-xl px-3.5 py-2.5 text-[#F5F9FF] text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A9B8CC] uppercase tracking-wider mb-1">
                  Reason / Category *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Hindi Dubbed, Missing Season, 4K Remaster"
                  disabled={submitting}
                  className="w-full bg-[#0D1B2E] border border-white/10 focus:border-[#00A8FF] rounded-xl px-3.5 py-2.5 text-[#F5F9FF] text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#A9B8CC] uppercase tracking-wider mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Any extra info (MyAnimeList / AniList link, preferred audio/sub, release year)..."
                  disabled={submitting}
                  className="w-full bg-[#0D1B2E] border border-white/10 focus:border-[#00A8FF] rounded-xl p-3 text-[#F5F9FF] text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#A9B8CC] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-[#0066FF]/30"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
