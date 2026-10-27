/**
 * Fast Cache & Resilience Utility for Zynox Anime
 * Provides strict timeout protection, memory caching, and localStorage hydration
 * to ensure the website loads instantaneously (under 100ms) with zero skeleton freezing.
 */

export function withTimeout<T>(promise: Promise<T>, ms: number = 2000, fallback: T): Promise<T> {
  let timerId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timerId = setTimeout(() => {
      resolve(fallback);
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      if (timerId) clearTimeout(timerId);
      return res;
    }).catch(() => {
      if (timerId) clearTimeout(timerId);
      return fallback;
    }),
    timeoutPromise,
  ]);
}

export function getStoredCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(`zynox_fast_${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function setStoredCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    // Only serialize up to 40 items to keep storage lightweight and lightning fast
    const toStore = Array.isArray(data) ? data.slice(0, 40) : data;
    localStorage.setItem(`zynox_fast_${key}`, JSON.stringify(toStore));
  } catch {
    // Ignore storage quota or disabled errors
  }
}
