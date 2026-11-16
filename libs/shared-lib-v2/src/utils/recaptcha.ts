// Google reCAPTCHA v3 helper (CWE-307 – PS-7445).
// Only the public site key lives on the frontend; the token is verified by the backend.
// Tokens are generated fresh per call and never stored or logged.

declare global {
  interface Window {
    grecaptcha?: any;
  }
}

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3';
const RECAPTCHA_LOAD_TIMEOUT_MS = 10000;

export const RECAPTCHA_LOGIN_ACTION = 'login';
export const RECAPTCHA_SEND_OTP_ACTION = 'send_otp';
export const RECAPTCHA_SEND_MESSAGE_ACTION = 'send_message';
export const CAPTCHA_TOKEN_ERROR = 'CAPTCHA_TOKEN_GENERATION_FAILED';

let recaptchaLoader: Promise<any> | null = null;

const getSiteKey = (): string => process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY || '';

const captchaTokenError = (message: string) => {
  const error: any = new Error(message);
  error.code = CAPTCHA_TOKEN_ERROR;
  return error;
};

// Hide the floating reCAPTCHA v3 badge across the whole app. Google permits this
// as long as the reCAPTCHA attribution text is shown in the user flow.
// visibility:hidden (not display:none) keeps reCAPTCHA's risk analysis working.
const RECAPTCHA_BADGE_STYLE_ID = 'google-recaptcha-badge-hide';
const hideRecaptchaBadge = (): void => {
  if (document.getElementById(RECAPTCHA_BADGE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RECAPTCHA_BADGE_STYLE_ID;
  style.textContent =
    '.grecaptcha-badge { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
  document.head.appendChild(style);
};

const loadRecaptcha = (siteKey: string): Promise<any> => {
  hideRecaptchaBadge();
  if (window.grecaptcha?.execute) {
    return Promise.resolve(window.grecaptcha);
  }
  if (recaptchaLoader) {
    return recaptchaLoader;
  }

  recaptchaLoader = new Promise((resolve, reject) => {
    let script = document.getElementById(
      RECAPTCHA_SCRIPT_ID
    ) as HTMLScriptElement | null;

    const fail = (message: string) => {
      window.clearTimeout(timer);
      // Allow a later attempt to load the script again
      script?.remove();
      recaptchaLoader = null;
      reject(captchaTokenError(message));
    };

    const timer = window.setTimeout(
      () => fail('reCAPTCHA script load timed out'),
      RECAPTCHA_LOAD_TIMEOUT_MS
    );

    const onLoad = () => {
      if (!window.grecaptcha?.ready) {
        fail('reCAPTCHA failed to initialise');
        return;
      }
      window.grecaptcha.ready(() => {
        window.clearTimeout(timer);
        resolve(window.grecaptcha);
      });
    };

    if (!script) {
      script = document.createElement('script');
      script.id = RECAPTCHA_SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
        siteKey
      )}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', onLoad);
    script.addEventListener('error', () =>
      fail('reCAPTCHA script failed to load')
    );
  });

  return recaptchaLoader;
};

// Warm up the script on the login screen so the first login click is not delayed.
export const preloadRecaptcha = (): void => {
  const siteKey = getSiteKey();
  if (typeof window === 'undefined' || !siteKey) return;
  loadRecaptcha(siteKey).catch(() => {
    // Failure is surfaced on the actual login attempt
  });
};

// Returns a fresh reCAPTCHA v3 token. Throws (code CAPTCHA_TOKEN_ERROR) when a
// token cannot be generated, so the caller must not submit the login request.
export const getRecaptchaToken = async (
  action: string = RECAPTCHA_LOGIN_ACTION
): Promise<string> => {
  if (typeof window === 'undefined') {
    throw captchaTokenError('reCAPTCHA is only available in the browser');
  }
  const siteKey = getSiteKey();
  if (!siteKey) {
    throw captchaTokenError('reCAPTCHA site key is not configured');
  }

  let token: string | undefined;
  try {
    const grecaptcha = await loadRecaptcha(siteKey);
    token = await grecaptcha.execute(siteKey, { action });
  } catch (error: any) {
    if (error?.code === CAPTCHA_TOKEN_ERROR) throw error;
    throw captchaTokenError('reCAPTCHA token generation failed');
  }
  if (!token) {
    throw captchaTokenError('reCAPTCHA returned an empty token');
  }
  return token;
};

// True when login failed because of CAPTCHA – either the token could not be
// generated on the client or the backend rejected it.
export const isCaptchaError = (error: any): boolean => {
  if (error?.code === CAPTCHA_TOKEN_ERROR) return true;
  const data = error?.response?.data;
  if (!data) return false;
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return /captcha/i.test(text);
};
