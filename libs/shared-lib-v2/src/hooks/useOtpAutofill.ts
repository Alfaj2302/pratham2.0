import { useCallback, useEffect, useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';

/**
 * Shared input + autofill logic for the segmented OTP boxes
 * (inputs rendered with ids `otp-0`, `otp-1`, ...).
 *
 * Supports:
 *  - digit-by-digit typing with auto-advance and backspace-to-previous
 *  - pasting / native autofill (iOS `autocomplete="one-time-code"`) of the
 *    full code into any box: digits are spread across the remaining boxes
 *  - WebOTP API (Chrome on Android) as a progressive enhancement
 *
 * WebOTP SMS FORMAT REQUIREMENT:
 *   The browser only hands the code to the page when the SMS's LAST line is
 *   exactly `@<site-domain> #<otp>` (e.g. `@learner.example.org #1234`),
 *   where <site-domain> is the host the page is served from (the top-level
 *   origin when embedded). The SMS template lives in the backend and is
 *   outside the scope of this hook; without that line WebOTP silently never
 *   resolves and manual entry / paste keeps working as usual.
 */

type SetOtp = (otp: string[]) => void;

const focusBox = (index: number) => {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(`otp-${index}`) as HTMLInputElement | null;
  el?.focus();
};

const isWebOtpSupported = () =>
  typeof window !== 'undefined' &&
  'OTPCredential' in window &&
  typeof navigator !== 'undefined' &&
  !!navigator.credentials?.get;

const useOtpAutofill = (otp: string[], setOtp: SetOtp) => {
  // Refs so async WebOTP resolution always sees the latest values.
  const otpRef = useRef(otp);
  const setOtpRef = useRef(setOtp);
  otpRef.current = otp;
  setOtpRef.current = setOtp;

  const webOtpControllerRef = useRef<AbortController | null>(null);

  /**
   * Spread the digits found in `raw` across the boxes starting at
   * `startIndex`, capped at the number of remaining boxes. Focuses the last
   * box that received a digit. Returns false when `raw` had no digits.
   */
  const fillFrom = useCallback((startIndex: number, raw: string) => {
    const current = otpRef.current;
    const digits = raw
      .replace(/\D/g, '')
      .slice(0, Math.max(current.length - startIndex, 0));
    if (!digits) return false;

    const next = [...current];
    for (let i = 0; i < digits.length; i++) {
      next[startIndex + i] = digits[i];
    }
    setOtpRef.current(next);
    focusBox(startIndex + digits.length - 1);
    return true;
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      const prev = otp[index] ?? '';

      // Without maxLength, typing over a filled box yields two chars
      // (old + new). Keep only the newly typed character.
      let input = value;
      if (prev && value.length === 2 && value.includes(prev)) {
        input = value[0] === prev ? value[1] : value[0];
      }

      // Original single-character behaviour: one digit or clear.
      if (input.length <= 1) {
        if (!/^[0-9]?$/.test(input)) return;
        const newOtp = [...otp];
        newOtp[index] = input;
        setOtp(newOtp);
        if (input && index < otp.length - 1) focusBox(index + 1);
        return;
      }

      // Multi-character value: paste or native one-time-code autofill.
      fillFrom(index, input);
    },
    [otp, setOtp, fillFrom]
  );

  const handlePaste = useCallback(
    (index: number, e: ClipboardEvent<HTMLElement>) => {
      const text = e.clipboardData?.getData('text') ?? '';
      // Handle it ourselves so the pasted text isn't merged with the box's
      // existing value. Ignore pastes with no digits entirely.
      e.preventDefault();
      fillFrom(index, text);
    },
    [fillFrom]
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
        focusBox(index - 1);
      }
    },
    [otp]
  );

  const abortWebOtp = useCallback(() => {
    webOtpControllerRef.current?.abort();
    webOtpControllerRef.current = null;
  }, []);

  /** Abort any pending WebOTP request and arm a fresh one. */
  const startWebOtp = useCallback(() => {
    abortWebOtp();
    if (!isWebOtpSupported()) return;

    const controller = new AbortController();
    webOtpControllerRef.current = controller;

    // `otp` is not in the TS DOM CredentialRequestOptions typings yet.
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: controller.signal,
      } as CredentialRequestOptions)
      .then((credential) => {
        if (controller.signal.aborted) return;
        if (webOtpControllerRef.current === controller) {
          webOtpControllerRef.current = null;
        }
        const code = (credential as unknown as { code?: string } | null)
          ?.code;
        if (code) fillFrom(0, code);
      })
      .catch(() => {
        // AbortError (unmount / resend) or unsupported / denied:
        // ignore silently, manual entry still works.
      });
  }, [abortWebOtp, fillFrom]);

  useEffect(() => {
    startWebOtp();
    return abortWebOtp;
  }, [startWebOtp, abortWebOtp]);

  return { handleChange, handlePaste, handleKeyDown, restartWebOtp: startWebOtp };
};

export default useOtpAutofill;
