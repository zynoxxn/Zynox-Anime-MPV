import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { CmsScheduleItem } from '../types/cms';
import { getCmsSchedule } from '../lib/firestore/cms';
import { getPublishedAnimes, cleanAnimeTitle } from '../lib/firestore/anime';
import type { Anime } from '../types/anime';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import { Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight, Play } from 'lucide-react';

interface ScheduleViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';

export const ScheduleView: React.FC<ScheduleViewProps> = ({ navigate }) => {
  const [scheduleItems, setScheduleItems] = useState<CmsScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [now, setNow] = useState<Date>(() => new Date());

  usePageSeo({
    title: 'Weekly Broadcast Schedule | ZYNOX ANIME',
    description: 'Real-time weekly anime release calendar and countdowns across airing days.',
  });

  const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [schList, animeList] = await Promise.all([
        getCmsSchedule(),
        getPublishedAnimes(),
      ]);

      const animeMap = new Map<string, Anime>();
      animeList.forEach((a) => {
        if (a.id) animeMap.set(a.id, a);
        if (a.slug) animeMap.set(a.slug, a);
      });

      const enriched = schList.map((item) => {
        const found =
          animeMap.get(item.animeId) ||
          (item.animeSlug ? animeMap.get(item.animeSlug) : undefined) ||
          animeList.find((a) => a.title.toLowerCase() === item.animeTitle?.toLowerCase());
        const banner =
          found?.banner ||
          (found as any)?.bannerUrl ||
          item.animeBanner ||
          found?.poster ||
          item.animePoster;
        return {
          ...item,
          animePoster: found?.poster || item.animePoster,
          animeBanner: banner,
        };
      });

      setScheduleItems(enriched);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError('Could not load the broadcast schedule. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const getCountdown = (dayName: string, timeStr: string): string => {
    try {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const targetDayIndex = days.indexOf(dayName);
      if (targetDayIndex === -1) return '';

      const currentDayIndex = now.getDay();
      let diffDays = targetDayIndex - currentDayIndex;
      if (diffDays < 0) diffDays += 7;

      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return '';

      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + diffDays);
      targetDate.setHours(hours, minutes, 0, 0);

      if (diffDays === 0 && targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 7);
      }

      const diffMs = targetDate.getTime() - now.getTime();
      if (diffMs <= 0) return 'Airing Now';

      const totalSec = Math.floor(diffMs / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      if (d > 0) return `${d}d ${h}h ${m}m`;
      return `${h}h ${m}m ${s}s`;
    } catch {
      return '';
    }
  };

  const groupedByDay = useMemo(() => {
    const map: Record<string, CmsScheduleItem[]> = {};
    for (const day of DAYS_OF_WEEK) {
      map[day] = [];
    }
    for (const item of scheduleItems) {
      if (map[item.dayOfWeek]) {
        map[item.dayOfWeek].push(item);
      } else {
        map[item.dayOfWeek] = [item];
      }
    }
    return map;
  }, [scheduleItems]);

  const displayedDays = useMemo(() => {
    if (selectedDayFilter === 'All') {
      return DAYS_OF_WEEK.filter((day) => (groupedByDay[day] || []).length > 0);
    }
    return [selectedDayFilter];
  }, [selectedDayFilter, groupedByDay]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'released':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Released
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
            <AlertCircle className="w-3 h-3" /> Delayed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md shrink-0">
            Cancelled
          </span>
        );
      case 'upcoming':
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-[#1E88FF] shrink-0" />
            <span className="truncate">Weekly Schedule</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
            Real-time broadcast calendar for upcoming weekly episodes and dubbed premieres.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0B1324] border border-white/10 text-xs font-medium text-[#CBD5E1] shrink-0 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-[#1E88FF] shrink-0" />
          <span className="whitespace-nowrap">
            {todayDayName} &bull; {now.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Airing Days Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedDayFilter('All')}
          className={`h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 border ${
            selectedDayFilter === 'All'
              ? 'bg-[#1E88FF] text-white border-[#1E88FF]'
              : 'bg-[#0B1324] text-[#94A3B8] hover:text-white hover:bg-[#101A30] border-white/10'
          }`}
        >
          <span>All Days</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              selectedDayFilter === 'All' ? 'bg-white/20 text-white' : 'bg-white/5 text-[#94A3B8]'
            }`}
          >
            {scheduleItems.length}
          </span>
        </button>

        {DAYS_OF_WEEK.map((day) => {
          const count = (groupedByDay[day] || []).length;
          const isSelected = selectedDayFilter === day;
          const isToday = day === todayDayName;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDayFilter(day)}
              className={`h-9 px-3.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? 'bg-[#1E88FF] text-white border-[#1E88FF]'
                  : isToday
                  ? 'bg-[#101A30] text-white border-[#1E88FF]/40 hover:border-[#1E88FF]'
                  : 'bg-[#0B1324] text-[#94A3B8] hover:text-white hover:bg-[#101A30] border-white/10'
              }`}
            >
              <span>{day}</span>
              {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#1E88FF] shrink-0" />}
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-[#94A3B8]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-[#0B1324] border border-white/10 animate-pulse p-4 flex gap-3.5"
            >
              <div className="w-24 h-full rounded-xl bg-white/5 shrink-0" />
              <div className="flex-1 space-y-2.5 py-1">
                <div className="h-3 w-20 bg-white/5 rounded" />
                <div className="h-4 w-3/4 bg-white/5 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Schedule Unavailable"
          message={error}
          onRetry={loadSchedule}
        />
      ) : displayedDays.length === 0 || scheduleItems.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-7 h-7 text-[#1E88FF]" />}
          title="No releases scheduled"
          description={
            selectedDayFilter === 'All'
              ? 'There are currently no scheduled anime broadcasts.'
              : `No scheduled anime broadcasts found for ${selectedDayFilter}.`
          }
          actionLabel={selectedDayFilter !== 'All' ? 'View All Days' : 'Browse Catalog'}
          onAction={() =>
            selectedDayFilter !== 'All' ? setSelectedDayFilter('All') : navigate('/browse')
          }
        />
      ) : (
        <div className="space-y-6">
          {displayedDays.map((day) => {
            const itemsForDay = groupedByDay[day] || [];
            if (itemsForDay.length === 0) return null;

            const isToday = day === todayDayName;

            return (
              <section
                key={day}
                id={`day-section-${day.toLowerCase()}`}
                className={`rounded-2xl p-4 sm:p-5 border space-y-4 ${
                  isToday
                    ? 'bg-[#0B1324] border-[#1E88FF]/40'
                    : 'bg-[#0B1324] border-white/10'
                }`}
              >
                {/* Day Section Header */}
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isToday ? 'bg-[#1E88FF]' : 'bg-[#64748B]'
                      }`}
                    />
                    <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 truncate">
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-[10px] bg-[#1E88FF]/15 text-[#1E88FF] border border-[#1E88FF]/30 px-2 py-0.5 rounded-md font-bold shrink-0">
                          TODAY
                        </span>
                      )}
                    </h2>
                  </div>

                  <span className="text-xs font-medium text-[#94A3B8] shrink-0 whitespace-nowrap">
                    {itemsForDay.length} {itemsForDay.length === 1 ? 'Series' : 'Series'}
                  </span>
                </div>

                {/* Day Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {itemsForDay.map((item) => {
                    const countdown =
                      item.status === 'upcoming'
                        ? getCountdown(item.dayOfWeek, item.releaseTime)
                        : '';
                    const posterImg = item.animeBanner || item.animePoster || FALLBACK_POSTER;
                    const slug =
                      item.animeSlug ||
                      item.animeId ||
                      (item.animeTitle
                        ? cleanAnimeTitle(item.animeTitle)
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        : '');

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (slug) {
                            navigate(
                              item.episodeNumber
                                ? `/anime/${slug}/episode/${item.episodeNumber}`
                                : `/anime/${slug}`
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && slug) {
                            e.preventDefault();
                            navigate(
                              item.episodeNumber
                                ? `/anime/${slug}/episode/${item.episodeNumber}`
                                : `/anime/${slug}`
                            );
                          }
                        }}
                        className="group bg-[#101A30] hover:bg-[#16223D] border border-white/10 hover:border-[#1E88FF]/50 rounded-2xl p-3 transition-colors cursor-pointer flex gap-3 min-w-0"
                      >
                        <div className="relative w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden bg-[#050A14] shrink-0 border border-white/10">
                          <img
                            src={posterImg}
                            alt={cleanAnimeTitle(item.animeTitle)}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-black/65 border border-white/20 group-hover:bg-[#1E88FF] group-hover:border-[#1E88FF] text-white flex items-center justify-center transition-colors">
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              {getStatusBadge(item.status)}
                              <span className="text-[11px] font-medium text-[#CBD5E1] flex items-center gap-1 ml-auto bg-[#050A14] px-2 py-0.5 rounded-md border border-white/10 whitespace-nowrap">
                                <Clock className="w-3 h-3 text-[#1E88FF] shrink-0" />
                                <span>
                                  {item.releaseTime} {item.timezone || 'IST'}
                                </span>
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#1E88FF] transition-colors truncate">
                              {cleanAnimeTitle(item.animeTitle)}
                            </h3>

                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] truncate">
                              <span className="text-[#CBD5E1]">Episode {item.episodeNumber}</span>
                              {item.seasonNumber && item.seasonNumber > 1 && (
                                <>
                                  <span>&bull;</span>
                                  <span>Season {item.seasonNumber}</span>
                                </>
                              )}
                            </div>

                            {item.language && (
                              <div className="text-[10px] text-[#94A3B8] bg-[#050A14] border border-white/5 px-2 py-0.5 rounded-md inline-block truncate max-w-full">
                                {item.language}
                              </div>
                            )}
                          </div>

                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                            {countdown ? (
                              <span className="font-mono font-semibold text-[#1E88FF] text-[11px] truncate">
                                {countdown}
                              </span>
                            ) : (
                              <span className="text-[#64748B] text-[11px] truncate">Weekly</span>
                            )}

                            <span className="text-xs font-semibold text-[#1E88FF] flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                              <span>Watch</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
