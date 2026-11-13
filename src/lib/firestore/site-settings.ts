import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { SiteConfig } from '../../types/library';
import { withTimeout } from './fast-cache';

const SETTINGS_COLLECTION = 'siteSettings';
const CONFIG_DOC = 'config';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'Zynox Anime',
  logoText: 'ZYNOX',
  tagline: 'Watch & download Indian Regional Dubbed Anime Online',
  contactEmail: 'zairoxmax2.0@gmail.com',
  telegramUrl: 'https://t.me/ZynoxAnime',
  youtubeUrl: '',
  instagramUrl: 'https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl',
  installUrl: '',
  discordUrl: 'https://discord.gg/zynox',
  disclaimerText: 'ZYNOX ANIME does not store any files on own server, We only index links from internet which are hosted on third-party services. We Index Links Just Like Google.',
  enableRequests: true,
};

let inMemorySiteConfig: SiteConfig | null = null;

export function getCachedSiteSettings(): SiteConfig {
  return inMemorySiteConfig || DEFAULT_SITE_CONFIG;
}

export function applyThemeBranding(config: Partial<SiteConfig>): void {
  if (typeof document === 'undefined') return;
  const primary = config.primaryColor || config.themeAccent || '#1E88FF';
  document.documentElement.style.setProperty('--color-primary', primary);
  document.documentElement.style.setProperty('--primary', primary);

  if (config.faviconUrl) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = config.faviconUrl;
  }
}

export async function getSiteSettings(): Promise<SiteConfig> {
  try {
    const cmsDocRef = doc(db, 'cmsConfig', 'siteSettings');
    const legacyDocRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC);

    const [cmsSnap, legacySnap] = await Promise.all([
      withTimeout(getDoc(cmsDocRef), 1200, null),
      withTimeout(getDoc(legacyDocRef), 1200, null),
    ]);

    const cmsData = cmsSnap && cmsSnap.exists() ? (cmsSnap.data() as Partial<SiteConfig>) : {};
    const legacyData = legacySnap && legacySnap.exists() ? (legacySnap.data() as Partial<SiteConfig>) : {};

    const mergedData = { ...DEFAULT_SITE_CONFIG, ...legacyData, ...cmsData };

    let siteName = mergedData.siteName || DEFAULT_SITE_CONFIG.siteName;
    if (
      siteName === 'ZYNOX ANIMES' ||
      siteName === 'Zynox Animes' ||
      siteName === 'Zynox Anime' ||
      siteName === 'zynox anime'
    ) {
      siteName = 'ZYNOX ANIME';
    }
    let logoText = mergedData.logoText || DEFAULT_SITE_CONFIG.logoText;
    if (logoText === 'zynox' || logoText === 'Zynox') {
      logoText = 'ZYNOX';
    }

    const resolvedConfig: SiteConfig = {
      ...mergedData,
      siteName,
      logoText,
    };

    inMemorySiteConfig = resolvedConfig;
    applyThemeBranding(resolvedConfig);
    return resolvedConfig;
  } catch (err) {
    console.warn('Failed to get site settings from firestore, using defaults:', err);
  }
  return inMemorySiteConfig || DEFAULT_SITE_CONFIG;
}

export async function updateSiteSettings(config: Partial<SiteConfig>): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC);
    const cmsDocRef = doc(db, 'cmsConfig', 'siteSettings');
    await Promise.all([
      setDoc(docRef, config, { merge: true }),
      setDoc(cmsDocRef, config, { merge: true }),
    ]);
    if (inMemorySiteConfig) {
      inMemorySiteConfig = { ...inMemorySiteConfig, ...config };
      applyThemeBranding(inMemorySiteConfig);
    }
  } catch (err) {
    console.error('Failed to update site settings:', err);
    throw err;
  }
}
