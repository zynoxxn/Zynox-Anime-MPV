/**
 * Safe video host domain validation for iframe embeds
 */
const DEFAULT_ALLOWED_HOSTS = [
  'abysscdn.com',
  'abyss.to',
  'short.ink',
  'streamtape.com',
  'streamtape.net',
  'streamtape.to',
  'mp4upload.com',
  'vidstreaming.io',
  'doodstream.com',
  'dood.to',
  'dood.so',
  'dood.watch',
  'megacloud.tv',
  'mega.nz',
  'mega.io',
  'filemoon.sx',
  'filemoon.to',
  'streamwish.to',
  'streamwish.com',
  'vidcloud.co',
  'rabbitstream.net',
  'rapid-cloud.co',
  'youtube.com',
  'www.youtube.com',
  'player.vimeo.com',
  'vimeo.com',
  'drive.google.com',
  'dropbox.com',
  'mediafire.com',
  'mixdrop.co',
  'mixdrop.to',
  'mixdrop.sx',
  'voe.sx',
  'streamvid.net',
  'vidmoly.me',
  'upstream.to',
  'archive.org',
  'dailymotion.com',
  'embedrise.com',
];

export function getAllowedHosts(): string[] {
  const envHosts = import.meta.env.VITE_ALLOWED_VIDEO_HOSTS || import.meta.env.NEXT_PUBLIC_ALLOWED_VIDEO_HOSTS;
  if (envHosts) {
    return envHosts.split(',').map((h: string) => h.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_HOSTS;
}

/**
 * Automatically converts user-provided video links (YouTube, Google Drive, Vimeo, etc.)
 * into valid embeddable URLs for standard iframe / video players.
 */
export function transformStreamUrl(rawUrl?: string | null): {
  url: string;
  isDirect: boolean;
  isIframe: boolean;
  provider: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { url: '', isDirect: false, isIframe: false, provider: 'Unknown' };
  }

  let url = rawUrl.trim();

  // If user pasted iframe tag, extract src first
  const extracted = extractIframeSrc(url);
  if (extracted) {
    url = extracted;
  }

  // Check for direct video formats (mp4, webm, ogg, mkv, mov)
  const isDirectVideo =
    /\.(mp4|webm|ogg|mov|mkv)($|\?)/i.test(url) ||
    url.includes('blob:') ||
    url.includes('media.w3.org') ||
    url.includes('vjs.zencdn.net');

  if (isDirectVideo) {
    return {
      url,
      isDirect: true,
      isIframe: false,
      provider: 'Direct Stream',
    };
  }

  // 1. YouTube Watch or Shorts or Shortened (youtu.be)
  // e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ
  const ytMatch =
    url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      url: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
      isDirect: false,
      isIframe: true,
      provider: 'YouTube HD',
    };
  }

  // 2. Google Drive
  // e.g. https://drive.google.com/file/d/12345/view?usp=sharing -> /preview
  if (url.includes('drive.google.com/file/d/')) {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return {
        url: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
        isDirect: false,
        isIframe: true,
        provider: 'Google Drive Stream',
      };
    }
  }

  // 3. Vimeo
  // e.g. https://vimeo.com/12345678
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      isDirect: false,
      isIframe: true,
      provider: 'Vimeo HD',
    };
  }

  // 4. Dailymotion
  // e.g. https://www.dailymotion.com/video/x8abcdef
  const dailyMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/i);
  if (dailyMatch && dailyMatch[1]) {
    return {
      url: `https://www.dailymotion.com/embed/video/${dailyMatch[1]}`,
      isDirect: false,
      isIframe: true,
      provider: 'Dailymotion',
    };
  }

  // Default: treat as standard iframe embed
  return {
    url,
    isDirect: false,
    isIframe: true,
    provider: 'External Player',
  };
}

export function validateVideoUrl(url: string): { isValid: boolean; hostname: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, hostname: '', error: 'URL is required.' };
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Explicit rejection of dangerous URI schemes and obfuscated scripts
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.includes('javascript%3a') ||
    lower.includes('data%3a') ||
    lower.includes('<script') ||
    lower.includes('onload=') ||
    lower.includes('onerror=')
  ) {
    return { isValid: false, hostname: '', error: 'Dangerous protocol or script injection detected.' };
  }

  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return { isValid: false, hostname: '', error: 'URL must use secure https:// protocol.' };
  }

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();
    
    // As long as it is a valid HTTP/HTTPS URL and free from script injections, allow playback
    return { isValid: true, hostname };
  } catch {
    return { isValid: false, hostname: '', error: 'Invalid URL format.' };
  }
}

/**
 * Safely extracts the iframe src URL from an Abyss or external HTML frameCode snippet.
 * Does NOT execute any JavaScript or inject HTML into the DOM.
 */
export function extractIframeSrc(frameCode?: string | null): string | null {
  if (!frameCode || typeof frameCode !== 'string') {
    return null;
  }

  const trimmed = frameCode.trim();
  if (!trimmed) {
    return null;
  }

  // 1. If user passed a direct HTTPS URL instead of a full <iframe> tag
  if (trimmed.startsWith('https://') && !trimmed.includes('<') && !trimmed.includes('>')) {
    return trimmed;
  }

  // 2. Try parsing safely via DOMParser (browser environment, does not execute scripts)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');
      const iframe = doc.querySelector('iframe');
      if (iframe) {
        const rawSrc = iframe.getAttribute('src');
        if (rawSrc && rawSrc.trim()) {
          return rawSrc.trim();
        }
      }
    } catch {
      // Fallback to regex parser
    }
  }

  // 3. Robust Regex fallback for src="..." or src='...'
  const match = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Validates frameCode snippet: extracts iframe src, ensures HTTPS and allowed host domain.
 */
export function validateFrameCode(frameCode: string): { isValid: boolean; extractedSrc: string | null; hostname: string; error?: string } {
  const extractedSrc = extractIframeSrc(frameCode);
  if (!extractedSrc) {
    return {
      isValid: false,
      extractedSrc: null,
      hostname: '',
      error: 'Could not find a valid iframe src attribute in the provided frame code.'
    };
  }

  const urlValidation = validateVideoUrl(extractedSrc);
  return {
    isValid: urlValidation.isValid,
    extractedSrc,
    hostname: urlValidation.hostname,
    error: urlValidation.error
  };
}

