import type { Anime } from '../types/anime';
import type { Episode } from '../types/episode';
import type { CmsSeoSettings } from '../types/cms';

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string | string[];
  ogImage?: string;
  ogType?: 'website' | 'video.movie' | 'video.tv_show' | 'video.episode' | 'article';
  canonicalUrl?: string;
  schemaJson?: Record<string, any>;
  googleSiteVerification?: string;
}

export interface AnimeSeoOptions {
  episodeNumber?: number;
  episodeTitle?: string;
  isDownload?: boolean;
  siteName?: string;
  seoSettings?: Partial<CmsSeoSettings>;
}

const DEFAULT_SITE_NAME = 'ZYNOX ANIME';
const DEFAULT_SITE_URL =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://ais-pre-dtndjeqftnisrncgqh376s-1073184695775.asia-southeast1.run.app';

/**
 * Generate targeted Google Search keywords and tags for an anime
 */
export function generateAnimeGoogleTags(
  anime: Anime,
  options?: { episodeNumber?: number; isDownload?: boolean }
): string[] {
  const tagsSet = new Set<string>();
  const title = (anime.title || '').trim();
  if (!title) return [];

  const lowerTitle = title.toLowerCase();
  const hasHindi =
    (anime.audioLanguage && anime.audioLanguage.toLowerCase().includes('hindi')) ||
    (anime.audioTags && anime.audioTags.some((t) => t.toLowerCase().includes('hindi'))) ||
    true; // By default popular Indian searchers look for Hindi

  // Core title variants
  tagsSet.add(title);
  tagsSet.add(`${title} anime`);

  // Hindi Dub search terms
  if (hasHindi) {
    tagsSet.add(`${title} hindi dub`);
    tagsSet.add(`${title} in hindi`);
    tagsSet.add(`${title} hindi dubbed download`);
    tagsSet.add(`${title} all episodes in hindi`);
    tagsSet.add(`${title} full anime in hindi`);
  }

  // English Sub / Multi Audio
  tagsSet.add(`${title} english sub`);
  tagsSet.add(`${title} multi audio`);
  tagsSet.add(`${title} subbed`);

  // Resolution & Quality tags
  tagsSet.add(`${title} 1080p download`);
  tagsSet.add(`${title} 720p download`);
  tagsSet.add(`${title} full hd`);

  // Download-specific keywords
  if (options?.isDownload) {
    tagsSet.add(`${title} download`);
    tagsSet.add(`${title} all episodes download`);
    tagsSet.add(`${title} full season zip download`);
    tagsSet.add(`${title} batch zip download`);
    tagsSet.add(`${title} google drive download`);
    tagsSet.add(`${title} mega nz download`);
    tagsSet.add(`${title} fast direct download`);
    tagsSet.add(`download ${lowerTitle} hindi dub 720p 1080p`);
  } else {
    tagsSet.add(`${title} watch online`);
    tagsSet.add(`watch ${lowerTitle} free in hd`);
    tagsSet.add(`${title} stream online`);
  }

  // Episode-specific tags
  if (options?.episodeNumber) {
    const ep = options.episodeNumber;
    tagsSet.add(`${title} episode ${ep}`);
    tagsSet.add(`${title} ep ${ep}`);
    tagsSet.add(`${title} episode ${ep} hindi dub`);
    tagsSet.add(`${title} episode ${ep} download 720p 1080p`);
    tagsSet.add(`watch ${lowerTitle} episode ${ep}`);
  }

  // Alternate & Japanese titles
  if (anime.japaneseTitle) {
    tagsSet.add(anime.japaneseTitle);
  }
  if (anime.altTitles && Array.isArray(anime.altTitles)) {
    anime.altTitles.forEach((t) => {
      if (t && t.trim()) tagsSet.add(t.trim());
    });
  }

  // Genres
  if (anime.genres && Array.isArray(anime.genres)) {
    anime.genres.forEach((g) => {
      tagsSet.add(`${g} anime`);
    });
  }

  return Array.from(tagsSet);
}

/**
 * Generate complete SEO Metadata and JSON-LD for an anime page, download page, or episode page
 */
