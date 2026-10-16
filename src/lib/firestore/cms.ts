import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  CmsGenre,
  CmsStatus,
  CmsYear,
  CmsRatingRange,
  CmsType,
  CmsLanguage,
  CmsStudio,
  CmsSeason,
  CmsScheduleItem,
  CmsHeroBanner,
  CmsHomepageSection,
  CmsNavigationItem,
  CmsFooterConfig,
  CmsAnnouncement,
  SitePopupNotice,
  CmsSeoSettings,
  CmsSiteSettings,
  CmsLegalPages,
  CmsAdminLog,
} from '../../types/cms';

// Collections
const CMS_GENRES = 'cmsGenres';
const CMS_STATUSES = 'cmsStatuses';
const CMS_YEARS = 'cmsYears';
const CMS_RATINGS = 'cmsRatings';
const CMS_TYPES = 'cmsTypes';
const CMS_LANGUAGES = 'cmsLanguages';
const CMS_STUDIOS = 'cmsStudios';
const CMS_SEASONS = 'cmsSeasons';
const CMS_SCHEDULE = 'cmsSchedule';
const CMS_HERO_BANNERS = 'cmsHeroBanners';
const CMS_HOMEPAGE_SECTIONS = 'cmsHomepageSections';
const CMS_NAVIGATION = 'cmsNavigation';
const CMS_CONFIG = 'cmsConfig';
const CMS_ANNOUNCEMENTS = 'cmsAnnouncements';
const CMS_LOGS = 'cmsAdminLogs';
const CMS_META_DOC_ID = 'cms_catalog_meta';

function sanitize<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && typeof (value as any).toMillis !== 'function') {
        cleaned[key] = sanitize(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === 'object' && item !== null ? sanitize(item) : item
        );
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// ==========================================
// 1. GENRES CMS
// ==========================================
export const DEFAULT_GENRES: CmsGenre[] = [
  { id: 'action', name: 'Action', slug: 'action', description: 'High-octane fights, battles, and intense action.', displayOrder: 1, enabled: true },
  { id: 'romance', name: 'Romance', slug: 'romance', description: 'Heartfelt relationships and romantic tension.', displayOrder: 2, enabled: true },
  { id: 'fantasy', name: 'Fantasy', slug: 'fantasy', description: 'Magical powers, mythical beasts, and wonder.', displayOrder: 3, enabled: true },
  { id: 'comedy', name: 'Comedy', slug: 'comedy', description: 'Laughs, satire, gag humor, and fun.', displayOrder: 4, enabled: true },
  { id: 'drama', name: 'Drama', slug: 'drama', description: 'Emotional stories with character depth.', displayOrder: 5, enabled: true },
  { id: 'sci-fi', name: 'Sci-Fi', slug: 'sci-fi', description: 'Futuristic technology, space, and mecha.', displayOrder: 6, enabled: true },
  { id: 'isekai', name: 'Isekai', slug: 'isekai', description: 'Reincarnated or transported to another realm.', displayOrder: 7, enabled: true },
  { id: 'shounen', name: 'Shounen', slug: 'shounen', description: 'Exciting battles, friendship, and determination.', displayOrder: 8, enabled: true },
  { id: 'sports', name: 'Sports', slug: 'sports', description: 'Athletic competitions, teamwork, and rivalries.', displayOrder: 9, enabled: true },
  { id: 'hentai', name: 'Hentai', slug: 'hentai', description: 'Adult anime series, 18+ uncensored content and animation.', displayOrder: 10, enabled: true },
  { id: 'adventure', name: 'Adventure', slug: 'adventure', description: 'Journeys into unknown worlds and epic quests.', displayOrder: 11, enabled: true },
  { id: 'supernatural', name: 'Supernatural', slug: 'supernatural', description: 'Ghosts, spirits, deities, and occult forces.', displayOrder: 12, enabled: true },
  { id: 'mystery', name: 'Mystery', slug: 'mystery', description: 'Puzzles, detective work, and suspense.', displayOrder: 13, enabled: true },
  { id: 'slice-of-life', name: 'Slice of Life', slug: 'slice-of-life', description: 'Everyday life, school days, and calming stories.', displayOrder: 14, enabled: true },
  { id: 'horror', name: 'Horror', slug: 'horror', description: 'Gore, fear, psychological terror, and eerie dark themes.', displayOrder: 15, enabled: true },
  { id: 'thriller', name: 'Thriller', slug: 'thriller', description: 'Psychological tension and edge-of-seat thrills.', displayOrder: 16, enabled: true },
  { id: 'ecchi', name: 'Ecchi', slug: 'ecchi', description: 'Mild adult themes, fan service, and comedy.', displayOrder: 17, enabled: true },
  { id: 'mecha', name: 'Mecha', slug: 'mecha', description: 'Giant robots, mechanical suits, and tactical combat.', displayOrder: 18, enabled: true },
  { id: 'psychological', name: 'Psychological', slug: 'psychological', description: 'Mind games, manipulation, and intense thought battles.', displayOrder: 19, enabled: true },
  { id: 'martial-arts', name: 'Martial Arts', slug: 'martial-arts', description: 'Hand-to-hand combat, kung fu, karate, and dojo rivalries.', displayOrder: 20, enabled: true },
];

export async function getCmsGenres(): Promise<CmsGenre[]> {
  try {
    const snap = await getDocs(collection(db, CMS_GENRES));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsGenre), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS genres:', err);
  }
  return DEFAULT_GENRES;
}

export async function saveCmsGenre(genre: CmsGenre): Promise<void> {
  const docRef = doc(db, CMS_GENRES, genre.id || genre.slug);
  await setDoc(docRef, sanitize(genre), { merge: true });
}

export async function deleteCmsGenre(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_GENRES, id));
}

// ==========================================
// 2. ANIME STATUSES CMS
// ==========================================
export const DEFAULT_STATUSES: CmsStatus[] = [
  { id: 'ongoing', name: 'Ongoing', slug: 'ongoing', description: 'Currently airing weekly episodes.', badgeColor: '#10B981', displayOrder: 1, enabled: true },
  { id: 'upcoming', name: 'Upcoming', slug: 'upcoming', description: 'Announced anime scheduled for future release.', badgeColor: '#00CFFF', displayOrder: 2, enabled: true },
  { id: 'completed', name: 'Completed', slug: 'completed', description: 'Finished broadcasting all episodes.', badgeColor: '#8B5CF6', displayOrder: 3, enabled: true },
  { id: 'hiatus', name: 'Hiatus', slug: 'hiatus', description: 'Temporarily on broadcast break.', badgeColor: '#F59E0B', displayOrder: 4, enabled: true },
  { id: 'cancelled', name: 'Cancelled', slug: 'cancelled', description: 'Production permanently discontinued.', badgeColor: '#EF4444', displayOrder: 5, enabled: true },
];

