import { ChallengeType } from "./constants.js";
import { WauCaptchaError } from "./errors.js";
import { normalizeBaseUrl, requestJson } from "./http.js";
import { decodeBase64, solvePow } from "./pow.js";
import type { Challenge, JumpClick, RotateRound, SlideDrag, VerifyOptions, VerifyResult } from "./types.js";

export type { Behavior, Challenge, JumpClick, RotatePress, RotateRound, SlideDrag, VerifyOptions, VerifyResult } from "./types.js";

export interface WauCaptchaClientOptions {
  /** Public site key of the API key, "pk_…". Safe to ship to browsers. */
  siteKey: string;
  /** Address of the WAU Captcha API, e.g. https://api.waucaptcha.com. https only, but for localhost. */
  baseUrl: string;
  /** Type asked for when newChallenge names none. Default ChallengeType.IMAGE_DISTORT. */
  challengeType?: ChallengeType | undefined;
  /** How long to wait for each reply. Default 10 000. */
  timeoutMs?: number | undefined;
  /** Fetch implementation to use instead of the global one. */
  fetch?: typeof fetch | undefined;
}

/** GET /challenge/new, as the service sends it. */
interface ChallengeReply {
  challenge_id: string;
  challenge_type: ChallengeType;
  /** The image, base64-encoded. */
  image: string;
  mime_type: string;
  width: number;
  height: number;
  /** Seconds until the challenge can no longer be answered. */
  expires_in: number;
  /** slide_puzzle only: the piece, a base64-encoded PNG, and where it sits on the image. */
  piece_image?: string;
  piece_y?: number;
  piece_width?: number;
  piece_height?: number;
  /** Round 2, image being round 1: animal_jump's GIF, object_rotate's strip; base64-encoded. */
  second_image?: string;
  /** object_rotate only: image and second_image are each this many frames side by side. */
  frame_count?: number;
  /** The proof of work: 16 bytes, base64-encoded, and the zero bits asked for; 0 asks for none. */
  pow_salt?: string;
  pow_difficulty?: number;
}

/** POST /challenge/verify, as the service sends it: fields left out are false or empty. */
interface VerifyReply {
  success?: boolean;
  token?: string;
  /** Seconds until the token can no longer be redeemed. */
  expires_in?: number;
}

/** Challenges whose proof of work is kept while they wait for an answer; older ones are dropped. */
const MAX_PENDING_WORK = 4;

/** Talks to the public captcha API from a browser: fetch a challenge, submit its answer. */
export class WauCaptchaClient {
  readonly siteKey: string;
  readonly baseUrl: string;
  readonly challengeType: ChallengeType;
  readonly timeoutMs: number;
  private readonly fetch: typeof fetch;
  /** The proof of work of each challenge fetched and not answered yet, being solved or solved. */
  private readonly work = new Map<string, { nonce: Promise<string | undefined>; stop: AbortController }>();

