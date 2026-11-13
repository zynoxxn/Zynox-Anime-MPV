import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import type { AnimeRequest } from '../types/library';
import {
  submitAnimeRequest,
  getUserAnimeRequests,
  getAllAnimeRequests,
} from '../lib/firestore/community';
import { getSiteSettings } from '../lib/firestore/site-settings';
import { sanitizeString } from '../lib/security';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
  Tv,
  X,
} from 'lucide-react';

interface AnimeRequestsViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const REQUEST_COOLDOWN_KEY = 'zynox_last_request_ts';
const COOLDOWN_MS = 15_000;

export const AnimeRequestsView: React.FC<AnimeRequestsViewProps> = ({
  onShowMessage,
}) => {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState<AnimeRequest[]>([]);
  const [myRequests, setMyRequests] = useState<AnimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestsEnabled, setRequestsEnabled] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [animeTitle, setAnimeTitle] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'community' | 'mine'>('community');

  usePageSeo({
    title: 'Request Anime | ZYNOX ANIME',
    description: 'Request missing anime series, dubbed seasons, or movies to be added to ZYNOX ANIME.',
  });

  useEffect(() => {
    getSiteSettings().then((cfg) => {
      if (cfg.enableRequests === false) {
        setRequestsEnabled(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setShowModal(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal, submitting]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllAnimeRequests();
      setRequests(all);
      if (user?.uid) {
        const mine = await getUserAnimeRequests(user.uid);
        setMyRequests(mine);
      }
    } catch (err) {
      console.warn('Failed to load requests:', err);
      setError('Failed to load anime requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!requestsEnabled) {
      setFormError('Anime requests are currently paused by an administrator.');
      return;
    }

    try {
      const lastTs = Number(localStorage.getItem(REQUEST_COOLDOWN_KEY) || '0');
      const remaining = COOLDOWN_MS - (Date.now() - lastTs);
      if (remaining > 0) {
        setFormError(`Please wait ${Math.ceil(remaining / 1000)}s before submitting another request.`);
        return;
      }
    } catch {
      // ignore storage errors
    }

    const title = sanitizeString(animeTitle).slice(0, 120);
    const res = sanitizeString(reason).slice(0, 120);
    const notes = sanitizeString(message).slice(0, 500);

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
        userName: userProfile?.displayName || user?.displayName || 'Community Fan',
        userEmail: user?.email || undefined,
        animeTitle: title,
        reason: res,
        message: notes || undefined,
      });

      try {
        localStorage.setItem(REQUEST_COOLDOWN_KEY, String(Date.now()));
      } catch {
        // ignore
      }

      onShowMessage?.(`Request for "${title}" submitted successfully!`);
      setShowModal(false);
      setAnimeTitle('');
      setReason('');
      setMessage('');
      loadRequests();
    } catch {
      setFormError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: AnimeRequest['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" />
            <span>Added</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Sparkles className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0 whitespace-nowrap">
            Declined
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <span>Under Review</span>
          </span>
        );
    }
  };

  const activeList = activeTab === 'community' ? requests : myRequests;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Tv className="w-6 h-6 sm:w-7 sm:h-7 text-[#1E88FF] shrink-0" />
            <span className="truncate">Request Anime</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-xl leading-relaxed">
            Missing a series, movie, or regional dub? Submit a request for our curators to review.
          </p>
        </div>

        {requestsEnabled ? (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="h-10 px-4 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Request</span>
          </button>
        ) : (
          <span className="h-9 px-3 bg-[#0B1324] border border-white/10 text-[#94A3B8] text-xs font-medium rounded-xl inline-flex items-center shrink-0 self-start sm:self-auto whitespace-nowrap">
            Requests Paused
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 text-xs overflow-x-auto no-scrollbar gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'community'
              ? 'border-[#1E88FF] text-white'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Tv className="w-4 h-4 text-[#1E88FF]" />
          <span>Community Requests ({requests.length})</span>
        </button>
        {user && (
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'mine'
                ? 'border-[#1E88FF] text-white'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            <Send className="w-4 h-4 text-[#1E88FF]" />
            <span>My Requests ({myRequests.length})</span>
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load Requests"
          message={error}
          onRetry={loadRequests}
        />
      ) : activeList.length === 0 ? (
        <EmptyState
          icon={<Tv className="w-7 h-7 text-[#1E88FF]" />}
          title="No requests yet"
          description="Be the first to submit a request for an anime series you want added."
          actionLabel={requestsEnabled ? 'New Request' : undefined}
          onAction={requestsEnabled ? () => setShowModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((r) => (
            <div
              key={r.id}
              className="bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 rounded-2xl p-4 sm:p-5 space-y-3 transition-colors flex flex-col justify-between min-w-0"
            >
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-white leading-snug break-words min-w-0">
                    {r.animeTitle}
                  </h3>
                  {getStatusBadge(r.status)}
                </div>

                <div className="text-xs text-[#CBD5E1] bg-[#101A30] border border-white/5 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-[#1E88FF] uppercase tracking-wider block">
                    Reason / Category
                  </span>
                  <p className="break-words">{r.reason}</p>
                  {r.message && <p className="text-[#94A3B8] break-words">{r.message}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-white/10 font-medium">
                <span className="truncate">Requested by {r.userName || 'Community Fan'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            className="bg-[#0B1324] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#1E88FF]" />
                <span>Submit Anime Request</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Anime Title *
                </label>
                <input
                  type="text"
                  value={animeTitle}
                  onChange={(e) => setAnimeTitle(e.target.value)}
                  placeholder="e.g. Solo Leveling Season 2"
                  disabled={submitting}
                  className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-white text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Reason / Category *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Hindi Dubbed, Missing Season"
                  disabled={submitting}
                  className="w-full h-10 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl px-3.5 text-white text-xs sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Preferred audio, release year, or source details..."
                  disabled={submitting}
                  className="w-full bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-xl p-3 text-white text-xs sm:text-sm outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-10 px-4 text-xs font-semibold text-[#94A3B8] hover:text-white bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 bg-[#1E88FF] hover:bg-[#3B9BFF] disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
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