export async function getCmsStatuses(): Promise<CmsStatus[]> {
  try {
    const snap = await getDocs(collection(db, CMS_STATUSES));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsStatus), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS statuses:', err);
  }
  return DEFAULT_STATUSES;
}

export async function saveCmsStatus(status: CmsStatus): Promise<void> {
  const docRef = doc(db, CMS_STATUSES, status.id || status.slug);
  await setDoc(docRef, sanitize(status), { merge: true });
}

export async function deleteCmsStatus(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_STATUSES, id));
}

// ==========================================
// 3. YEARS CMS
// ==========================================
export const DEFAULT_YEARS: CmsYear[] = [
  { id: '2026', year: 2026, enabled: true, displayOrder: 1 },
  { id: '2025', year: 2025, enabled: true, displayOrder: 2 },
  { id: '2024', year: 2024, enabled: true, displayOrder: 3 },
  { id: '2023', year: 2023, enabled: true, displayOrder: 4 },
  { id: '2022', year: 2022, enabled: true, displayOrder: 5 },
  { id: '2021', year: 2021, enabled: true, displayOrder: 6 },
  { id: '2020', year: 2020, enabled: true, displayOrder: 7 },
  { id: '2019', year: 2019, enabled: true, displayOrder: 8 },
  { id: '2018', year: 2018, enabled: true, displayOrder: 9 },
  { id: 'classic', year: 2010, enabled: true, displayOrder: 10 },
];

export async function getCmsYears(): Promise<CmsYear[]> {
  try {
    const snap = await getDocs(collection(db, CMS_YEARS));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsYear), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS years:', err);
  }
  return DEFAULT_YEARS;
}

export async function saveCmsYear(year: CmsYear): Promise<void> {
  const docRef = doc(db, CMS_YEARS, year.id || year.year.toString());
  await setDoc(docRef, sanitize(year), { merge: true });
}

export async function deleteCmsYear(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_YEARS, id));
}

// ==========================================
// 4. RATINGS CMS
// ==========================================
export const DEFAULT_RATINGS: CmsRatingRange[] = [
  { id: 'r9', label: '9.0+ Masterpiece', minRating: 9.0, displayOrder: 1, enabled: true },
  { id: 'r8', label: '8.0+ Great', minRating: 8.0, displayOrder: 2, enabled: true },
  { id: 'r7', label: '7.0+ Good', minRating: 7.0, displayOrder: 3, enabled: true },
  { id: 'r6', label: '6.0+ Average', minRating: 6.0, displayOrder: 4, enabled: true },
];

export async function getCmsRatingRanges(): Promise<CmsRatingRange[]> {
  try {
    const snap = await getDocs(collection(db, CMS_RATINGS));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsRatingRange), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS ratings:', err);
  }
  return DEFAULT_RATINGS;
}

export async function saveCmsRatingRange(range: CmsRatingRange): Promise<void> {
  const docRef = doc(db, CMS_RATINGS, range.id);
  await setDoc(docRef, sanitize(range), { merge: true });
}

export async function deleteCmsRatingRange(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_RATINGS, id));
}

// ==========================================
// 5. TYPES CMS
// ==========================================
export const DEFAULT_TYPES: CmsType[] = [
  { id: 'tv', name: 'TV Series', slug: 'tv', description: 'Standard multi-episode episodic broadcast television.', displayOrder: 1, enabled: true },
  { id: 'movie', name: 'Movie', slug: 'movie', description: 'Feature-length anime theatrical films.', displayOrder: 2, enabled: true },
  { id: 'ova', name: 'OVA', slug: 'ova', description: 'Original Video Animation releases.', displayOrder: 3, enabled: true },
  { id: 'ona', name: 'ONA', slug: 'ona', description: 'Original Net Animation releases.', displayOrder: 4, enabled: true },
  { id: 'special', name: 'Special', slug: 'special', description: 'Bonus episodes, side stories, and prologues.', displayOrder: 5, enabled: true },
];

export async function getCmsTypes(): Promise<CmsType[]> {
  try {
    const snap = await getDocs(collection(db, CMS_TYPES));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsType), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS types:', err);
  }
  return DEFAULT_TYPES;
}

export async function saveCmsType(type: CmsType): Promise<void> {
  const docRef = doc(db, CMS_TYPES, type.id || type.slug);
  await setDoc(docRef, sanitize(type), { merge: true });
}

export async function deleteCmsType(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_TYPES, id));
}

// ==========================================
// 6. LANGUAGES CMS
// ==========================================
export const DEFAULT_LANGUAGES: CmsLanguage[] = [
  { id: 'hindi', name: 'Hindi', shortCode: 'hi', badgeName: 'HINDI DUB', enabled: true, displayOrder: 1 },
  { id: 'japanese', name: 'Japanese', shortCode: 'ja', badgeName: 'JPN SUB', enabled: true, displayOrder: 2 },
  { id: 'english', name: 'English', shortCode: 'en', badgeName: 'ENG DUB', enabled: true, displayOrder: 3 },
  { id: 'tamil', name: 'Tamil', shortCode: 'ta', badgeName: 'TAMIL DUB', enabled: true, displayOrder: 4 },
  { id: 'telugu', name: 'Telugu', shortCode: 'te', badgeName: 'TELUGU DUB', enabled: true, displayOrder: 5 },
  { id: 'bengali', name: 'Bengali', shortCode: 'bn', badgeName: 'BENGALI DUB', enabled: true, displayOrder: 6 },
  { id: 'multi', name: 'Multi Audio', shortCode: 'multi', badgeName: 'MULTI', enabled: true, displayOrder: 7 },
];

export async function getCmsLanguages(): Promise<CmsLanguage[]> {
  try {
    const snap = await getDocs(collection(db, CMS_LANGUAGES));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsLanguage), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS languages:', err);
  }
  return DEFAULT_LANGUAGES;
}

export async function saveCmsLanguage(lang: CmsLanguage): Promise<void> {
  const docRef = doc(db, CMS_LANGUAGES, lang.id || lang.shortCode);
  await setDoc(docRef, sanitize(lang), { merge: true });
}

export async function deleteCmsLanguage(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_LANGUAGES, id));
}

