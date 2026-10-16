import { useState, useEffect } from 'react';
import type { Anime } from '../types/anime';
import type { Episode } from '../types/episode';
import type { CmsScheduleItem } from '../types/cms';
import { cleanAnimeTitle } from './firestore/anime';

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isLive: boolean;
  totalSeconds: number;
}

export function parseHoursMinutes(timeStr?: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  const s = timeStr.trim();
  const match12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }
  const parts = s.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { hours: parts[0], minutes: parts[1] };
  }
  return null;
}

export function calculateCountdown(
  dayOfWeek?: string,
  releaseTime?: string,
  targetIsoDate?: string
): CountdownResult {
  const zeroResult: CountdownResult = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formatted: '',
    isLive: false,
    totalSeconds: 0,
  };

  try {
    const now = new Date();

    if (targetIsoDate) {
      const parsed = new Date(targetIsoDate);
      if (!isNaN(parsed.getTime())) {
        const diffMs = parsed.getTime() - now.getTime();
        if (diffMs <= 0) {
          return { ...zeroResult, formatted: 'Airing Now', isLive: true };
        }
        const totalSec = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        const formatted =
          days > 0
            ? `${days}d ${hours}h ${minutes}m ${seconds}s`
            : `${hours}h ${minutes}m ${seconds}s`;
        return { days, hours, minutes, seconds, formatted, isLive: false, totalSeconds: totalSec };
      }
    }

    if (!dayOfWeek) return zeroResult;

    const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysList.findIndex(
      (d) => d.toLowerCase() === dayOfWeek.toLowerCase().trim()
    );
    if (targetDayIndex === -1) return zeroResult;

    const currentDayIndex = now.getDay();
    let diffDays = targetDayIndex - currentDayIndex;
    if (diffDays < 0) diffDays += 7;

    const parsedTime = parseHoursMinutes(releaseTime) || { hours: 20, minutes: 0 };
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + diffDays);
    targetDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    // If day is today and time has already passed today, advance to next week
    if (diffDays === 0 && targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      return { ...zeroResult, formatted: 'Airing Now', isLive: true };
    }

    const totalSec = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const formatted =
      days > 0
        ? `${days}d ${hours}h ${minutes}m ${seconds}s`
        : `${hours}h ${minutes}m ${seconds}s`;

    return { days, hours, minutes, seconds, formatted, isLive: false, totalSeconds: totalSec };
  } catch {
    return zeroResult;
  }
}

