import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CmsScheduleItem } from '../types/cms';
import { Calendar, ChevronRight, Play, Film } from 'lucide-react';
import { cleanAnimeTitle } from '../lib/firestore/anime';
import { getOptimizedImageUrl, FALLBACK_ANIME_BANNER } from '../lib/image-optimizer';

interface WeeklyScheduleStripProps {
  scheduleItems: CmsScheduleItem[];
  navigate: (path: string) => void;
}

const DAYS = [
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
  { short: 'Sun', full: 'Sunday' },
];

interface ScheduleCardItemProps {
  item: CmsScheduleItem;
  dayShort: string;
  navigate: (path: string) => void;
}

const ScheduleCardItem: React.FC<ScheduleCardItemProps> = ({ item, dayShort, navigate }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const animeSlug = item.animeSlug || item.animeId || '';
  const targetUrl = item.episodeNumber
    ? `/anime/${animeSlug}/episode/${item.episodeNumber}`
    : `/anime/${animeSlug}`;

  const epNumber = item.episodeNumber || 1;
  const rawBanner = (item as any).animeBanner || (item as any).banner || item.animePoster || FALLBACK_ANIME_BANNER;
  const rawPoster = item.animePoster || FALLBACK_ANIME_BANNER;

  const [currentImg, setCurrentImg] = useState(() =>
    getOptimizedImageUrl(rawBanner, { width: 320, fallbackType: 'banner' })
  );

  const handleImageError = () => {
    const posterOpt = getOptimizedImageUrl(rawPoster, { width: 280, fallbackType: 'poster' });
    if (currentImg !== posterOpt) {
      setCurrentImg(posterOpt);
    } else {
      setImgFailed(true);
    }
  };

  const displayTitle = cleanAnimeTitle(item.animeTitle);

  return (
    <div
      onClick={() => navigate(targetUrl)}
      className="h-[64px] flex items-center gap-2.5 px-2 rounded-[10px] bg-[#0B1324] border border-white/10 hover:border-[#1E88FF]/40 active:scale-[0.99] cursor-pointer group transition-colors duration-150 min-w-0"
    >
      {/* Left Thumbnail 88x50 */}
      <div className="relative w-[88px] h-[50px] bg-[#050A14] rounded-[6px] overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
        {imgFailed ? (
          <div className="w-full h-full bg-gradient-to-br from-[#0B1324] to-[#101A30] flex items-center justify-center">
            <Film className="w-4 h-4 text-[#64748B]" />
          </div>
        ) : (
          <img
            src={currentImg}
            alt=""
            width={88}
            height={50}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
            onError={handleImageError}
          />
        )}

        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <div className="w-6 h-6 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-md">
            <Play className="w-3 h-3 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Right Info: Title (1 line 13px/600) + "Wed · 21:00 · EP 12" (11px muted) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <h4
          title={displayTitle}
          className="text-[13px] font-semibold leading-[18px] text-white truncate group-hover:text-[#1E88FF] transition-colors duration-150"
        >
          {displayTitle}
        </h4>
        <p className="text-[11px] leading-[15px] text-[#94A3B8] truncate">
          {dayShort} · {item.releaseTime || 'TBA'} · EP {epNumber}
        </p>
      </div>
    </div>
  );
};

export const WeeklyScheduleStrip: React.FC<WeeklyScheduleStripProps> = ({
  scheduleItems,
  navigate,
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const todayButtonRef = useRef<HTMLButtonElement>(null);

  const todayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  })();

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);

  useEffect(() => {
    if (todayButtonRef.current && tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const btn = todayButtonRef.current;
      const scrollPos = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, []);

  const selectedDay = DAYS[selectedDayIndex];

  const filteredSchedule = useMemo(() => {
    if (!scheduleItems || scheduleItems.length === 0) return [];
    return scheduleItems.filter((item) => {
      const day = (item.dayOfWeek || '').toLowerCase();
      return (
        day.includes(selectedDay.full.toLowerCase()) ||
        day.includes(selectedDay.short.toLowerCase())
      );
    });
  }, [scheduleItems, selectedDay]);

  return (
    <section className="space-y-2.5 sm:space-y-3 pb-4 select-none">
      {/* 1. Compact Section Header: height 32px, 16px/700 title, 18px muted icon, 13px primary View All */}
      <div className="h-8 min-h-[32px] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-[18px] h-[18px] text-[#94A3B8] shrink-0" />
          <h2 className="text-[16px] font-bold text-white tracking-tight truncate leading-none">
            Weekly Schedule
          </h2>
        </div>

        <button
          type="button"
          onClick={() => navigate('/schedule')}
          className="text-[13px] font-semibold text-[#1E88FF] hover:opacity-85 flex items-center gap-0.5 transition-opacity duration-150 cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Day Tabs: Small tabs in one line */}
      <div
        ref={tabsContainerRef}
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5"
      >
        {DAYS.map((dayObj, idx) => {
          const isToday = idx === todayIndex;
          const isSelected = idx === selectedDayIndex;

          return (
            <button
              key={dayObj.short}
              ref={isToday ? todayButtonRef : undefined}
              type="button"
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex-1 min-w-[46px] sm:min-w-[56px] py-1.5 px-2 rounded-lg text-center transition-colors duration-150 cursor-pointer border flex items-center justify-center gap-1 leading-none ${
                isSelected
                  ? 'bg-[#1E88FF] border-[#1E88FF] text-white font-bold'
                  : 'bg-[#0B1324] hover:bg-[#101A30] border-white/10 text-[#94A3B8] hover:text-white text-xs'
              }`}
            >
              <span className="text-xs">{dayObj.short}</span>
              {isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isSelected ? 'bg-white' : 'bg-[#1E88FF]'
                  }`}
                  title="Today"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Schedule Content for Selected Day */}
      {filteredSchedule.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredSchedule.slice(0, 6).map((item, idx) => (
            <ScheduleCardItem
              key={`sched-slim-${item.id || item.animeSlug}-${idx}`}
              item={item}
              dayShort={selectedDay.short}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        /* Compact empty state (max 80px) */
        <div className="h-[72px] flex items-center justify-center gap-2.5 px-4 bg-[#0B1324]/50 rounded-xl border border-white/5 text-center">
          <Calendar className="w-4 h-4 text-[#64748B] shrink-0" />
          <p className="text-xs text-[#94A3B8]">
            No releases scheduled for {selectedDay.full}
          </p>
        </div>
      )}
    </section>
  );
};