// ==========================================
// 7. STUDIOS CMS
// ==========================================
export const DEFAULT_STUDIOS: CmsStudio[] = [
  { id: 'mappa', name: 'MAPPA', slug: 'mappa', description: 'Jujutsu Kaisen, Chainsaw Man, Vinland Saga S2', website: 'http://www.mappa.co.jp/', enabled: true },
  { id: 'ufotable', name: 'ufotable', slug: 'ufotable', description: 'Demon Slayer: Kimetsu no Yaiba, Fate/stay night', website: 'http://www.ufotable.com/', enabled: true },
  { id: 'bones', name: 'Bones', slug: 'bones', description: 'My Hero Academia, Mob Psycho 100, Fullmetal Alchemist', website: 'https://www.bones.co.jp/', enabled: true },
  { id: 'cloverworks', name: 'CloverWorks', slug: 'cloverworks', description: 'Wind Breaker, Spy x Family, Bocchi the Rock!', website: 'https://cloverworks.co.jp/', enabled: true },
  { id: 'a1-pictures', name: 'A-1 Pictures', slug: 'a-1-pictures', description: 'Solo Leveling, Sword Art Online, Kaguya-sama', website: 'https://a1p.jp/', enabled: true },
  { id: 'wit-studio', name: 'WIT Studio', slug: 'wit-studio', description: 'Attack on Titan S1-3, Spy x Family, Vinland Saga S1', website: 'https://www.witstudio.co.jp/', enabled: true },
  { id: 'madhouse', name: 'Madhouse', slug: 'madhouse', description: 'Frieren: Beyond Journey\'s End, Hunter x Hunter, Death Note', website: 'https://www.madhouse.co.jp/', enabled: true },
  { id: 'production-ig', name: 'Production I.G', slug: 'production-ig', description: 'Kaiju No. 8, Haikyu!!, Psycho-Pass', website: 'https://www.production-ig.co.jp/', enabled: true },
];

export async function getCmsStudios(): Promise<CmsStudio[]> {
  try {
    const snap = await getDocs(collection(db, CMS_STUDIOS));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ ...(d.data() as CmsStudio), id: d.id }));
    }
  } catch (err) {
    console.warn('Using default CMS studios:', err);
  }
  return DEFAULT_STUDIOS;
}

export async function saveCmsStudio(studio: CmsStudio): Promise<void> {
  const docRef = doc(db, CMS_STUDIOS, studio.id || studio.slug);
  await setDoc(docRef, sanitize(studio), { merge: true });
}

export async function deleteCmsStudio(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_STUDIOS, id));
}

// ==========================================
// 8. SEASONS CMS
// ==========================================
export const DEFAULT_SEASONS: CmsSeason[] = [
  { id: 'winter-2026', name: 'Winter 2026', slug: 'winter-2026', year: 2026, startDate: '2026-01-01', endDate: '2026-03-31', status: 'current', enabled: true },
  { id: 'spring-2026', name: 'Spring 2026', slug: 'spring-2026', year: 2026, startDate: '2026-04-01', endDate: '2026-06-30', status: 'upcoming', enabled: true },
  { id: 'summer-2026', name: 'Summer 2026', slug: 'summer-2026', year: 2026, startDate: '2026-07-01', endDate: '2026-09-30', status: 'upcoming', enabled: true },
  { id: 'fall-2026', name: 'Fall 2026', slug: 'fall-2026', year: 2026, startDate: '2026-10-01', endDate: '2026-12-31', status: 'upcoming', enabled: true },
  { id: 'fall-2025', name: 'Fall 2025', slug: 'fall-2025', year: 2025, startDate: '2025-10-01', endDate: '2025-12-31', status: 'completed', enabled: true },
];

export async function getCmsSeasons(): Promise<CmsSeason[]> {
  try {
    const snap = await getDocs(collection(db, CMS_SEASONS));
    if (!snap.empty) {
      return snap.docs.map((d) => ({ ...(d.data() as CmsSeason), id: d.id }));
    }
  } catch (err) {
    console.warn('Using default CMS seasons:', err);
  }
  return DEFAULT_SEASONS;
}

export async function saveCmsSeason(season: CmsSeason): Promise<void> {
  const docRef = doc(db, CMS_SEASONS, season.id || season.slug);
  await setDoc(docRef, sanitize(season), { merge: true });
}

export async function deleteCmsSeason(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_SEASONS, id));
}

// ==========================================
// 9. RELEASE SCHEDULE CMS & AUTO-CALCULATOR
// ==========================================
export const DEFAULT_SCHEDULE: CmsScheduleItem[] = [
  {
    id: 'sch-alya-russian',
    animeId: 'anime-alya-russian',
    animeTitle: 'Alya Sometimes Hides Her Feelings in Russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    animePoster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    animeBanner: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=80',
    episodeNumber: 12,
    seasonNumber: 1,
    dayOfWeek: 'Wednesday',
    releaseTime: '21:00',
    timezone: 'Asia/Kolkata',
    language: 'Hindi Dub & Japanese Sub',
    status: 'upcoming',
  },
  {
    id: 'sch-angel-next-door',
    animeId: 'anime-angel-next-door',
    animeTitle: 'The Angel Next Door Spoils Me Rotten',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    animePoster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    animeBanner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    episodeNumber: 12,
    seasonNumber: 1,
    dayOfWeek: 'Saturday',
    releaseTime: '20:30',
    timezone: 'Asia/Kolkata',
    language: 'Hindi Dub',
    status: 'upcoming',
  },
  {
    id: 'sch-bleach',
    animeId: 'anime-bleach',
    animeTitle: 'Bleach',
    animeSlug: 'bleach',
    animePoster: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
    animeBanner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    episodeNumber: 37,
    seasonNumber: 3,
    dayOfWeek: 'Monday',
    releaseTime: '20:00',
    timezone: 'Asia/Kolkata',
    language: 'Hindi Dub & Japanese Sub',
    status: 'upcoming',
  },
];

export async function getCmsSchedule(): Promise<CmsScheduleItem[]> {
  try {
    const snap = await getDocs(collection(db, CMS_SCHEDULE));
    if (!snap.empty) {
      const items: CmsScheduleItem[] = snap.docs.map((d) => {
        const item = d.data() as CmsScheduleItem;
        return {
          ...item,
          id: d.id,
          animeBanner: item.animeBanner || item.animePoster,
        };
      });

      // Combine with defaults for animes not yet explicitly saved to Firestore
      const existingAnimeKeys = new Set(
        items.map((i) => (i.animeId || i.animeSlug || i.animeTitle || '').toLowerCase())
      );
      const combined: CmsScheduleItem[] = [...items];
      for (const def of DEFAULT_SCHEDULE) {
        const defKey = (def.animeId || def.animeSlug || def.animeTitle || '').toLowerCase();
        if (!existingAnimeKeys.has(defKey)) {
          combined.push(def);
        }
      }
      return combined;
    }
  } catch (err) {
    console.warn('Using default CMS schedule:', err);
  }
  return DEFAULT_SCHEDULE;
}