export function generateAnimeSeoMetadata(
  anime: Anime,
  options: AnimeSeoOptions = {}
): SeoMetadata {
  const siteName = options.siteName || DEFAULT_SITE_NAME;
  const baseUrl = DEFAULT_SITE_URL;
  const animeTitle = (anime.title || 'Anime').trim();
  const slug = anime.slug || anime.id || 'anime';

  // Check language badges
  const isHindi =
    anime.audioLanguage?.toLowerCase().includes('hindi') ||
    anime.audioTags?.some((t) => t.toLowerCase().includes('hindi')) ||
    true;

  const langBadge = isHindi ? '[Hindi Dub & Eng Sub]' : '[English Sub]';

  let title = '';
  let description = '';
  let canonicalUrl = `${baseUrl}/anime/${slug}`;
  let ogType: SeoMetadata['ogType'] = anime.type === 'Movie' ? 'video.movie' : 'video.tv_show';

  const rawSynopsis = (anime.description || '')
    .replace(/<[^>]*>?/gm, '')
    .trim()
    .slice(0, 140);

  if (options.isDownload) {
    // Dedicated high-CTR title for download pages
    title = `Download ${animeTitle} ${langBadge} All Episodes 720p 1080p HD Batch Zip — ${siteName}`;
    description = `Download ${animeTitle} all episodes in high speed 720p HD and 1080p Full HD with Hindi Dub & English Sub. Direct Mega & Google Drive batch zip available on ${siteName}. ${rawSynopsis ? `${rawSynopsis}...` : ''}`;
    canonicalUrl = `${baseUrl}/anime/${slug}/download`;
  } else if (options.episodeNumber) {
    const epNum = options.episodeNumber;
    title = `Watch ${animeTitle} Episode ${epNum} ${langBadge} 1080p HD Online Free — ${siteName}`;
    description = `Stream ${animeTitle} Episode ${epNum} online in high definition 1080p & 720p with Hindi Dubbed and English Subtitles. Zero buffering on ${siteName}.`;
    canonicalUrl = `${baseUrl}/anime/${slug}/episode/${epNum}`;
    ogType = 'video.episode';
  } else {
    // Main Anime Detail page
    title = `Watch ${animeTitle} in Hindi Dub & English Sub (All Episodes HD) — ${siteName}`;
    description = `Watch ${animeTitle} ${langBadge} online in 1080p Full HD on ${siteName}. ${rawSynopsis ? `${rawSynopsis}...` : 'Stream all episodes and download batch zip with zero lag.'}`;
    canonicalUrl = `${baseUrl}/anime/${slug}`;
  }

  // Generate Google search tags
  const keywordsList = generateAnimeGoogleTags(anime, {
    episodeNumber: options.episodeNumber,
    isDownload: options.isDownload,
  });

  // Build Schema.org JSON-LD
  const schemaJson: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': options.episodeNumber
      ? 'TVEpisode'
      : anime.type === 'Movie'
      ? 'Movie'
      : 'TVSeries',
    name: options.episodeNumber
      ? `${animeTitle} - Episode ${options.episodeNumber}`
      : animeTitle,
    alternateName: anime.japaneseTitle || anime.altTitles?.[0] || undefined,
    description,
    image: anime.poster || anime.banner || options.seoSettings?.defaultOgImage,
    genre: anime.genres || ['Animation', 'Action', 'Anime'],
    inLanguage: isHindi ? ['hi', 'en', 'ja'] : ['en', 'ja'],
    potentialAction: {
      '@type': 'WatchAction',
      target: canonicalUrl,
    },
  };

  if (anime.rating) {
    schemaJson.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: anime.rating,
      bestRating: 10,
      ratingCount: anime.viewsCount ? Math.max(anime.viewsCount, 25) : 85,
    };
  }

  if (options.episodeNumber) {
    schemaJson.episodeNumber = options.episodeNumber;
    schemaJson.partOfSeries = {
      '@type': 'TVSeries',
      name: animeTitle,
      url: `${baseUrl}/anime/${slug}`,
    };
  }

  return {
    title,
    description,
    keywords: keywordsList.join(', '),
    ogImage: anime.poster || anime.banner || options.seoSettings?.defaultOgImage,
    ogType,
    canonicalUrl,
    schemaJson,
  };
}

