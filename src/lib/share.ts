export interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
  onSuccess?: () => void;
  onFallback?: () => void;
  onShowMessage?: (msg: string) => void;
}

/**
 * Triggers native OS System Share Menu directly.
 * If Web Share API is not supported or fails, automatically falls back to copying
 * the link to clipboard with a toast notification, or opens a fallback modal.
 */
export async function openSystemShare(options: ShareOptions): Promise<boolean> {
  const fullUrl = options.url
    ? (options.url.startsWith('http') ? options.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${options.url}`)
    : (typeof window !== 'undefined' ? window.location.href : '');

  const shareTitle = options.title || 'ZYNOX ANIME';
  const shareText = options.text || `Watch ${shareTitle} in Hindi Dub & Eng Sub on ZYNOX ANIME`;

  // 1. Try Native System Share (Mobile / Supported Desktops)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: fullUrl,
      });
      if (options.onSuccess) options.onSuccess();
      return true;
    } catch (err: any) {
      // If user dismissed the system share sheet without selecting an app, it throws AbortError
      if (err && (err.name === 'AbortError' || err.code === 20)) {
        return true;
      }
      console.warn('Navigator share failed, attempting fallback:', err);
    }
  }

  // 2. Fallback: Copy direct URL to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullUrl);
      if (options.onShowMessage) {
        options.onShowMessage('Link copied to clipboard!');
      }
      if (options.onSuccess) options.onSuccess();
      return true;
    }
  } catch (copyErr) {
    console.warn('Clipboard write fallback failed:', copyErr);
  }

  // 3. Fallback to custom modal if clipboard is blocked
  if (options.onFallback) {
    options.onFallback();
  }
  return false;
}