export async function saveCmsScheduleItem(item: CmsScheduleItem): Promise<void> {
  const docRef = doc(db, CMS_SCHEDULE, item.id);
  await setDoc(docRef, sanitize(item), { merge: true });
}

export async function deleteCmsScheduleItem(id: string): Promise<void> {
  await deleteDoc(doc(db, CMS_SCHEDULE, id));
}

// ==========================================
// 10. HERO BANNERS CMS
// ==========================================
export const DEFAULT_HERO_BANNERS: CmsHeroBanner[] = [
  {
    id: 'hero-alya-russian',
    title: 'Alya Sometimes Hides Her Feelings in Russian',
    subtitle: 'Summer 2024 • Multi Audio (Hindi Dub + Eng Sub) • 1080p Ultra HD',
    description: 'Silver-haired high school beauty Alya whispers affectionate Russian phrases to Masachika Kuze, completely oblivious that he secretly understands every word!',
    animeId: 'anime-alya-russian',
    animeSlug: 'alya-sometimes-hides-her-feelings-in-russian',
    backgroundImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1600&auto=format&fit=crop&q=85',
    posterImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    buttonText: 'Watch Episode 1',
    buttonUrl: '/anime/alya-sometimes-hides-her-feelings-in-russian/episode/1',
    secondaryButtonText: 'Series Info',
    secondaryButtonUrl: '/anime/alya-sometimes-hides-her-feelings-in-russian',
    active: true,
    displayOrder: 1,
  },
  {
    id: 'hero-angel-next-door',
    title: 'The Angel Next Door Spoils Me Rotten',
    subtitle: 'Winter 2023 • Hindi Dub & Multi Audio • 1080p Ultra HD',
    description: 'When Amane hands his umbrella to school angel Mahiru Shiina during a heavy downpour, an adorable domestic bond starts to sweeten their everyday high school life.',
    animeId: 'anime-angel-next-door',
    animeSlug: 'the-angel-next-door-spoils-me-rotten',
    backgroundImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=85',
    posterImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    buttonText: 'Watch Episode 1',
    buttonUrl: '/anime/the-angel-next-door-spoils-me-rotten/episode/1',
    secondaryButtonText: 'Details',
    secondaryButtonUrl: '/anime/the-angel-next-door-spoils-me-rotten',
    active: true,
    displayOrder: 2,
  },
];

export async function getCmsHeroBanners(): Promise<CmsHeroBanner[]> {
  try {
    const snap = await getDocs(collection(db, CMS_HERO_BANNERS));
    if (!snap.empty) {
      const list = snap.docs
        .filter((d) => d.id !== CMS_META_DOC_ID && d.id !== '__meta__')
        .map((d) => ({ ...(d.data() as CmsHeroBanner), id: d.id }));
      // If collection only contains meta doc, it means the admin cleared all banners
      if (list.length > 0 || snap.docs.some((d) => d.id === CMS_META_DOC_ID || d.id === '__meta__')) {
        return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
    }
  } catch (err) {
    console.warn('Using default CMS hero banners:', err);
  }
  return DEFAULT_HERO_BANNERS;
}

export async function saveCmsHeroBanner(banner: CmsHeroBanner): Promise<void> {
  const docRef = doc(db, CMS_HERO_BANNERS, banner.id);
  await setDoc(docRef, sanitize(banner), { merge: true });
}

export async function deleteCmsHeroBanner(id: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, CMS_HERO_BANNERS));
    if (snap.empty) {
      // First time deleting a default item: seed remaining defaults and write meta
      const remaining = DEFAULT_HERO_BANNERS.filter((b) => b.id !== id);
      await setDoc(doc(db, CMS_HERO_BANNERS, CMS_META_DOC_ID), { initialized: true });
      for (const b of remaining) {
        await setDoc(doc(db, CMS_HERO_BANNERS, b.id), sanitize(b));
      }
      return;
    }
    await deleteDoc(doc(db, CMS_HERO_BANNERS, id));
    // If all items deleted, ensure meta doc exists so empty array is returned instead of defaults
    const remainingDocs = snap.docs.filter((d) => d.id !== id && d.id !== CMS_META_DOC_ID && d.id !== '__meta__');
    if (remainingDocs.length === 0) {
      await setDoc(doc(db, CMS_HERO_BANNERS, CMS_META_DOC_ID), { initialized: true });
    }
  } catch (err) {
    console.error('Failed to delete hero banner from Firestore:', err);
    throw err;
  }
}

export async function deleteHeroBannersForAnime(animeIdOrSlug: string): Promise<void> {
  if (!animeIdOrSlug) return;
  try {
    const targetKey = animeIdOrSlug.toLowerCase().trim();
    const cleanKey = targetKey.replace(/^anime-/, '');
    const snap = await getDocs(collection(db, CMS_HERO_BANNERS));

    if (snap.empty) {
      // If collection is empty, filter out matching default banners and persist the rest so defaults don't reappear
      const remaining = DEFAULT_HERO_BANNERS.filter((b) => {
        const bAnimeId = (b.animeId || '').toLowerCase();
        const bAnimeSlug = (b.animeSlug || '').toLowerCase();
        const bId = (b.id || '').toLowerCase();
        return (
          bAnimeId !== targetKey &&
          bAnimeSlug !== targetKey &&
          bAnimeId !== cleanKey &&
          bAnimeSlug !== cleanKey &&
          !bId.includes(cleanKey)
        );
      });
      await setDoc(doc(db, CMS_HERO_BANNERS, CMS_META_DOC_ID), { initialized: true });
      for (const b of remaining) {
        await setDoc(doc(db, CMS_HERO_BANNERS, b.id), sanitize(b));
      }
      return;
    }

    for (const docSnap of snap.docs) {
      if (docSnap.id === CMS_META_DOC_ID || docSnap.id === '__meta__') continue;
      const data = docSnap.data() as CmsHeroBanner;
      const bAnimeId = (data.animeId || '').toLowerCase();
      const bAnimeSlug = (data.animeSlug || '').toLowerCase();
      const bId = docSnap.id.toLowerCase();
      if (
        bAnimeId === targetKey ||
        bAnimeSlug === targetKey ||
        bAnimeId === cleanKey ||
        bAnimeSlug === cleanKey ||
        bId === targetKey ||
        bId === `hero-${cleanKey}` ||
        bId.includes(cleanKey)
      ) {
        await deleteDoc(doc(db, CMS_HERO_BANNERS, docSnap.id));
      }
    }

    const afterSnap = await getDocs(collection(db, CMS_HERO_BANNERS));
    const remainingDocs = afterSnap.docs.filter((d) => d.id !== CMS_META_DOC_ID && d.id !== '__meta__');
    if (remainingDocs.length === 0) {
      await setDoc(doc(db, CMS_HERO_BANNERS, CMS_META_DOC_ID), { initialized: true });
    }
  } catch (err) {
    console.warn('Failed to delete hero banners for anime:', err);
  }
}

