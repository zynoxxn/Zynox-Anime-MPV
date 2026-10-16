import React, { useEffect, useState, useMemo } from 'react';
import type { CmsScheduleItem } from '../types/cms';
import { getCmsSchedule } from '../lib/firestore/cms';
import { getAllAnimes, cleanAnimeTitle } from '../lib/firestore/anime';
import type { Anime } from '../types/anime';
import { Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight, Play, Sparkles } from 'lucide-react';

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

export const ScheduleView: React.FC<ScheduleViewProps> = ({ navigate }) => {
  const [scheduleItems, setScheduleItems] = useState<CmsScheduleItem[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('All');
  const [now, setNow] = useState<Date>(new Date());

  // Current day in user timezone
  const todayDayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);

  useEffect(() => {
    // Tick clock every second for live countdown
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getCmsSchedule(), getAllAnimes()])
      .then(([schList, animeList]) => {
        if (isMounted) {
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
          setAnimes(animeList);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load schedule:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute countdown string for a day and time
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

      // If target time has already passed today, push to next week
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

  // Group by day
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
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3 h-3" /> Released
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
            <AlertCircle className="w-3 h-3" /> Delayed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
            Cancelled
          </span>
        );
      case 'upcoming':
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-[#081324] via-[#0D1C34] to-[#060D1A] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1683FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1683FF]/15 border border-[#1683FF]/30 text-[#00CFFF] text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Broadcast Matrix</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Weekly <span className="text-[#00CFFF]">Broadcast Schedule</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Real-time broadcast schedule for weekly episodes. Hindi Dubs and English Subs update weekly across airing days.
          </p>

          <div className="pt-1.5 flex items-center gap-2 text-xs font-semibold text-[#60A5FA]">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Today is {todayDayName} • Current Time: {now.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Airing Days Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedDayFilter('All')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
            selectedDayFilter === 'All'
              ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30 border border-[#1683FF]'
              : 'bg-[#07111F] text-[#94A3B8] hover:text-white hover:bg-white/5 border border-white/10'
          }`}
        >
          <span>All Days</span>
          <span className="px-1.5 py-0.2 rounded-md bg-white/15 text-[10px] font-mono">
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#1683FF] text-white shadow-md shadow-[#1683FF]/30 border border-[#1683FF]'
                  : isToday
                  ? 'bg-[#08182E] text-cyan-400 hover:text-white hover:bg-[#0B203E] border border-cyan-500/30'
                  : 'bg-[#07111F] text-[#94A3B8] hover:text-white hover:bg-white/5 border border-white/10'
              }`}
            >
              <span>{day}</span>
              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isToday
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-white/5 text-[#94A3B8]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule Items Grid with Clear Day Visual Separation */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#94A3B8]">Loading broadcast matrix...</div>
      ) : displayedDays.length === 0 || scheduleItems.length === 0 ? (
        <div className="bg-[#07111F] border border-white/5 rounded-2xl p-12 text-center text-[#94A3B8] space-y-2">
          <Calendar className="w-8 h-8 text-[#1683FF] mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No releases found</h3>
          <p className="text-xs max-w-sm mx-auto">
            {selectedDayFilter === 'All'
              ? 'There are currently no scheduled anime broadcasts.'
              : `No scheduled anime broadcasts found for ${selectedDayFilter}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10">
          {displayedDays.map((day) => {
            const itemsForDay = groupedByDay[day] || [];
            if (itemsForDay.length === 0) return null;

            const isToday = day === todayDayName;

            return (
              <section
                key={day}
                id={`day-section-${day.toLowerCase()}`}
                className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 border transition-all duration-300 shadow-xl space-y-4 ${
                  isToday
                    ? 'bg-[#08152A]/85 border-cyan-500/30 ring-1 ring-cyan-500/15 shadow-cyan-500/5'
                    : 'bg-[#07111F]/70 border-white/[0.06]'
                }`}
              >
                {/* Day Header Inside Container */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isToday ? 'bg-cyan-400 shadow-[0_0_12px_#00D1FF]' : 'bg-[#1683FF]'
                      }`}
                    />
                    <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                          TODAY
                        </span>
                      )}
                    </h2>
                  </div>

                  <span className="text-xs font-semibold text-[#94A3B8]">
                    {itemsForDay.length} {itemsForDay.length === 1 ? 'Anime Airing' : 'Animes Airing'}
                  </span>
                </div>

                {/* Day Schedule Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {itemsForDay.map((item) => {
                    const countdown =
                      item.status === 'upcoming'
                        ? getCountdown(item.dayOfWeek, item.releaseTime)
                        : '';
                    const posterImg =
                      item.animeBanner ||
                      item.animePoster ||
                      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';

                    return (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const slug =
                            item.animeSlug ||
                            item.animeId ||
                            (item.animeTitle
                              ? cleanAnimeTitle(item.animeTitle).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                              : '');
                          if (slug) {
                            navigate(
                              item.episodeNumber
                                ? `/anime/${slug}/episode/${item.episodeNumber}`
                                : `/anime/${slug}`
                            );
                          }
                        }}
                        className="group bg-[#091528]/80 hover:bg-[#0C1B33] border border-white/[0.08] hover:border-[#1683FF]/50 rounded-2xl p-3 sm:p-3.5 transition-all duration-300 hover:shadow-xl hover:shadow-[#1683FF]/10 cursor-pointer flex gap-3.5 relative overflow-hidden"
                      >
                        {/* Poster / 16:9 Thumbnail */}
                        <div className="relative w-24 sm:w-28 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#050A14] shrink-0 border border-white/10">
                          <img
                            src={posterImg}
                            alt={cleanAnimeTitle(item.animeTitle)}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors" />

                          {/* Centered Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 border border-white/20 group-hover:bg-[#1683FF] group-hover:border-[#1683FF] text-white flex items-center justify-center shadow-md transition-all group-hover:scale-110">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                          <div className="space-y-1">
                            {/* Top row: Status & Air Time */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {getStatusBadge(item.status)}
                              <span className="text-[11px] font-bold text-[#60A5FA] flex items-center gap-1.5 ml-auto bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                <Clock className="w-3 h-3 text-[#00CFFF]" />
                                <span>
                                  {item.releaseTime} {item.timezone || 'IST'}
                                </span>
                              </span>
                            </div>

                            {/* Anime Title */}
                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00CFFF] transition-colors truncate">
                              {cleanAnimeTitle(item.animeTitle)}
                            </h3>

                            {/* Episode / Season */}
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8]">
                              <span className="text-[#00CFFF]">Episode {item.episodeNumber}</span>
                              {item.seasonNumber && item.seasonNumber > 1 && (
                                <>
                                  <span>•</span>
                                  <span>Season {item.seasonNumber}</span>
                                </>
                              )}
                            </div>

                            {/* Audio Language Tag */}
                            {item.language && (
                              <div className="text-[10px] text-[#CBD5E1] bg-white/5 border border-white/5 px-2 py-0.5 rounded-md inline-block truncate max-w-full">
                                {item.language}
                              </div>
                            )}
                          </div>

                          {/* Bottom Row: Premiere CTA & Countdown */}
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                            {countdown ? (
                              <span className="font-mono font-bold text-cyan-400 text-[11px]">
                                {countdown}
                              </span>
                            ) : (
                              <span className="text-[#64748B] text-[11px]">Weekly Broadcast</span>
                            )}

                            <span className="text-xs font-bold text-[#1683FF] group-hover:text-[#00CFFF] flex items-center gap-0.5 transition-colors">
                              <span>Premiere</span>
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