  constructor(options: WauCaptchaClientOptions) {
    if (!options || typeof options.siteKey !== "string" || !options.siteKey.trim()) {
      throw new TypeError("siteKey is required: the public key of your API key, pk_…");
    }
    this.siteKey = options.siteKey.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.challengeType = options.challengeType ?? ChallengeType.IMAGE_DISTORT;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Fetches a new challenge and starts its proof of work in the background, in slices that keep
   * the page responsive. Each challenge can be answered once. Fetch one when it is about to be
   * shown, not ahead of time: challenges fetched and never answered count against the key.
   */
  async newChallenge(options: { challengeType?: ChallengeType | undefined; signal?: AbortSignal | undefined } = {}): Promise<Challenge> {
    const query = new URLSearchParams({
      site_key: this.siteKey,
      challenge_type: options.challengeType ?? this.challengeType,
    });
    const reply = await requestJson<ChallengeReply>({
      fetch: this.fetch,
      url: `${this.baseUrl}/challenge/new?${query}`,
      init: { method: "GET" },
      timeoutMs: this.timeoutMs,
      signal: options.signal,
    });
    const challenge: Challenge = {
      id: reply.challenge_id,
      type: reply.challenge_type,
      imageUrl: `data:${reply.mime_type};base64,${reply.image}`,
      mimeType: reply.mime_type,
      width: reply.width,
      height: reply.height,
      expiresAt: new Date(Date.now() + reply.expires_in * 1000),
      ...(reply.piece_image
        ? {
            piece: {
              imageUrl: `data:image/png;base64,${reply.piece_image}`,
              y: reply.piece_y ?? 0,
              width: reply.piece_width ?? 0,
              height: reply.piece_height ?? 0,
            },
          }
        : {}),
      ...(reply.second_image ? { secondImage: `data:${reply.mime_type};base64,${reply.second_image}` } : {}),
      ...(reply.frame_count ? { frameCount: reply.frame_count } : {}),
    };
    const salt = reply.pow_salt ? decodeBase64(reply.pow_salt) : undefined;
    if (salt && reply.pow_difficulty && reply.pow_difficulty > 0) {
      challenge.pow = { salt, difficulty: reply.pow_difficulty };
      this.startWork(challenge.id, salt, reply.pow_difficulty);
    }
    return challenge;
  }

  /**
   * Submits an answer, with the site key and the proof of work of the challenge. The challenge is
   * used up either way: after a wrong answer, fetch a new one. Answers are not case-sensitive.
   * With `behavior` the service also checks how the person behaved, and refuses an answer a
   * script clearly gave; a key that requires behaviour refuses an answer without it
   * (ErrorCode.BEHAVIOR_REQUIRED).
   */
  async verify(challengeId: string, answer: string, options: VerifyOptions = {}): Promise<VerifyResult> {
    const powNonce = options.powNonce ?? (await this.work.get(challengeId)?.nonce);
    const body = {
      challenge_id: challengeId,
      answer,
      site_key: this.siteKey,
      ...(options.behavior ? { behavior: options.behavior } : {}),
      ...(powNonce !== undefined ? { pow_nonce: powNonce } : {}),
    };
    let reply: VerifyReply;
    try {
      reply = await requestJson<VerifyReply>({
        fetch: this.fetch,
        url: `${this.baseUrl}/challenge/verify`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        timeoutMs: this.timeoutMs,
        signal: options.signal,
      });
    } catch (error) {
      // Without a reply the challenge may still be open, and a retry needs its proof of work.
      if (!(error instanceof WauCaptchaError) || error.status !== 0) this.stopWork(challengeId);
      throw error;
    }
    this.stopWork(challengeId);
    if (!reply.success || !reply.token) return { success: false };
    return { success: true, token: reply.token, expiresAt: new Date(Date.now() + (reply.expires_in ?? 0) * 1000) };
  }

  /** Submits a slide_puzzle drag: verify with the drag written as the JSON the service reads. */
  verifySlide(challengeId: string, drag: SlideDrag, options: VerifyOptions = {}): Promise<VerifyResult> {
    const answer = JSON.stringify({ x: round1(drag.x), t: drag.trail.map(([t, x, y]) => [round1(t), round1(x), round1(y)]) });
    return this.verify(challengeId, answer, options);
  }

  /**
   * Submits the clicks of an animal_jump challenge, one per round in order: verify with the clicks
   * written as the JSON the service reads.
   */
  verifyJump(challengeId: string, clicks: JumpClick[], options: VerifyOptions = {}): Promise<VerifyResult> {
    const answer = JSON.stringify({ c: clicks.map(({ x, y, ms, replays }) => ({ x: round1(x), y: round1(y), ms: round1(ms), p: replays })) });
    return this.verify(challengeId, answer, options);
  }

  /**
   * Submits the presses of an object_rotate challenge, one round each in order: verify with the
   * rounds written as the JSON the service reads.
   */
  verifyRotate(challengeId: string, rounds: RotateRound[], options: VerifyOptions = {}): Promise<VerifyResult> {
    const answer = JSON.stringify({
      r: rounds.map(({ frame, presses, doneMs }) => ({
        f: frame,
        s: presses.map(({ ms, direction }) => [Math.round(ms), direction]),
        done: Math.round(doneMs),
      })),
    });
    return this.verify(challengeId, answer, options);
  }

  private startWork(challengeId: string, salt: Uint8Array, difficulty: number) {
    const stop = new AbortController();
    this.work.set(challengeId, { nonce: solvePow(salt, challengeId, difficulty, { signal: stop.signal }), stop });
    // A challenge fetched again and again without an answer must not keep its work forever.
    for (const id of this.work.keys()) {
      if (this.work.size <= MAX_PENDING_WORK) break;
      this.stopWork(id);
    }
  }

  private stopWork(challengeId: string) {
    this.work.get(challengeId)?.stop.abort();
    this.work.delete(challengeId);
  }
}

/** Tenths of a pixel or millisecond are as precise as the check needs, and keep the answer short. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