// ==========================================
// 11. HOMEPAGE SECTIONS CMS
// ==========================================
export const DEFAULT_HOMEPAGE_SECTIONS: CmsHomepageSection[] = [
  { id: 'sec-hero', key: 'hero', title: 'Spotlight Banner', enabled: true, displayOrder: 1, layout: 'slider', contentSource: 'featured', maxItems: 5 },
  { id: 'sec-trending', key: 'trending', title: 'Trending This Week', subtitle: 'Most watched anime across Zynox stream network', enabled: true, displayOrder: 2, layout: 'carousel', contentSource: 'trending', maxItems: 10 },
  { id: 'sec-latest-eps', key: 'latest_episodes', title: 'Latest Released Episodes', subtitle: 'Fresh episodes uploaded in Multi Audio', enabled: true, displayOrder: 3, layout: 'grid', contentSource: 'latest_episodes', maxItems: 12 },
  { id: 'sec-popular', key: 'popular', title: 'Top Ranked Anime', subtitle: 'Highest rated masterpiece series', enabled: true, displayOrder: 4, layout: 'ranked', contentSource: 'popular', maxItems: 10 },
  { id: 'sec-ongoing', key: 'ongoing', title: 'Currently Airing Series', subtitle: 'Broadcast schedule ongoing', enabled: true, displayOrder: 5, layout: 'carousel', contentSource: 'ongoing', maxItems: 10 },
  { id: 'sec-upcoming', key: 'upcoming', title: 'Upcoming Anime Hype', subtitle: 'Highly anticipated upcoming releases', enabled: true, displayOrder: 6, layout: 'carousel', contentSource: 'upcoming', maxItems: 10 },
  { id: 'sec-completed', key: 'completed', title: 'Completed Masterpieces', subtitle: 'Binge the full series start to finish', enabled: true, displayOrder: 7, layout: 'carousel', contentSource: 'completed', maxItems: 10 },
];

export async function getCmsHomepageSections(): Promise<CmsHomepageSection[]> {
  try {
    const snap = await getDocs(collection(db, CMS_HOMEPAGE_SECTIONS));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsHomepageSection), id: d.id }));
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch (err) {
    console.warn('Using default CMS homepage sections:', err);
  }
  return DEFAULT_HOMEPAGE_SECTIONS;
}

export async function saveCmsHomepageSection(section: CmsHomepageSection): Promise<void> {
  const docRef = doc(db, CMS_HOMEPAGE_SECTIONS, section.id || section.key);
  await setDoc(docRef, sanitize(section), { merge: true });
}

export async function saveCmsHomepageSections(sections: CmsHomepageSection[]): Promise<void> {
  for (const s of sections) {
    await saveCmsHomepageSection(s);
  }
}

// ==========================================
// 12. NAVIGATION CMS
// ==========================================
export const DEFAULT_NAVIGATION: CmsNavigationItem[] = [
  { id: 'nav-home', title: 'Home', url: '/', iconName: 'Home', targetLocation: 'header', enabled: true, displayOrder: 1 },
  { id: 'nav-browse', title: 'Browse', url: '/browse', iconName: 'Compass', targetLocation: 'header', enabled: true, displayOrder: 2 },
  { id: 'nav-schedule', title: 'Schedule', url: '/schedule', iconName: 'Calendar', targetLocation: 'header', enabled: true, displayOrder: 3 },
  { id: 'nav-ongoing', title: 'Ongoing', url: '/ongoing', iconName: 'PlayCircle', targetLocation: 'header', enabled: true, displayOrder: 4 },
  { id: 'nav-upcoming', title: 'Upcoming', url: '/upcoming', iconName: 'Clock', targetLocation: 'header', enabled: true, displayOrder: 5 },
  { id: 'nav-completed', title: 'Completed', url: '/completed', iconName: 'CheckCircle', targetLocation: 'header', enabled: true, displayOrder: 6 },
  { id: 'nav-requests', title: 'Requests', url: '/requests', iconName: 'Film', targetLocation: 'header', enabled: true, displayOrder: 7 },
  { id: 'nav-watchlist', title: 'Watchlist', url: '/watchlist', iconName: 'Bookmark', targetLocation: 'header', enabled: true, displayOrder: 8, requiresAuth: true },
];

export async function getCmsNavigation(): Promise<CmsNavigationItem[]> {
  try {
    const snap = await getDocs(collection(db, CMS_NAVIGATION));
    if (!snap.empty) {
      const list = snap.docs
        .filter((d) => d.id !== CMS_META_DOC_ID && d.id !== '__meta__')
        .map((d) => ({ ...(d.data() as CmsNavigationItem), id: d.id }));
      if (list.length > 0 || snap.docs.some((d) => d.id === CMS_META_DOC_ID || d.id === '__meta__')) {
        return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      }
    }
  } catch (err) {
    console.warn('Using default CMS navigation:', err);
  }
  return DEFAULT_NAVIGATION;
}

export async function saveCmsNavigationItem(item: CmsNavigationItem): Promise<void> {
  const docRef = doc(db, CMS_NAVIGATION, item.id);
  await setDoc(docRef, sanitize(item), { merge: true });
}

export async function deleteCmsNavigationItem(id: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, CMS_NAVIGATION));
    if (snap.empty) {
      const remaining = DEFAULT_NAVIGATION.filter((n) => n.id !== id);
      await setDoc(doc(db, CMS_NAVIGATION, CMS_META_DOC_ID), { initialized: true });
      for (const n of remaining) {
        await setDoc(doc(db, CMS_NAVIGATION, n.id), sanitize(n));
      }
      return;
    }
    await deleteDoc(doc(db, CMS_NAVIGATION, id));
    const remainingDocs = snap.docs.filter((d) => d.id !== id && d.id !== CMS_META_DOC_ID && d.id !== '__meta__');
    if (remainingDocs.length === 0) {
      await setDoc(doc(db, CMS_NAVIGATION, CMS_META_DOC_ID), { initialized: true });
    }
  } catch (err) {
    console.error('Failed to delete navigation item:', err);
    throw err;
  }
}

