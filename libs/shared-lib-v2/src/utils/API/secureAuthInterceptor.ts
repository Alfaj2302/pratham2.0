/**
 * Global access-token renewal for every HTTP client in the app.
 *
 * A request counts as authenticated when it carries `Authorization: Bearer <token>`,
 * `X-auth-token: <token>`, or is a same-origin call made while the `authToken` cookie is set
 * (the workspace/players `/api/proxy` routes read the token from that cookie).
 *
 * Coverage:
 *  - axios (default export + every `axios.create()` instance): on 401, refresh and replay.
 *  - window.fetch: on 401, refresh and replay.
 *  - XMLHttpRequest (jQuery / Angular based editors and web components): on 401 with an
 *    expired token, refresh so the next call succeeds. XHR cannot be replayed transparently.
 *  - Same-origin iframes (e.g. the Sunbird generic editor) get the fetch/XHR hooks too.
 *  - Proactive refresh: every 30s the access token's expiry is checked locally (no API call).
 *    Only when it expires within 1 hour (or half its lifetime, if shorter) is the refresh API
 *    called, so clients we cannot replay never see an expired token.
 *
 * Refresh = decrypt `secure_rt` → call the refresh API → store `token`, `secure_rt` and the
 * `authToken` cookie. If the refresh token is missing/expired the user goes to `<origin>/login`.
 *
 * Idle timeout: a session started with `startSessionTimer()` at login ends once the user has
 * not interacted with the site for SESSION_TIMEOUT_MINUTES (see sessionTimeout.ts). User
 * interactions in the page and its same-origin iframes keep it alive; API calls and token
 * refreshes do not. Checked on page load, every 30s, on tab focus, on every interaction and
 * before every refresh.
 *
 * How axios is reached: each instance reads its interceptors via
 * `InterceptorManager.prototype.forEach` on every request. We wrap that shared prototype
 * method to yield one extra handler; `runWhen: () => false` keeps it out of the request chain
 * (runWhen is only evaluated for request interceptors), so it runs as the first response
 * interceptor, ahead of each app's own interceptors.
 *
 * Install once per app by importing this module on the client (see SecureAuthGuard for
 * App Router layouts).
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  clearSecureRefreshToken,
  getSecureRefreshToken,
  setSecureRefreshToken,
} from '../secureTokenStorage';
import {
  clearSessionTimer,
  isSessionExpired,
  touchSessionTimer,
} from '../sessionTimeout';

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type HeaderGetter = (name: string) => string | null | undefined;

const REFRESH_URL = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/user/auth/refresh`;
// Auth endpoints answer 401 for bad credentials/tokens; refreshing would never help them.
const AUTH_ENDPOINT_PATTERN =
  /\/(login|auth\/login|auth\/refresh|auth\/logout|sso\/authenticate)(\/|\?|$)/;
const PATCH_FLAG = '__secureAuthInterceptorInstalled';
const REFRESH_LOCK = 'secure_rt_refresh';
// Some services (course planner, observations, surveys) send the token as `X-auth-token`.
const AUTH_TOKEN_HEADER = 'X-auth-token';
// Read by the Next.js `/api/proxy` routes that sit behind the Sunbird editors/players.
const AUTH_COOKIE = 'authToken';
const PROACTIVE_CHECK_MS = 30_000;
const PROACTIVE_MARGIN_MS = 60 * 60_000; // 1 hour
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'];
const ACTIVITY_THROTTLE_MS = 1_000;

let refreshPromise: Promise<string | null> | null = null;
let redirecting = false;
let lastProactiveToken: string | null = null;
let lastActivityHandledAt = 0;

// ---------------------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------------------

const readCookie = (doc: Document, name: string): string | undefined =>
  doc.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/** Keeps the proxy cookie in step with localStorage, but only where the app uses it. */
const syncAuthCookie = (accessToken: string) => {
  if (readCookie(document, AUTH_COOKIE) === undefined) return;
  document.cookie = `${AUTH_COOKIE}=${accessToken}; path=/; secure; SameSite=Strict`;
};

