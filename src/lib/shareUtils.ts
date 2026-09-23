export interface SocialShareLinks {
  fullUrl: string;
  shareText: string;
  whatsapp: string;
  twitter: string;
  telegram: string;
}

/**
 * Generates pre-filled, shareable social media URLs for WhatsApp, Twitter, and Telegram.
 */
export function getSocialShareLinks(title: string, pathOrUrl: string): SocialShareLinks {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://zynoxanime.com';

  const fullUrl = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
    ? pathOrUrl
    : `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

  const cleanTitle = title.trim() || 'Anime';
  const shareText = `🔥 Watch "${cleanTitle}" in HD with Multi-Audio (Hindi Dubbed & Subbed) on ZYNOX ANIME! High-speed streaming & fast downloads:`;
  const twitterText = `Watch "${cleanTitle}" in Multi-Audio (Hindi Dub / Sub) on ZYNOX ANIME! 🎬✨`;

  const whatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`;
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(fullUrl)}&hashtags=${encodeURIComponent('Anime,ZynoxAnime,HindiDub')}`;
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`;

  return {
    fullUrl,
    shareText,
    whatsapp,
    twitter,
    telegram,
  };
}