// ==========================================
// 13. FOOTER CMS
// ==========================================
export const DEFAULT_FOOTER_CONFIG: CmsFooterConfig = {
  aboutText: 'ZYNOX ANIME is your destination for fast, high definition anime streaming with Hindi Dub and English Subtitles. We index authorized third-party media embeds just like Google.',
  copyrightText: '© 2026 ZYNOX ANIME. All rights reserved.',
  contactEmail: 'zairoxmax2.0@gmail.com',
  telegramUrl: 'https://t.me/ZynoxAnime',
  discordUrl: 'https://discord.gg/zynox',
  disclaimerText: 'ZYNOX ANIME does not host any media files on its servers. All videos are embedded from authorized third-party video storage providers.',
  socialLinks: [
    { platform: 'telegram', url: 'https://t.me/ZynoxAnime' },
    { platform: 'instagram', url: 'https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl' },
    { platform: 'discord', url: 'https://discord.gg/zynox' },
    { platform: 'email', url: 'mailto:zairoxmax2.0@gmail.com' },
  ],
  columns: [
    {
      id: 'col-explore',
      title: 'Explore',
      links: [
        { label: 'Browse Catalog', url: '/browse' },
        { label: 'Release Schedule', url: '/schedule' },
        { label: 'Ongoing Series', url: '/ongoing' },
        { label: 'Upcoming Anime', url: '/upcoming' },
        { label: 'Completed Series', url: '/completed' },
      ],
    },
    {
      id: 'col-community',
      title: 'Community',
      links: [
        { label: 'Request Anime', url: '/requests' },
        { label: 'Join Telegram', url: 'https://t.me/ZynoxAnime', isExternal: true },
        { label: 'Discord Server', url: 'https://discord.gg/zynox', isExternal: true },
        { label: 'User Watchlist', url: '/watchlist' },
      ],
    },
    {
      id: 'col-legal',
      title: 'Legal & Info',
      links: [
        { label: 'About Us', url: '/about' },
        { label: 'DMCA Notice', url: '/dmca' },
        { label: 'Disclaimer', url: '/disclaimer' },
        { label: 'Privacy Policy', url: '/privacy' },
        { label: 'Terms of Service', url: '/terms' },
      ],
    },
  ],
};

export async function getCmsFooterConfig(): Promise<CmsFooterConfig> {
  try {
    const docRef = doc(db, CMS_CONFIG, 'footer');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_FOOTER_CONFIG, ...(snap.data() as Partial<CmsFooterConfig>) };
    }
  } catch (err) {
    console.warn('Using default CMS footer config:', err);
  }
  return DEFAULT_FOOTER_CONFIG;
}

export async function saveCmsFooterConfig(config: CmsFooterConfig): Promise<void> {
  const docRef = doc(db, CMS_CONFIG, 'footer');
  await setDoc(docRef, sanitize(config), { merge: true });
}

// ==========================================
// 14. ANNOUNCEMENTS CMS
// ==========================================
export const DEFAULT_ANNOUNCEMENT: CmsAnnouncement = {
  id: 'announcement-welcome',
  title: 'Welcome to ZYNOX ANIME High-Speed Streaming!',
  message: 'Enjoy Multi-Audio Hindi Dubs & 1080p Ultra HD Streams. Join our Telegram for instant episode release alerts!',
  type: 'info',
  displayLocation: 'notification',
  link: 'https://t.me/ZynoxAnime',
  buttonText: 'Join Telegram',
  active: true,
  dismissible: true,
};

export async function getCmsAnnouncements(): Promise<CmsAnnouncement[]> {
  try {
    const snap = await getDocs(collection(db, CMS_ANNOUNCEMENTS));
    if (!snap.empty) {
      const list = snap.docs
        .filter((d) => d.id !== CMS_META_DOC_ID && d.id !== '__meta__')
        .map((d) => ({ ...(d.data() as CmsAnnouncement), id: d.id }));
      if (list.length > 0 || snap.docs.some((d) => d.id === CMS_META_DOC_ID || d.id === '__meta__')) {
        return list;
      }
    }
  } catch (err) {
    console.warn('Using default CMS announcements:', err);
  }
  return [DEFAULT_ANNOUNCEMENT];
}

export async function saveCmsAnnouncement(announcement: CmsAnnouncement): Promise<void> {
  const docRef = doc(db, CMS_ANNOUNCEMENTS, announcement.id);
  await setDoc(docRef, sanitize(announcement), { merge: true });
}

export async function deleteCmsAnnouncement(id: string): Promise<void> {
  try {
    const snap = await getDocs(collection(db, CMS_ANNOUNCEMENTS));
    if (snap.empty) {
      // First deletion of default: mark empty with meta
      await setDoc(doc(db, CMS_ANNOUNCEMENTS, CMS_META_DOC_ID), { initialized: true });
      return;
    }
    await deleteDoc(doc(db, CMS_ANNOUNCEMENTS, id));
    const remainingDocs = snap.docs.filter((d) => d.id !== id && d.id !== CMS_META_DOC_ID && d.id !== '__meta__');
    if (remainingDocs.length === 0) {
      await setDoc(doc(db, CMS_ANNOUNCEMENTS, CMS_META_DOC_ID), { initialized: true });
    }
  } catch (err) {
    console.error('Failed to delete announcement:', err);
    throw err;
  }
}

// ==========================================
// 14B. WEBSITE OPEN POPUP NOTICE CARD
// ==========================================
export const DEFAULT_POPUP_NOTICE: SitePopupNotice = {
  id: 'popup-notice-config',
  enabled: true,
  version: '1.0',
  displayDelaySeconds: 6, // 5 to 7 seconds after entering website
  header: {
    title: 'Notice',
    titleColor: '#FFFFFF',
    badgeText: '',
    icon: 'megaphone',
    themeColor: 'blue',
  },
  notice: {
    text: 'Watch and download your favorite anime in Hindi Dub & Multi Audio in 1080p Ultra HD.\n\nJoin our Telegram channel for regular updates and new episode releases.',
    highlightText: '',
    imageUrl: '',
  },
  footer: {
    noteText: '',
    primaryButtonText: 'Join Telegram',
    primaryButtonUrl: 'https://t.me/ZynoxAnime',
    secondaryButtonText: 'Continue',
    showDontShowAgain: true,
  },
};

