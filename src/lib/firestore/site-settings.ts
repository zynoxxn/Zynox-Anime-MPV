import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { SiteConfig } from '../../types/library';

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

export async function getSiteSettings(): Promise<SiteConfig> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<SiteConfig>;
      let siteName = data.siteName || DEFAULT_SITE_CONFIG.siteName;
      if (
        siteName === 'ZYNOX ANIMES' ||
        siteName === 'Zynox Animes' ||
        siteName === 'Zynox Anime' ||
        siteName === 'zynox anime'
      ) {
        siteName = 'ZYNOX ANIME';
      }
      let logoText = data.logoText || DEFAULT_SITE_CONFIG.logoText;
      if (logoText === 'zynox' || logoText === 'Zynox') {
        logoText = 'ZYNOX';
      }
      const youtubeUrl = data.youtubeUrl || '';
      const instagramUrl = data.instagramUrl || 'https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl';
      const telegramUrl = data.telegramUrl || 'https://t.me/ZynoxAnime';

      return {
        ...DEFAULT_SITE_CONFIG,
        ...data,
        siteName,
        logoText,
        youtubeUrl,
        instagramUrl,
        telegramUrl,
      };
    }
  } catch (err) {
    console.warn('Failed to get site settings from firestore, using defaults:', err);
  }
  return DEFAULT_SITE_CONFIG;
}

export async function updateSiteSettings(config: Partial<SiteConfig>): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, CONFIG_DOC);
    await setDoc(docRef, config, { merge: true });
  } catch (err) {
    console.error('Failed to update site settings:', err);
    throw err;
  }
}
