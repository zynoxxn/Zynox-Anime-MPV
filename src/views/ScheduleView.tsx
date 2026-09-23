import React, { useEffect, useState } from 'react';
import type { CmsScheduleItem } from '../types/cms';
import { getCmsSchedule } from '../lib/firestore/cms';
import { getAllAnimes } from '../lib/firestore/anime';
import type { Anime } from '../types/anime';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

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

export const ScheduleView: React.FC<ScheduleViewProps> = ({ navigate, onShowMessage }) => {
  const [scheduleItems, setScheduleItems] = useState<CmsScheduleItem[]>([]);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
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
          setScheduleItems(schList);
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
  const groupedByDay: Record<string, CmsScheduleItem[]> = {};
  for (const day of DAYS_OF_WEEK) {
    groupedByDay[day] = [];
  }
  for (const item of scheduleItems) {
    if (groupedByDay[item.dayOfWeek]) {
      groupedByDay[item.dayOfWeek].push(item);
    } else {
      groupedByDay[item.dayOfWeek] = [item];
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'released':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Released
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3 h-3" /> Delayed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Upcoming
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-[#0E1726] via-[#111C30] to-[#0A1120] border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1683FF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1683FF]/15 border border-[#1683FF]/30 text-[#1683FF] text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Weekly Broadcast Matrix</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Anime <span className="text-[#1683FF]">Release Schedule</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
            Track real-time broadcast schedules and live countdown clocks for upcoming episodes. Multi-audio Hindi Dubs and English Subs are updated weekly.
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-[#60A5FA]">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Today is {todayDayName} • Current Time: {now.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Schedule Items Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#94A3B8]">Loading broadcast matrix...</div>
      ) : scheduleItems.length === 0 ? (
        <div className="bg-[#0B1322] border border-white/5 rounded-2xl p-12 text-center text-[#94A3B8] space-y-2">
          <Calendar className="w-8 h-8 text-[#1683FF] mx-auto opacity-60 mb-2" />
          <h3 className="text-base font-bold text-white">No scheduled releases found</h3>
          <p className="text-xs max-w-sm mx-auto">
            There are currently no scheduled anime broadcasts.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {DAYS_OF_WEEK.map((day) => {
            const itemsForDay = groupedByDay[day] || [];
            if (itemsForDay.length === 0) return null;

            const isToday = day === todayDayName;

            return (
              <div key={day} className="space-y-4">
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isToday ? 'bg-cyan-400 shadow-[0_0_12px_#00D1FF]' : 'bg-[#1683FF]'
                      }`}
                    />
                    <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{day}</span>
                      {isToday && (
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                          TODAY
                        </span>
                      )}
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-[#94A3B8]">
                    {itemsForDay.length} {itemsForDay.length === 1 ? 'Release' : 'Releases'}
                  </span>
                </div>

                {/* Day Schedule Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {itemsForDay.map((item) => {
                    const countdown = item.status === 'upcoming' ? getCountdown(item.dayOfWeek, item.releaseTime) : '';
                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/anime/${item.animeSlug}`)}
                        className="group bg-[#0B1322] border border-white/5 hover:border-[#1683FF]/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-[#1683FF]/10 cursor-pointer flex gap-3.5 relative overflow-hidden"
                      >
                        {/* Poster */}
                        <div className="w-20 h-28 rounded-xl overflow-hidden bg-[#050A14] shrink-0 border border-white/10 relative">
                          <img
                            src={item.animePoster || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'}
                            alt={item.animeTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              {getStatusBadge(item.status)}
                              <span className="text-[11px] font-bold text-[#60A5FA] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#1683FF]" />
                                {item.releaseTime}
                              </span>
                            </div>

                            <h3 className="text-sm font-bold text-white group-hover:text-[#1683FF] transition-colors truncate">
                              {item.animeTitle}
                            </h3>

                            <p className="text-xs text-[#94A3B8] font-semibold">
                              Episode {item.episodeNumber} {item.seasonNumber ? `• Season ${item.seasonNumber}` : ''}
                            </p>

                            {item.language && (
                              <div className="text-[10px] text-[#A9B8CC] bg-white/5 px-2 py-0.5 rounded inline-block truncate max-w-full">
                                {item.language}
                              </div>
                            )}
                          </div>

                          {/* Live Countdown Footer */}
                          {countdown && (
                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                              <span className="text-[#94A3B8] text-[11px]">Releases in:</span>
                              <span className="font-mono font-bold text-cyan-400 text-xs">
                                {countdown}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