export async function getCmsPopupNotice(): Promise<SitePopupNotice> {
  try {
    const docRef = doc(db, CMS_CONFIG, 'popupNotice');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<SitePopupNotice>;
      return {
        ...DEFAULT_POPUP_NOTICE,
        ...data,
        header: {
          ...DEFAULT_POPUP_NOTICE.header,
          ...(data.header || {}),
        },
        notice: {
          ...DEFAULT_POPUP_NOTICE.notice,
          ...(data.notice || {}),
        },
        footer: {
          ...DEFAULT_POPUP_NOTICE.footer,
          ...(data.footer || {}),
        },
      };
    }

    // Fallback: also check siteSettings collection
    const altDocRef = doc(db, 'siteSettings', 'popupNotice');
    const altSnap = await getDoc(altDocRef);
    if (altSnap.exists()) {
      const data = altSnap.data() as Partial<SitePopupNotice>;
      return {
        ...DEFAULT_POPUP_NOTICE,
        ...data,
        header: { ...DEFAULT_POPUP_NOTICE.header, ...(data.header || {}) },
        notice: { ...DEFAULT_POPUP_NOTICE.notice, ...(data.notice || {}) },
        footer: { ...DEFAULT_POPUP_NOTICE.footer, ...(data.footer || {}) },
      };
    }
  } catch (err) {
    console.warn('Failed to get CMS popup notice, using defaults:', err);
  }
  return DEFAULT_POPUP_NOTICE;
}

export async function saveCmsPopupNotice(notice: SitePopupNotice): Promise<void> {
  try {
    const docRef = doc(db, CMS_CONFIG, 'popupNotice');
    await setDoc(docRef, sanitize(notice), { merge: true });

    // Also mirror to siteSettings for maximum resilience
    try {
      const altDocRef = doc(db, 'siteSettings', 'popupNotice');
      await setDoc(altDocRef, sanitize(notice), { merge: true });
    } catch {
      // ignore mirror error
    }
  } catch (err) {
    console.error('Failed to save popup notice config:', err);
    throw err;
  }
}

/**
 * Real-time listener for site entrance popup notice.
 * Automatically triggers whenever admin updates the notice in CMS.
 */
export function subscribeToCmsPopupNotice(
  callback: (notice: SitePopupNotice) => void
): () => void {
  try {
    const docRef = doc(db, CMS_CONFIG, 'popupNotice');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<SitePopupNotice>;
          callback({
            ...DEFAULT_POPUP_NOTICE,
            ...data,
            header: {
              ...DEFAULT_POPUP_NOTICE.header,
              ...(data.header || {}),
            },
            notice: {
              ...DEFAULT_POPUP_NOTICE.notice,
              ...(data.notice || {}),
            },
            footer: {
              ...DEFAULT_POPUP_NOTICE.footer,
              ...(data.footer || {}),
            },
          });
        } else {
          callback(DEFAULT_POPUP_NOTICE);
        }
      },
      (err) => {
        console.warn('Popup notice snapshot listener error:', err);
        callback(DEFAULT_POPUP_NOTICE);
      }
    );
  } catch (err) {
    console.warn('Failed to attach popup notice snapshot listener:', err);
    callback(DEFAULT_POPUP_NOTICE);
    return () => {};
  }
}

// ==========================================
// 15. SEO SETTINGS CMS
// ==========================================
export const DEFAULT_SEO_SETTINGS: CmsSeoSettings = {
  homepageTitle: 'ZYNOX ANIME — Watch Anime in Hindi Dub & English Sub in 1080p HD',
  homepageDescription: 'Stream and download your favorite anime series and movies online in Multi Audio (Hindi Dub, English Sub, Japanese) in crystal clear 1080p HD with zero lag.',
  homepageKeywords: 'anime hindi dub, download anime in hindi, watch anime online, the angel next door hindi dub, alya sometimes hides her feelings in russian hindi dub, anime 1080p, anime zip batch download, ZYNOX ANIME',
  defaultOgImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
  siteDescription: 'High performance anime streaming portal featuring instant episode releases and multi-language player options.',
  robotsTxt: 'User-agent: *\nAllow: /\n\nSitemap: https://ais-pre-dtndjeqftnisrncgqh376s-1073184695775.asia-southeast1.run.app/sitemap.xml',
  animeTitleTemplate: 'Watch {title} in Hindi Dub & English Sub (All Episodes HD) — {siteName}',
  downloadTitleTemplate: 'Download {title} [Hindi Dubbed] All Episodes 720p 1080p HD Batch Zip — {siteName}',
  episodeTitleTemplate: 'Watch {title} Episode {epNumber} [Hindi Dub & Sub] 1080p HD Online — {siteName}',
  defaultTitle: 'ZYNOX ANIME — Watch Anime in Hindi Dub & English Sub in 1080p HD',
  titleSuffix: '— ZYNOX ANIME',
  defaultDescription: 'Stream and download anime series and movies online in Hindi Dub and English Sub with high-speed links.',
  keywords: ['anime hindi dub', 'download anime hindi dubbed', 'watch anime online', 'anime 1080p', 'anime batch zip'],
  twitterHandle: '@zynoxanimes',
};

export async function getCmsSeoSettings(): Promise<CmsSeoSettings> {
  try {
    const docRef = doc(db, CMS_CONFIG, 'seo');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_SEO_SETTINGS, ...(snap.data() as Partial<CmsSeoSettings>) };
    }
  } catch (err) {
    console.warn('Using default CMS SEO settings:', err);
  }
  return DEFAULT_SEO_SETTINGS;
}

export async function saveCmsSeoSettings(seo: CmsSeoSettings): Promise<void> {
  const docRef = doc(db, CMS_CONFIG, 'seo');
  await setDoc(docRef, sanitize(seo), { merge: true });
}

export const getCmsSeoConfig = getCmsSeoSettings;
export const saveCmsSeoConfig = saveCmsSeoSettings;

// ==========================================
// 16. WEBSITE SETTINGS CMS
// ==========================================
export const DEFAULT_CMS_SITE_SETTINGS: CmsSiteSettings = {
  siteName: 'ZYNOX ANIME',
  logoText: 'ZYNOX',
  tagline: 'High Performance Anime Streaming in Multi Audio',
  themeAccent: '#1683FF',
  contactEmail: 'zairoxmax2.0@gmail.com',
  telegramUrl: 'https://t.me/ZynoxAnime',
  discordUrl: 'https://discord.gg/zynox',
  disclaimerText: 'ZYNOX ANIME does not store any media files on its server. All contents are provided by non-affiliated third parties and embedded video players.',
  enableRequests: true,
  enableCommunityComments: true,
  defaultLanguage: 'Hindi',
  defaultQuality: '1080p',
  timezone: 'Asia/Kolkata',
  maintenanceMode: false,
  trendingMode: 'auto',
  popularMode: 'auto',
};

