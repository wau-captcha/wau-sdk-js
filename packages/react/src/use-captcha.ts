import { type Challenge, ErrorCode, WauCaptchaClient, type WauCaptchaClientOptions, WauCaptchaError } from "@wau-captcha/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** What a captcha is doing. Only READY takes an answer. */
export const CaptchaStatus = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  CHECKING: "checking",
  VERIFIED: "verified",
  FAILED: "failed",
} as const;

export type CaptchaStatus = (typeof CaptchaStatus)[keyof typeof CaptchaStatus];

/** Why a captcha started over; it stays on screen until the next answer is right. */
export const CaptchaNotice = {
  WRONG_ANSWER: "wrong_answer",
  EXPIRED: "expired",
} as const;

export type CaptchaNotice = (typeof CaptchaNotice)[keyof typeof CaptchaNotice];

export type CaptchaOptions = Omit<WauCaptchaClientOptions, "fetch"> & {
  /** Load a challenge right away and again when the token expires, instead of waiting for load(). */
  eager: boolean;
  onSuccess?: ((token: string) => void) | undefined;
  onExpire?: (() => void) | undefined;
  onError?: ((error: WauCaptchaError) => void) | undefined;
};

export type CaptchaState = {
  status: CaptchaStatus;
  notice: CaptchaNotice | null;
  challenge: Challenge | null;
  /** The token of a correct answer while it is valid. */
  token: string | null;
  tokenExpiresAt: Date | null;
  error: WauCaptchaError | null;
};

export type Captcha = CaptchaState & {
  /** Loads a new challenge, keeping `notice` on screen. */
  load: (notice?: CaptchaNotice | null) => Promise<void>;
  verify: (challengeId: string, answer: string) => Promise<void>;
};

const INITIAL_STATE: CaptchaState = {
  status: CaptchaStatus.IDLE,
  notice: null,
  challenge: null,
  token: null,
  tokenExpiresAt: null,
  error: null,
};

/** The state of one captcha: its challenge, the answer being checked and the token it earned. */
export function useCaptcha({ siteKey, baseUrl, challengeType, timeoutMs, eager, ...callbacks }: CaptchaOptions): Captcha {
  const client = useMemo(
    () => new WauCaptchaClient({ siteKey, baseUrl, challengeType, timeoutMs }),
    [siteKey, baseUrl, challengeType, timeoutMs],
  );
  const [state, setState] = useState(INITIAL_STATE);
  const requestRef = useRef<AbortController | null>(null);
  // The latest callbacks, so passing new functions on every render reloads nothing.
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  /** Cancels the request in flight, if any, and returns the signal of a new one. */
  const startRequest = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = new AbortController();
    return requestRef.current.signal;
  }, []);

  const fail = useCallback((error: unknown) => {
    const captchaError = error instanceof WauCaptchaError ? error : new WauCaptchaError(ErrorCode.UNKNOWN, String(error));
    setState({ ...INITIAL_STATE, status: CaptchaStatus.FAILED, error: captchaError });
    callbacksRef.current.onError?.(captchaError);
  }, []);

  const load = useCallback(
    async (notice: CaptchaNotice | null = null) => {
      const signal = startRequest();
      setState({ ...INITIAL_STATE, status: CaptchaStatus.LOADING, notice });
      try {
        const challenge = await client.newChallenge({ signal });
        if (!signal.aborted) setState({ ...INITIAL_STATE, status: CaptchaStatus.READY, notice, challenge });
      } catch (error) {
        if (!signal.aborted) fail(error);
      }
    },
    [client, startRequest, fail],
  );

  const verify = useCallback(
    async (challengeId: string, answer: string) => {
      const signal = startRequest();
      setState((current) => ({ ...current, status: CaptchaStatus.CHECKING }));
      try {
        const result = await client.verify(challengeId, answer, { signal });
        if (signal.aborted) return;
        // A challenge can be answered once, so a wrong answer needs a new one.
        if (!result.success) return void load(CaptchaNotice.WRONG_ANSWER);
        setState({ ...INITIAL_STATE, status: CaptchaStatus.VERIFIED, token: result.token, tokenExpiresAt: result.expiresAt });
        callbacksRef.current.onSuccess?.(result.token);
      } catch (error) {
        if (signal.aborted) return;
        // The challenge expired while it was on screen: show a fresh one.
        if (error instanceof WauCaptchaError && error.code === ErrorCode.CHALLENGE_NOT_FOUND) return void load(CaptchaNotice.EXPIRED);
        fail(error);
      }
    },
    [client, startRequest, load, fail],
  );

  useEffect(() => {
    if (eager) void load();
    return () => requestRef.current?.abort();
  }, [eager, load]);

  useEffect(() => {
    if (!state.tokenExpiresAt) return;
    const timer = setTimeout(() => {
      callbacksRef.current.onExpire?.();
      if (eager) void load(CaptchaNotice.EXPIRED);
      else setState({ ...INITIAL_STATE, notice: CaptchaNotice.EXPIRED });
    }, Math.max(0, state.tokenExpiresAt.getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [state.tokenExpiresAt, eager, load]);

  return { ...state, load, verify };
}
