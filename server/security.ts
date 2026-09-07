import type { Request, Response, NextFunction } from 'express';

/**
 * Approved video embed hosts matching ZYNOX streaming requirements
 */
export const ALLOWED_VIDEO_HOSTS = [
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
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'drive.google.com',
  'docs.google.com',
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
  'media.w3.org',
  'vjs.zencdn.net',
];

/**
 * Sets comprehensive production HTTP security headers.
 * Protects against Clickjacking, MIME-sniffing, XSS, and unauthorized embeds.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Content Security Policy (CSP)
  // Allows necessary CDNs, Firebase Auth/Firestore, Google APIs, and verified video streaming providers
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https: data:",
    "frame-src 'self' https: blob: data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.google.com https://api.iconify.design",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://ai.studio https://*.google.com https://*.run.app",
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // 2. Prevent MIME Sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 3. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 4. Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // 5. Clickjacking Defense (Governed additionally by frame-ancestors in CSP)
  // For standard browsers, allow AI Studio preview iframe while preventing arbitrary embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 6. XSS Filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 7. Strict-Transport-Security (HSTS) when on HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * In-memory sliding window rate limiter
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number; // Duration of window in ms
  maxRequests: number; // Max hits per window
  message?: string;
  statusCode?: number;
}) {
  const store = new Map<string, RateLimitRecord>();
  const windowMs = options.windowMs;
  const maxRequests = options.maxRequests;
  const message = options.message || 'Too many requests. Please try again later.';
  const statusCode = options.statusCode || 429;

  // Cleanup expired entries every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(ip);
      }
    }
  }, 120000);

  return (req: Request, res: Response, next: NextFunction) => {
    // Resolve client IP safely
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(statusCode).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - record.count);
    return next();
  };
}

/**
 * Validates and sanitizes video URLs against permitted streaming domains.
 */
export function validateVideoUrlServer(url: string): { isValid: boolean; hostname: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, hostname: '', error: 'URL is required.' };
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Strict rejection of dangerous schemes
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.includes('javascript%3a') ||
    lower.includes('data%3a') ||
    lower.includes('<script')
  ) {
    return { isValid: false, hostname: '', error: 'Dangerous protocol or script injection detected.' };
  }

  if (!trimmed.startsWith('https://')) {
    return { isValid: false, hostname: '', error: 'URL must strictly use https:// protocol.' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') {
      return { isValid: false, hostname: '', error: 'URL protocol must be https:' };
    }

    const hostname = parsed.hostname.toLowerCase();
    const isMatch = ALLOWED_VIDEO_HOSTS.some((allowedHost) => {
      return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
    });

    if (!isMatch) {
      return {
        isValid: false,
        hostname,
        error: `Host "${hostname}" is not in the approved video host allowlist.`,
      };
    }

    return { isValid: true, hostname };
  } catch {
    return { isValid: false, hostname: '', error: 'Malformed or invalid URL structure.' };
  }
}

/**
 * Sanitizes arbitrary user string input to prevent stored injection or oversized memory allocations.
 */
export function sanitizeString(val: any, maxLength = 1000): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .trim()
    .slice(0, maxLength);
}