export async function getCmsSiteSettings(): Promise<CmsSiteSettings> {
  try {
    const docRef = doc(db, CMS_CONFIG, 'siteSettings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_CMS_SITE_SETTINGS, ...(snap.data() as Partial<CmsSiteSettings>) };
    }
  } catch (err) {
    console.warn('Using default CMS Site Settings:', err);
  }
  return DEFAULT_CMS_SITE_SETTINGS;
}

export async function saveCmsSiteSettings(settings: Partial<CmsSiteSettings>): Promise<void> {
  const docRef = doc(db, CMS_CONFIG, 'siteSettings');
  await setDoc(docRef, sanitize(settings), { merge: true });
}

// ==========================================
// 17. LEGAL PAGES CMS
// ==========================================
export const DEFAULT_LEGAL_PAGES: CmsLegalPages = {
  about: `## About ZYNOX ANIME

Welcome to **ZYNOX ANIME**, the premier anime streaming destination dedicated to bringing you the highest quality anime content in **Multi Audio (Hindi Dubbed, English Subbed, and Japanese Original)**.

Our mission is to create a seamless, lightning-fast watching experience with zero buffering, intuitive episode selectors, and comprehensive anime discovery filters.

### Key Features:
- **Multi Audio Experience**: Watch anime in Hindi, English, and Japanese.
- **Ultra HD Quality**: Crystal clear 1080p and 720p external video sources.
- **Release Schedule**: Never miss an episode with our dynamic weekly release matrix.
- **Community First**: Request anime titles, share thoughts in comments, and track your watchlist.`,

  contact: `## Contact Us

Have questions, suggestions, or need assistance? We are here to help!

- **Email Support**: [zairoxmax2.0@gmail.com](mailto:zairoxmax2.0@gmail.com)
- **Telegram Channel**: [https://t.me/ZynoxAnime](https://t.me/ZynoxAnime)
- **Instagram**: [https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl](https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl)
- **Discord Community**: [https://discord.gg/zynox](https://discord.gg/zynox)

For copyright or DMCA concerns, please refer directly to our DMCA section.`,

  dmca: `## Digital Millennium Copyright Act (DMCA) Notice

**ZYNOX ANIME** complies with 17 U.S.C. * 512 and the Digital Millennium Copyright Act ("DMCA"). It is our policy to respond to any infringement notices and take appropriate actions under the DMCA and other applicable intellectual property laws.

### Non-Hosting Disclaimer:
ZYNOX ANIME does not store, host, or upload any video files, media streams, or copyrighted material to its servers. The website operates strictly as an indexing directory for links and authorized embed frames available freely across the public internet.

If your copyrighted material has been linked by our platform and you want this material removed, you must provide written communication to our designated agent with:
1. Proof of authorization from the owner of an exclusive right that is allegedly infringed.
2. Direct identification and URLs of the copyrighted work.
3. Sufficient contact information (Email, Name, Address).

Please submit all DMCA notices to: **zairoxmax2.0@gmail.com**`,

  privacy: `## Privacy Policy

Your privacy is important to us. This Privacy Policy explains our practices regarding user accounts and data.

- **Account Information**: We store basic authentication credentials via Firebase Authentication (email and display name).
- **Viewing History & Watchlist**: User watch progress and favorites are stored securely to allow sync across your devices.
- **No Third-Party Tracking**: We do not sell or monetize personal user records.`,

  terms: `## Terms of Service

By accessing or using ZYNOX ANIME, you agree to be bound by these Terms of Service.

1. **Non-Commercial Personal Use**: The site is intended solely for personal entertainment and exploration.
2. **Community Guidelines**: Users must refrain from spamming, harassment, posting illicit content, or intentionally posting spoilers in comments without spoiler tags.
3. **Third-Party Content**: We are not responsible for content hosted on third-party servers.`,

  disclaimer: `## Disclaimer

All anime titles, logos, character names, and images displayed on ZYNOX ANIME are the copyright and trademarks of their respective animation studios, manga creators, and distributors.

ZYNOX ANIME does not claim ownership over any third-party intellectual property.`,

  communityGuidelines: `## Community Guidelines

Help us maintain a fun, welcoming anime community!

1. **Respect Fellow Fans**: Debates about favorite characters are great; personal attacks and harassment are strictly prohibited.
2. **Use Spoiler Tags**: If your comment discusses plot points, character deaths, or future manga events, you MUST check the Spoiler Tag checkbox.
3. **No Malicious Links**: Links containing malware or phishing will result in immediate account termination.`,
};

export async function getCmsLegalPages(): Promise<CmsLegalPages> {
  try {
    const docRef = doc(db, CMS_CONFIG, 'legalPages');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_LEGAL_PAGES, ...(snap.data() as Partial<CmsLegalPages>) };
    }
  } catch (err) {
    console.warn('Using default CMS legal pages:', err);
  }
  return DEFAULT_LEGAL_PAGES;
}

export async function saveCmsLegalPages(legal: CmsLegalPages): Promise<void> {
  const docRef = doc(db, CMS_CONFIG, 'legalPages');
  await setDoc(docRef, sanitize(legal), { merge: true });
}

// ==========================================
// 18. ADMIN AUDIT ACTIVITY LOGS
// ==========================================
export async function logAdminActivity(
  userId: string,
  userEmail: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string
): Promise<void> {
  try {
    const logItem: CmsAdminLog = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userEmail,
      action,
      targetType,
      targetId: targetId || '',
      details: details || '',
      timestamp: serverTimestamp(),
    };
    const docRef = doc(db, CMS_LOGS, logItem.id);
    await setDoc(docRef, sanitize(logItem));
  } catch (err) {
    console.warn('Failed to record admin activity log:', err);
  }
}

export async function getAdminLogs(limitCount: number = 50): Promise<CmsAdminLog[]> {
  try {
    const snap = await getDocs(collection(db, CMS_LOGS));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ ...(d.data() as CmsAdminLog), id: d.id }));
      return list
        .sort((a, b) => {
          const tA = a.timestamp?.toMillis?.() || 0;
          const tB = b.timestamp?.toMillis?.() || 0;
          return tB - tA;
        })
        .slice(0, limitCount);
    }
  } catch (err) {
    console.warn('Failed to get admin logs:', err);
  }
  return [];
}