/**
 * Apply SEO metadata directly to HTML head elements in real-time
 */
export function updateDocumentSeo(metadata: SeoMetadata): void {
  if (typeof document === 'undefined') return;

  // 1. Document Title
  if (metadata.title) {
    document.title = metadata.title;
  }

  // 2. Helper to set or create a <meta> tag
  const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
    if (!content) return;
    let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // 3. Helper to set or create a <link> tag
  const setLinkTag = (rel: string, href: string) => {
    if (!href) return;
    let element = document.querySelector(`link[rel="${rel}"]`);
    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', rel);
      document.head.appendChild(element);
    }
    element.setAttribute('href', href);
  };

  // Standard SEO Meta Tags
  if (metadata.description) {
    setMetaTag('name', 'description', metadata.description);
  }

  if (metadata.keywords) {
    const kwString = Array.isArray(metadata.keywords)
      ? metadata.keywords.join(', ')
      : metadata.keywords;
    setMetaTag('name', 'keywords', kwString);
  }

  // Canonical URL
  if (metadata.canonicalUrl) {
    setLinkTag('canonical', metadata.canonicalUrl);
  }

  // Open Graph Tags
  if (metadata.title) {
    setMetaTag('property', 'og:title', metadata.title);
    setMetaTag('name', 'twitter:title', metadata.title);
  }

  if (metadata.description) {
    setMetaTag('property', 'og:description', metadata.description);
    setMetaTag('name', 'twitter:description', metadata.description);
  }

  if (metadata.ogImage) {
    setMetaTag('property', 'og:image', metadata.ogImage);
    setMetaTag('name', 'twitter:image', metadata.ogImage);
  }

  if (metadata.ogType) {
    setMetaTag('property', 'og:type', metadata.ogType);
  }

  if (metadata.canonicalUrl) {
    setMetaTag('property', 'og:url', metadata.canonicalUrl);
  }

  setMetaTag('property', 'og:site_name', DEFAULT_SITE_NAME);
  setMetaTag('name', 'twitter:card', 'summary_large_image');

  // Google Search Console verification if present
  if (metadata.googleSiteVerification) {
    setMetaTag('name', 'google-site-verification', metadata.googleSiteVerification);
  }

  // Schema.org JSON-LD Structured Data
  if (metadata.schemaJson) {
    let scriptEl = document.getElementById('jsonld-seo') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'jsonld-seo';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(metadata.schemaJson, null, 2);
  }
}

/**
 * Generate Google Search Console compatible Sitemap XML string
 */
export function generateSitemapXml(
  animes: Anime[],
  episodes: Episode[] = [],
  baseUrl: string = DEFAULT_SITE_URL
): string {
  const currentDate = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/browse`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/schedule`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/top-airing`, priority: '0.8', changefreq: 'daily' },
  ];

  const animeUrls = animes.map((a) => {
    const slug = a.slug || a.id;
    return [
      {
        loc: `${baseUrl}/anime/${slug}`,
        priority: '0.9',
        changefreq: 'weekly',
        lastmod: currentDate,
      },
      {
        loc: `${baseUrl}/anime/${slug}/download`,
        priority: '0.85',
        changefreq: 'weekly',
        lastmod: currentDate,
      },
    ];
  }).flat();

  // Selected top episodes
  const episodeUrls = episodes.slice(0, 300).map((ep) => {
    const matchedAnime = animes.find((a) => a.id === ep.animeId || a.slug === ep.animeId);
    const slug = matchedAnime ? (matchedAnime.slug || matchedAnime.id) : ep.animeId;
    return {
      loc: `${baseUrl}/anime/${slug}/episode/${ep.episodeNumber}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: currentDate,
    };
  });

  const allEntries = [...staticUrls, ...animeUrls, ...episodeUrls];

  const xmlItems = allEntries
    .map(
      (item) => `  <url>
    <loc>${item.loc}</loc>
    <lastmod>${(item as any).lastmod || currentDate}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;
}

/**
 * Generate robots.txt
 */
export function generateRobotsTxt(baseUrl: string = DEFAULT_SITE_URL): string {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*

Sitemap: ${baseUrl}/sitemap.xml
`;
}
