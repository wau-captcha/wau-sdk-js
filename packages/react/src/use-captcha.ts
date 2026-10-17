import {
  type AutoProbe,
  type Behavior,
  type Challenge,
  ChallengeType,
  ErrorCode,
  type JumpClick,
  type RotateRound,
  type SlideDrag,
  type VerifyResult,
  WauCaptchaClient,
  type WauCaptchaClientOptions,
  WauCaptchaError,
} from "@waucaptcha-sdk/client";
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
  /** auto_check did not let the visitor through: a challenge of its fallback type took its place. */
  FALLBACK: "fallback",
} as const;

export type CaptchaNotice = (typeof CaptchaNotice)[keyof typeof CaptchaNotice];

export type CaptchaOptions = Omit<WauCaptchaClientOptions, "fetch"> & {
  /** auto_check only: the type it falls back to, as WauCaptchaProps.fallbackChallengeType. */
  fallbackChallengeType?: ChallengeType | undefined;
  /**
   * Load a challenge right away and again when the token expires, instead of waiting for load().
   * auto_check is never eager: the panel loads it once it is in view, and after its token expired
   * on the visitor's next action.
   */
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
  /**
   * auto_check only: the type it fell back to, which every challenge is of until the token of the
   * visitor expires; null while auto_check runs.
   */
  fallback: ChallengeType | null;
  /** Loads a new challenge, keeping `notice` on screen. */
  load: (notice?: CaptchaNotice | null) => Promise<void>;
  /** Submits an answer, with how the person behaved while the challenge was on screen. */
  verify: (challengeId: string, answer: string, behavior?: Behavior) => Promise<void>;
  /** Submits the drag of a slide_puzzle challenge, like verify. */
  verifySlide: (challengeId: string, drag: SlideDrag, behavior?: Behavior) => Promise<void>;
  /** Submits the clicks of an animal_jump challenge, one per round, like verify. */
  verifyJump: (challengeId: string, clicks: JumpClick[], behavior?: Behavior) => Promise<void>;
  /** Submits the presses of an object_rotate challenge, one round each, like verify. */
  verifyRotate: (challengeId: string, rounds: RotateRound[], behavior?: Behavior) => Promise<void>;
  /**
   * Submits what probeBrowser found for an auto_check challenge, like verify. When the check does
   * not let the visitor through, a challenge of the challenge's fallbackType is loaded instead.
   */
  verifyAuto: (challenge: Challenge, probe: AutoProbe, behavior?: Behavior) => Promise<void>;
  /** Resolves once the proof of work of a challenge is done, as WauCaptchaClient.workDone. */
  workDone: (challengeId: string) => Promise<void>;
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
export function useCaptcha({ siteKey, baseUrl, challengeType, fallbackChallengeType, timeoutMs, eager, ...callbacks }: CaptchaOptions): Captcha {
  const client = useMemo(
    () => new WauCaptchaClient({ siteKey, baseUrl, challengeType, timeoutMs }),
    [siteKey, baseUrl, challengeType, timeoutMs],
  );
  const [state, setState] = useState(INITIAL_STATE);
  // The type auto_check fell back to: the ref for the next load, the state for the panel.
  const [fallback, setFallback] = useState<ChallengeType | null>(null);
  const fallbackRef = useRef<ChallengeType | null>(null);
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
        const challenge = await client.newChallenge({
          challengeType: fallbackRef.current ?? undefined,
          fallbackType: fallbackChallengeType ?? ChallengeType.SLIDE_PUZZLE,
          signal,
        });
        if (!signal.aborted) setState({ ...INITIAL_STATE, status: CaptchaStatus.READY, notice, challenge });
      } catch (error) {
        if (!signal.aborted) fail(error);
      }
    },
    [client, fallbackChallengeType, startRequest, fail],
  );

  /** auto_check did not let the visitor through: every challenge is of `type` from now on, until the token expires. */
  const fallBack = useCallback(
    (type: ChallengeType | "" | undefined) => {
      if (!type || type === ChallengeType.AUTO_CHECK) {
        return fail(new WauCaptchaError(ErrorCode.CHALLENGE_TYPE_NOT_ALLOWED, "the site key allows no challenge type for auto_check to fall back to"));
      }
      fallbackRef.current = type;
      setFallback(type);
      void load(CaptchaNotice.FALLBACK);
    },
    [fail, load],
  );

  /**
   * Sends the answer `send` makes: the text typed, the drag of the slider, the clicks or the presses
   * of the rounds, or what auto_check found, `auto` being its challenge.
   */
  const submit = useCallback(
    async (send: (signal: AbortSignal) => Promise<VerifyResult>, auto?: Challenge) => {
      const signal = startRequest();
      setState((current) => ({ ...current, status: CaptchaStatus.CHECKING }));
      try {
        const result = await send(signal);
        if (signal.aborted) return;
        // A challenge can be answered once, so a wrong answer needs a new one; auto_check falls back instead.
        if (!result.success) return void (auto ? fallBack(auto.fallbackType) : load(CaptchaNotice.WRONG_ANSWER));
        setState({ ...INITIAL_STATE, status: CaptchaStatus.VERIFIED, token: result.token, tokenExpiresAt: result.expiresAt });
        callbacksRef.current.onSuccess?.(result.token);
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof WauCaptchaError && error.code === ErrorCode.CHALLENGE_NOT_FOUND) {
          // The challenge expired while it was on screen: show a fresh one. auto_check, as in a tab put
          // to sleep, checks again on the visitor's next action.
          if (auto) return setState({ ...INITIAL_STATE, notice: CaptchaNotice.EXPIRED });
          return void load(CaptchaNotice.EXPIRED);
        }
        fail(error);
      }
    },
    [startRequest, load, fallBack, fail],
  );

  const verify = useCallback(
    (challengeId: string, answer: string, behavior?: Behavior) => submit((signal) => client.verify(challengeId, answer, { signal, behavior })),
    [client, submit],
  );

  const verifySlide = useCallback(
    (challengeId: string, drag: SlideDrag, behavior?: Behavior) =>
      submit((signal) => client.verifySlide(challengeId, drag, { signal, behavior })),
    [client, submit],
  );

  const verifyJump = useCallback(
    (challengeId: string, clicks: JumpClick[], behavior?: Behavior) =>
      submit((signal) => client.verifyJump(challengeId, clicks, { signal, behavior })),
    [client, submit],
  );

  const verifyRotate = useCallback(
    (challengeId: string, rounds: RotateRound[], behavior?: Behavior) =>
      submit((signal) => client.verifyRotate(challengeId, rounds, { signal, behavior })),
    [client, submit],
  );

  const verifyAuto = useCallback(
    (challenge: Challenge, probe: AutoProbe, behavior?: Behavior) =>
      submit((signal) => client.verifyAuto(challenge.id, probe, { signal, behavior }), challenge),
    [client, submit],
  );

  const workDone = useCallback((challengeId: string) => client.workDone(challengeId), [client]);

  useEffect(() => {
    if (eager) void load();
    return () => requestRef.current?.abort();
  }, [eager, load]);

  useEffect(() => {
    if (!state.tokenExpiresAt) return;
    const timer = setTimeout(() => {
      callbacksRef.current.onExpire?.();
      // auto_check checks again before anything else: its fallback ends with the token.
      fallbackRef.current = null;
      setFallback(null);
      if (eager) void load(CaptchaNotice.EXPIRED);
      else setState({ ...INITIAL_STATE, notice: CaptchaNotice.EXPIRED });
    }, Math.max(0, state.tokenExpiresAt.getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [state.tokenExpiresAt, eager, load]);

  return { ...state, fallback, load, verify, verifySlide, verifyJump, verifyRotate, verifyAuto, workDone };
}
