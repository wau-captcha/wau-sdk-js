import { normalizeBaseUrl, requestJson } from "./http.js";

/**
 * "image_distort" is distorted text in a PNG; "motion_noise" hides the text in a short
 * animated GIF of moving dots. A key's plan decides which ones it may request.
 *
 * @typedef {"image_distort" | "motion_noise"} ChallengeType
 */

/**
 * @typedef {Object} WauCaptchaClientOptions
 * @property {string} siteKey Public site key of the API key, "pk_…". Safe to ship to browsers.
 * @property {string} baseUrl Address of the WAU Captcha gateway, e.g. https://captcha.example.com.
 * @property {ChallengeType} [challengeType] Type asked for when newChallenge names none. Default "image_distort".
 * @property {number} [timeoutMs] How long to wait for each reply. Default 10 000.
 * @property {typeof fetch} [fetch] Fetch implementation to use instead of the global one.
 */

/**
 * @typedef {Object} Challenge
 * @property {string} id Pass it to verify together with the answer.
 * @property {string} type
 * @property {string} imageUrl A data: URL, ready for an <img> src.
 * @property {string} mimeType "image/png" or "image/gif".
 * @property {number} width Size to display the image at, in CSS pixels.
 * @property {number} height
 * @property {Date} expiresAt After this the challenge can no longer be answered.
 */

/**
 * A correct answer carries the one-time token your backend redeems with @wau-captcha/server.
 *
 * @typedef {{ success: true, token: string, expiresAt: Date } | { success: false }} VerifyResult
 */

/** Talks to the public captcha API from a browser: fetch a challenge, submit its answer. */
export class WauCaptchaClient {
  /** @param {WauCaptchaClientOptions} options */
  constructor(options) {
    if (!options || typeof options.siteKey !== "string" || !options.siteKey.trim()) {
      throw new TypeError("siteKey is required: the public key of your API key, pk_…");
    }
    this.siteKey = options.siteKey.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    /** @type {ChallengeType} */
    this.challengeType = options.challengeType ?? "image_distort";
    this.timeoutMs = options.timeoutMs ?? 10_000;
    /** @type {typeof fetch} */
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Fetches a new challenge. Each challenge can be answered once.
   *
   * @param {{ challengeType?: ChallengeType, signal?: AbortSignal }} [options]
   * @returns {Promise<Challenge>}
   */
  async newChallenge(options = {}) {
    const query = new URLSearchParams({
      site_key: this.siteKey,
      challenge_type: options.challengeType ?? this.challengeType,
    });
    const reply = await requestJson({
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
    };
  }

  /**
   * Submits an answer. The challenge is used up either way: after a wrong answer, fetch a
   * new one. Answers are not case-sensitive.
   *
   * @param {string} challengeId
   * @param {string} answer
   * @param {{ signal?: AbortSignal }} [options]
   * @returns {Promise<VerifyResult>}
   */
  async verify(challengeId, answer, options = {}) {
    const reply = await requestJson({
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
    return { success: true, token: reply.token, expiresAt: new Date(Date.now() + reply.expires_in * 1000) };
  }
}