export function useLiveCountdown(
  dayOfWeek?: string,
  releaseTime?: string,
  targetIsoDate?: string
): CountdownResult {
  const [result, setResult] = useState<CountdownResult>(() =>
    calculateCountdown(dayOfWeek, releaseTime, targetIsoDate)
  );

  useEffect(() => {
    setResult(calculateCountdown(dayOfWeek, releaseTime, targetIsoDate));
    const interval = setInterval(() => {
      setResult(calculateCountdown(dayOfWeek, releaseTime, targetIsoDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [dayOfWeek, releaseTime, targetIsoDate]);

  return result;
}

export function mergeEpisodesWithSchedule(
  anime: Anime,
  publishedEpisodes: Episode[],
  scheduleItems: CmsScheduleItem[]
): Episode[] {
  const animeId = (anime.id || '').toLowerCase().trim();
  const animeSlug = (anime.slug || '').toLowerCase().trim();
  const rawAnimeTitle = (anime.title || '').toLowerCase().trim();
  const cleanTitle = cleanAnimeTitle(anime.title).toLowerCase().trim();

  // Find all schedule items that belong to this anime
  const matchingSlots = scheduleItems.filter((slot) => {
    const slotAnimeId = (slot.animeId || '').toLowerCase().trim();
    const slotSlug = (slot.animeSlug || '').toLowerCase().trim();
    const rawSlotTitle = (slot.animeTitle || '').toLowerCase().trim();
    const cleanSlotTitle = cleanAnimeTitle(slot.animeTitle).toLowerCase().trim();

    if (slotAnimeId && (slotAnimeId === animeId || slotAnimeId === animeSlug)) return true;
    if (slotSlug && (slotSlug === animeSlug || slotSlug === animeId)) return true;
    if (rawSlotTitle && (rawSlotTitle === rawAnimeTitle || cleanSlotTitle === cleanTitle)) return true;
    if (cleanTitle && cleanSlotTitle && (cleanTitle.includes(cleanSlotTitle) || cleanSlotTitle.includes(cleanTitle))) return true;

    // Check alt titles
    if (anime.altTitles && Array.isArray(anime.altTitles)) {
      for (const alt of anime.altTitles) {
        const cleanAlt = cleanAnimeTitle(alt).toLowerCase().trim();
        if (cleanAlt && (cleanAlt === rawSlotTitle || cleanAlt === cleanSlotTitle)) return true;
        if (cleanAlt && cleanSlotTitle && (cleanAlt.includes(cleanSlotTitle) || cleanSlotTitle.includes(cleanAlt))) return true;
      }
    }
    return false;
  });

  const merged = [...publishedEpisodes];

  // Also include anime's upcomingEpisodeNumber if configured on anime itself
  if (anime.upcomingEpisodeNumber && (anime.upcomingAirDate || anime.releaseDay || anime.releaseTime)) {
    const epNum = Number(anime.upcomingEpisodeNumber);
    const alreadyInSlots = matchingSlots.some((s) => Number(s.episodeNumber) === epNum);
    if (!alreadyInSlots) {
      matchingSlots.push({
        id: `anime-upcoming-slot-${anime.id || anime.slug}-${epNum}`,
        animeId: anime.id || anime.slug || '',
        animeSlug: anime.slug || '',
        animeTitle: anime.title,
        animePoster: anime.poster,
        animeBanner: anime.banner,
        episodeNumber: epNum,
        seasonNumber: 1,
        dayOfWeek: (anime.releaseDay as any) || 'Wednesday',
        releaseTime: anime.upcomingReleaseTime || anime.releaseTime || '20:00',
        timezone: anime.timezone || 'Asia/Kolkata',
        language: anime.audioLanguage,
        status: 'upcoming',
      });
    }
  }

  for (const slot of matchingSlots) {
    const slotSeason = Number(slot.seasonNumber || 1);
    let slotEpNum = Number(slot.episodeNumber);

    if (isNaN(slotEpNum) || slotEpNum <= 0) {
      const maxEp = merged.reduce((acc, curr) => Math.max(acc, Number(curr.episodeNumber) || 0), 0);
      slotEpNum = maxEp + 1;
    }

    const existingIndex = merged.findIndex(
      (e) =>
        Number(e.seasonNumber || e.season || 1) === slotSeason &&
        Number(e.episodeNumber) === slotEpNum
    );

    const airDateStr =
      slot.airDate ||
      (slot.dayOfWeek ? `${slot.dayOfWeek} at ${slot.releaseTime}` : slot.releaseTime);

    const isUpcomingSlot = slot.status === 'upcoming' || slot.status === undefined;

    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      // When the slot status is 'upcoming', this episode MUST BE TREATED AS UPCOMING / SCHEDULED
      if (isUpcomingSlot) {
        merged[existingIndex] = {
          ...existing,
          status: 'upcoming',
          isUpcoming: true,
          airDate: airDateStr,
          releaseTime: slot.releaseTime,
          dayOfWeek: slot.dayOfWeek,
          timezone: slot.timezone || 'Asia/Kolkata',
          language: (slot.language as any) || existing.language || anime.audioLanguage,
          thumbnail:
            slot.animeBanner ||
            slot.animePoster ||
            existing.thumbnail ||
            anime.banner ||
            anime.poster,
        };
      } else {
        merged[existingIndex] = {
          ...existing,
          status: slot.status || existing.status,
          isUpcoming: false,
          airDate: airDateStr,
          releaseTime: slot.releaseTime,
          dayOfWeek: slot.dayOfWeek,
          timezone: slot.timezone || 'Asia/Kolkata',
          language: (slot.language as any) || existing.language || anime.audioLanguage,
        };
      }
    } else {
      // Add as a new scheduled episode slot in the list (appears at the end of the episode list)
      merged.push({
        id: `sched-${slot.id || `${anime.id || anime.slug}-${slotEpNum}`}`,
        animeId: anime.id || anime.slug || '',
        animeSlug: anime.slug || anime.id || '',
        animeTitle: anime.title,
        episodeNumber: slotEpNum,
        seasonNumber: slotSeason,
        season: slotSeason,
        title: slot.notes || `Episode ${slotEpNum}`,
        description: `Scheduled weekly broadcast premiere on ${slot.dayOfWeek || 'Weekly'} at ${slot.releaseTime || 'TBA'} (${slot.timezone || 'IST'}). Video streams will activate upon airing.`,
        thumbnail: slot.animeBanner || slot.animePoster || anime.banner || anime.poster || '',
        status: slot.status || 'upcoming',
        isUpcoming: isUpcomingSlot,
        airDate: airDateStr,
        releaseTime: slot.releaseTime,
        dayOfWeek: slot.dayOfWeek,
        timezone: slot.timezone || 'Asia/Kolkata',
        language: (slot.language as any) || anime.audioLanguage,
        published: true,
        videoUrl: '',
        sources: [],
        videoSources: [],
      });
    }
  }

  // Sort by season number, then episode number so scheduled episodes appear at the end in order!
  return merged.sort((a, b) => {
    const sA = Number(a.seasonNumber || a.season || 1);
    const sB = Number(b.seasonNumber || b.season || 1);
    if (sA !== sB) return sA - sB;
    return Number(a.episodeNumber) - Number(b.episodeNumber);
  });
}
