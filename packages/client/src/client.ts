import { ChallengeType } from "./constants.js";
import { normalizeBaseUrl, requestJson } from "./http.js";

export interface WauCaptchaClientOptions {
  /** Public site key of the API key, "pk_…". Safe to ship to browsers. */
  siteKey: string;
  /** Address of the WAU Captcha gateway, e.g. https://captcha.example.com. */
  baseUrl: string;
  /** Type asked for when newChallenge names none. Default ChallengeType.IMAGE_DISTORT. */
  challengeType?: ChallengeType | undefined;
  /** How long to wait for each reply. Default 10 000. */
  timeoutMs?: number | undefined;
  /** Fetch implementation to use instead of the global one. */
  fetch?: typeof fetch | undefined;
}

export interface Challenge {
  /** Pass it to verify together with the answer. */
  id: string;
  type: ChallengeType;
  /** A data: URL, ready for an <img> src. */
  imageUrl: string;
  /** "image/png", "image/gif" or, for slide_puzzle, "image/jpeg". */
  mimeType: string;
  /** Size to display the image at, in CSS pixels. */
  width: number;
  height: number;
  /** After this the challenge can no longer be answered. */
  expiresAt: Date;
  /**
   * slide_puzzle only: the piece to drag over the image, a PNG data: URL. It starts with its left
   * edge at x = 0 and moves horizontally; y, width and height are in CSS pixels of the image.
   */
  piece?: { imageUrl: string; y: number; width: number; height: number };
}

/**
 * A slide_puzzle drag: where the left edge of the piece ended, and the points of the drag, each
 * [ms since pointerdown, left edge of the piece, vertical offset of the pointer from where it
 * went down], in CSS pixels of the image. trackSlide records it.
 */
export type SlideDrag = { x: number; trail: Array<[number, number, number]> };

/** A correct answer carries the one-time token your backend redeems with @wau-captcha/server. */
export type VerifyResult = { success: true; token: string; expiresAt: Date } | { success: false };

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
}

/** POST /challenge/verify, as the service sends it: fields left out are false or empty. */
interface VerifyReply {
  success?: boolean;
  token?: string;
  /** Seconds until the token can no longer be redeemed. */
  expires_in?: number;
}

/** Talks to the public captcha API from a browser: fetch a challenge, submit its answer. */
export class WauCaptchaClient {
  readonly siteKey: string;
  readonly baseUrl: string;
  readonly challengeType: ChallengeType;
  readonly timeoutMs: number;
  private readonly fetch: typeof fetch;

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

  /** Fetches a new challenge. Each challenge can be answered once. */
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
    return {
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
    };
  }

  /**
   * Submits an answer. The challenge is used up either way: after a wrong answer, fetch a
   * new one. Answers are not case-sensitive.
   */
  async verify(challengeId: string, answer: string, options: { signal?: AbortSignal | undefined } = {}): Promise<VerifyResult> {
    const reply = await requestJson<VerifyReply>({
      fetch: this.fetch,
      url: `${this.baseUrl}/challenge/verify`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, answer }),
      },
      timeoutMs: this.timeoutMs,
      signal: options.signal,
    });
    if (!reply.success || !reply.token) return { success: false };
    return { success: true, token: reply.token, expiresAt: new Date(Date.now() + (reply.expires_in ?? 0) * 1000) };
  }

  /** Submits a slide_puzzle drag: verify with the drag written as the JSON the service reads. */
  verifySlide(challengeId: string, drag: SlideDrag, options: { signal?: AbortSignal | undefined } = {}): Promise<VerifyResult> {
    const answer = JSON.stringify({ x: round1(drag.x), t: drag.trail.map(([t, x, y]) => [round1(t), round1(x), round1(y)]) });
    return this.verify(challengeId, answer, options);
  }
}

/** Tenths of a pixel or millisecond are as precise as the check needs, and keep the answer short. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