const getJwtTimes = (token: string): { iat?: number; exp?: number } | null => {
  try {
    const payload = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
  } catch {
    return null;
  }
};

/** True when the token is expired/about to expire, or is not a readable JWT. */
const isExpiring = (token: string, marginMs = 0): boolean => {
  const { exp } = getJwtTimes(token) || {};
  return !exp || exp * 1000 - Date.now() <= marginMs;
};

/**
 * Resolves the access token an outgoing request is authenticated with, or null for requests
 * this module should leave alone (public calls, third-party hosts, auth endpoints).
 */
const getRequestToken = (
  win: Window,
  url: string,
  getHeader: HeaderGetter
): string | null => {
  if (AUTH_ENDPOINT_PATTERN.test(url)) return null;

  const bearer = getHeader('Authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.slice('Bearer '.length);

  const headerToken = getHeader(AUTH_TOKEN_HEADER);
  if (headerToken) return headerToken;

  try {
    if (new URL(url, win.location.href).origin !== win.location.origin) return null;
    return readCookie(win.document, AUTH_COOKIE) || null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------------------

const callRefreshApi = async (): Promise<string | null> => {
  const refreshToken = await getSecureRefreshToken();
  if (!refreshToken) return null;

  try {
    const tenantId = localStorage.getItem('tenantId');
    // Default axios instance: only this module's handler is attached to it, and the refresh
    // URL is excluded by AUTH_ENDPOINT_PATTERN, so this cannot recurse.
    const response = await axios.post(
      REFRESH_URL,
      { refresh_token: refreshToken },
      { headers: tenantId ? { tenantid: tenantId } : undefined }
    );
    const accessToken = response?.data?.result?.access_token;
    const newRefreshToken = response?.data?.result?.refresh_token;
    if (!accessToken) return null;

    localStorage.setItem('token', accessToken);
    syncAuthCookie(accessToken);
    await setSecureRefreshToken(newRefreshToken || refreshToken);
    // Keep the Android bridge copy in sync, as the per-app interceptors did.
    if (newRefreshToken && localStorage.getItem('refreshTokenForAndroid')) {
      localStorage.setItem('refreshTokenForAndroid', newRefreshToken);
    }
    return accessToken;
  } catch (error: any) {
    // Log status only: the axios error's config.data contains the refresh token.
    console.error('Token refresh failed:', error?.response?.status ?? error?.message);
    return null;
  }
};

/**
 * Returns a valid access token, refreshing at most once across concurrent requests in this
 * tab and (via the Web Locks API where available) across tabs, so a rotated refresh token
 * is never replayed.
 */
const getFreshAccessToken = (failedToken: string): Promise<string | null> => {
  if (!refreshPromise) {
    const run = async () => {
      if (isSessionExpired()) return null;
      const current = localStorage.getItem('token');
      if (current && current !== failedToken) {
        syncAuthCookie(current);
        return current;
      }
      return callRefreshApi();
    };
    const locks = (navigator as any)?.locks;
    refreshPromise = (locks ? locks.request(REFRESH_LOCK, run) : run()).finally(() => {
      refreshPromise = null;
    }) as Promise<string | null>;
  }
  return refreshPromise as Promise<string | null>;
};

const redirectToLogin = () => {
  clearSecureRefreshToken();
  clearSessionTimer();
  localStorage.removeItem('token');
  if (redirecting || window.location.pathname === '/login') return;
  redirecting = true;
  window.location.href = `${window.location.origin}/login`;
};

/** Refreshes for `failedToken`, redirecting to login when that is impossible. */
const renewOrLogout = async (failedToken: string): Promise<string | null> => {
  const accessToken = await getFreshAccessToken(failedToken);
  if (!accessToken) redirectToLogin();
  return accessToken;
};

/** Ends the session once SESSION_TIMEOUT_MINUTES have passed since login. */
const logoutIfSessionExpired = (): boolean => {
  if (!isSessionExpired()) return false;
  redirectToLogin();
  return true;
};

/** User interaction: log out if the idle limit was already hit, otherwise extend the session. */
const onUserActivity = () => {
  const now = Date.now();
  if (now - lastActivityHandledAt < ACTIVITY_THROTTLE_MS) return;
  lastActivityHandledAt = now;
  if (logoutIfSessionExpired()) return;
  touchSessionTimer();
};

/**
 * Local expiry check (no network) that renews the token once it expires within
 * PROACTIVE_MARGIN_MS. The window is capped at half the token lifetime: for tokens living
 * <= 1 hour every fresh token would otherwise count as "expiring" and refresh on every tick.
 */
const refreshIfExpiringSoon = () => {
  if (logoutIfSessionExpired()) return;
  if (document.visibilityState !== 'visible') return;
  const token = localStorage.getItem('token');
  if (!token || token === lastProactiveToken) return;

  const { iat, exp } = getJwtTimes(token) || {};
  if (!exp) return;
  const lifetimeMs = iat ? (exp - iat) * 1000 : PROACTIVE_MARGIN_MS * 2;
  if (!isExpiring(token, Math.min(PROACTIVE_MARGIN_MS, lifetimeMs / 2))) return;

  // One attempt per token: a failure is left for the 401 handlers to turn into a logout.
  lastProactiveToken = token;
  getFreshAccessToken(token);
};

// ---------------------------------------------------------------------------------------
// axios
// ---------------------------------------------------------------------------------------

const getAxiosHeader = (config: RetryableConfig, name: string): string | undefined => {
  const headers: any = config.headers;
  if (!headers) return undefined;
  const value =
    typeof headers.get === 'function'
      ? headers.get(name)
      : headers[name] ?? headers[name.toLowerCase()];
  return value ? String(value) : undefined;
};

const setAxiosHeader = (config: RetryableConfig, name: string, value: string) => {
  const headers: any = config.headers;
  if (typeof headers?.set === 'function') {
    headers.set(name, value);
  } else {
    config.headers = { ...(headers || {}), [name]: value } as any;
  }
};

const is401 = (error: AxiosError<any>) =>
  error?.response?.status === 401 || error?.response?.data?.responseCode === 401;

const onAxiosResponseError = async (error: AxiosError<any>) => {
  const config = error?.config as RetryableConfig | undefined;
  const requestToken = config
    ? getRequestToken(window, axios.getUri(config), (name) => getAxiosHeader(config, name))
    : null;

  if (!config || config._retry || !is401(error) || !requestToken) {
    return Promise.reject(error);
  }

  // Claim the request so the legacy per-app 401 handlers (which check `_retry`) stand down.
  config._retry = true;

  const accessToken = await renewOrLogout(requestToken);
  if (!accessToken) return Promise.reject(error);

  if (getAxiosHeader(config, 'Authorization')?.startsWith('Bearer ')) {
    setAxiosHeader(config, 'Authorization', `Bearer ${accessToken}`);
  }
  if (getAxiosHeader(config, AUTH_TOKEN_HEADER)) {
    setAxiosHeader(config, AUTH_TOKEN_HEADER, accessToken);
  }
  // Cookie-authenticated calls pick up the refreshed `authToken` cookie automatically.
  return axios.request(config);
};

const installAxios = () => {
  const managerProto: any = Object.getPrototypeOf(axios.interceptors.response);
  if (!managerProto || managerProto[PATCH_FLAG]) return;

  const globalHandler = {
    fulfilled: undefined,
    rejected: onAxiosResponseError,
    synchronous: false,
    runWhen: () => false,
  };
  const originalForEach = managerProto.forEach;
  managerProto.forEach = function (fn: (handler: unknown) => void) {
    fn(globalHandler);
    return originalForEach.call(this, fn);
  };
  managerProto[PATCH_FLAG] = true;
};

// ---------------------------------------------------------------------------------------
// fetch / XMLHttpRequest (per window, so same-origin iframes are covered too)
// ---------------------------------------------------------------------------------------

const isReplayableBody = (body: unknown) =>
  body == null || !(typeof ReadableStream !== 'undefined' && body instanceof ReadableStream);

const patchFetch = (win: any) => {
  const originalFetch = win.fetch;
  if (typeof originalFetch !== 'function' || originalFetch[PATCH_FLAG]) return;

  const patchedFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const isRequest = typeof win.Request !== 'undefined' && input instanceof win.Request;
    const headers = new win.Headers(init?.headers ?? (isRequest ? (input as Request).headers : undefined));
    const url = isRequest ? (input as Request).url : String(input);
    const requestToken = getRequestToken(win, url, (name) => headers.get(name));
    // Requests are single-use; keep a copy for the replay before the first send.
    const replayInput = isRequest && requestToken ? (input as Request).clone() : input;

    const response: Response = await originalFetch.call(win, input, init);
    if (response.status !== 401 || !requestToken) return response;

    const accessToken = await renewOrLogout(requestToken);
    if (!accessToken || !isReplayableBody(init?.body)) return response;

    if (headers.get('Authorization')?.startsWith('Bearer ')) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (headers.get(AUTH_TOKEN_HEADER)) headers.set(AUTH_TOKEN_HEADER, accessToken);
    return originalFetch.call(win, replayInput, { ...init, headers });
  };
  (patchedFetch as any)[PATCH_FLAG] = true;
  win.fetch = patchedFetch;
};

const patchXhr = (win: any) => {
  const proto = win.XMLHttpRequest?.prototype;
  if (!proto || proto[PATCH_FLAG]) return;

  const { open, setRequestHeader, send } = proto;
  proto.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    this.__secureAuth = { url: String(url), headers: {} as Record<string, string> };
    return open.call(this, method, url, ...rest);
  };
  proto.setRequestHeader = function (name: string, value: string) {
    if (this.__secureAuth) this.__secureAuth.headers[name.toLowerCase()] = value;
    return setRequestHeader.call(this, name, value);
  };
  proto.send = function (body?: unknown) {
    const meta = this.__secureAuth;
    const requestToken =
      meta && getRequestToken(win, meta.url, (name) => meta.headers[name.toLowerCase()]);
    if (requestToken) {
      this.addEventListener('loadend', () => {
        // Only an expired token is worth renewing here. This also keeps axios requests
        // (which use XHR) from triggering a second refresh after their own replay.
        if (this.status === 401 && isExpiring(requestToken)) renewOrLogout(requestToken);
      });
    }
    return send.call(this, body);
  };
  proto[PATCH_FLAG] = true;
};

const installInWindow = (win: any) => {
  try {
    if (!win || win[PATCH_FLAG]) return;
    patchFetch(win);
    patchXhr(win);
    ACTIVITY_EVENTS.forEach((type) =>
      win.addEventListener(type, onUserActivity, { capture: true, passive: true })
    );
    win[PATCH_FLAG] = true;
  } catch {
    // Cross-origin frame: not ours to patch.
    return;
  }

  const watchFrame = (frame: HTMLIFrameElement) => {
    // Each navigation inside the frame creates a fresh window, so re-patch on every load.
    frame.addEventListener('load', () => installInWindow(frame.contentWindow));
    installInWindow(frame.contentWindow);
  };
  win.document.querySelectorAll('iframe').forEach(watchFrame);
  new win.MutationObserver((mutations: MutationRecord[]) =>
    mutations.forEach((mutation) =>
      mutation.addedNodes.forEach((node: any) => {
        if (node.tagName === 'IFRAME') watchFrame(node);
        node.querySelectorAll?.('iframe').forEach(watchFrame);
      })
    )
  ).observe(win.document.documentElement, { childList: true, subtree: true });
};

// ---------------------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------------------

export const installSecureAuthInterceptor = () => {
  if (typeof window === 'undefined' || (window as any).__secureAuthInstalled) return;
  (window as any).__secureAuthInstalled = true;

  installAxios();
  installInWindow(window);

  refreshIfExpiringSoon();
  window.setInterval(refreshIfExpiringSoon, PROACTIVE_CHECK_MS);
  document.addEventListener('visibilitychange', refreshIfExpiringSoon);
};

installSecureAuthInterceptor();
