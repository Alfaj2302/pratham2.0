/**
 * Inactivity (idle) session timeout.
 *
 * The session ends when the user has not interacted with the site (mouse, keyboard, touch,
 * scroll) for SESSION_TIMEOUT_MINUTES. Every interaction pushes the deadline forward, so an
 * active user is never logged out. Background API calls and token refreshes do NOT count as
 * activity. The last-activity time lives in localStorage, so activity in any tab keeps every
 * tab of the app alive.
 *
 * Enforced by secureAuthInterceptor (on page load, every 30s, on tab focus, on every user
 * interaction and before every token refresh).
 *
 * Only sessions started with `startSessionTimer()` are timed, so apps that never call it at
 * login are unaffected.
 */

/** Idle time allowed, in minutes: 24 hours = 24 * 60 = 1440. */
export const SESSION_TIMEOUT_MINUTES = 24 * 60;

export const SESSION_ACTIVITY_KEY = 'sessionLastActivityAt';
// Interactions fire many times a second; storage is written at most this often.
const ACTIVITY_WRITE_INTERVAL_MS = 10_000;

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getLastActivity = (): number =>
  Number(localStorage.getItem(SESSION_ACTIVITY_KEY)) || 0;

/** Call right after a successful login to (re)start the idle clock. */
export const startSessionTimer = (): void => {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
};

export const clearSessionTimer = (): void => {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_ACTIVITY_KEY);
};

/** True when a timed session exists and has been idle for SESSION_TIMEOUT_MINUTES. */
export const isSessionExpired = (): boolean => {
  if (!isBrowser()) return false;
  const lastActivity = getLastActivity();
  if (!lastActivity) return false;
  return Date.now() - lastActivity >= SESSION_TIMEOUT_MINUTES * 60_000;
};

/**
 * Marks the user as active. Callers must check `isSessionExpired()` first, otherwise the
 * first interaction after a long idle period would revive an expired session.
 */
export const touchSessionTimer = (): void => {
  if (!isBrowser()) return;
  const lastActivity = getLastActivity();
  if (!lastActivity) return; // not a timed session
  if (Date.now() - lastActivity < ACTIVITY_WRITE_INTERVAL_MS) return;
  localStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
};
