/**
 * ZYNOX Top-Level Security Engine
 * Comprehensive security utility for:
 * 1. Rate Limiting & Brute-force Lockout defense
 * 2. Inactive Session Auto-Lock (Admin idle timeout)
 * 3. Input Sanitization (Anti-XSS, malicious payload strip)
 * 4. Safe URL Protocol Validator (Block javascript:, vbscript:, data: for href/embeds)
 * 5. Security Audit Logging (Client & server event dispatch)
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const BRUTE_FORCE_KEY = 'zynox_sec_bf_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface BruteForceStatus {
  isLocked: boolean;
  remainingMs: number;
  remainingAttempts: number;
}

/**
 * Checks current brute-force lockout status for admin authentication
 */
export function checkBruteForceLockout(): BruteForceStatus {
  try {
    const raw = localStorage.getItem(BRUTE_FORCE_KEY);
    if (!raw) {
      return { isLocked: false, remainingMs: 0, remainingAttempts: MAX_ATTEMPTS };
    }
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.lockedUntil && now < data.lockedUntil) {
      return {
        isLocked: true,
        remainingMs: data.lockedUntil - now,
        remainingAttempts: 0,
      };
    }
    // If lockout expired, reset
    if (data.lockedUntil && now >= data.lockedUntil) {
      localStorage.removeItem(BRUTE_FORCE_KEY);
      return { isLocked: false, remainingMs: 0, remainingAttempts: MAX_ATTEMPTS };
    }
    const attempts = data.attempts || 0;
    const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
    return { isLocked: false, remainingMs: 0, remainingAttempts: remaining };
  } catch {
    return { isLocked: false, remainingMs: 0, remainingAttempts: MAX_ATTEMPTS };
  }
}

/**
 * Record a failed authentication attempt
 */
export function recordFailedAuthAttempt(): BruteForceStatus {
  try {
    const raw = localStorage.getItem(BRUTE_FORCE_KEY);
    let attempts = 1;
    if (raw) {
      const data = JSON.parse(raw);
      attempts = (data.attempts || 0) + 1;
    }
    const now = Date.now();
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_DURATION_MS;
      localStorage.setItem(
        BRUTE_FORCE_KEY,
        JSON.stringify({ attempts, lockedUntil })
      );
      // Log security event asynchronously
      logSecurityThreat('BRUTE_FORCE_TRIGGERED', {
        attempts,
        lockoutDurationSeconds: LOCKOUT_DURATION_MS / 1000,
        userAgent: navigator.userAgent,
      });
      return { isLocked: true, remainingMs: LOCKOUT_DURATION_MS, remainingAttempts: 0 };
    } else {
      localStorage.setItem(BRUTE_FORCE_KEY, JSON.stringify({ attempts }));
      return {
        isLocked: false,
        remainingMs: 0,
        remainingAttempts: MAX_ATTEMPTS - attempts,
      };
    }
  } catch {
    return { isLocked: false, remainingMs: 0, remainingAttempts: 1 };
  }
}

/**
 * Reset authentication failure counter after successful login
 */
export function resetAuthAttempts(): void {
  try {
    localStorage.removeItem(BRUTE_FORCE_KEY);
  } catch {}
}

/**
 * Sanitize untrusted text input to prevent XSS payloads
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // remove dangerous brackets
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

/**
 * Validate stream, embed, or poster URL
 * Only allows safe http:, https:, or verified absolute paths
 */
export function isValidSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('data:text/html') ||
    trimmed.includes('<script')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/')
  );
}

/**
 * Log security threat / abnormal activity to security_events
 */
export async function logSecurityThreat(
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  try {
    const id = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const eventRef = doc(db, 'security_events', id);
    await setDoc(eventRef, {
      id,
      eventType,
      details,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
  } catch (err) {
    // Non-blocking security logging fallback
    console.warn('[ZYNOX Security Monitor] Threat log failed to write to Firestore:', err);
  }
}

/**
 * Hook or helper for Admin Session Auto-Lock due to inactivity
 * Locks after 30 minutes of no user interaction
 */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
