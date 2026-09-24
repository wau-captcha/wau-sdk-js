import { WauCaptchaError } from "./errors.js";

/**
 * @typedef {Object} WauCaptchaServerOptions
 * @property {string} secretKey Secret key of the API key, "sk_…". Keep it on the server.
 * @property {string} baseUrl Address of the WAU Captcha gateway, e.g. https://captcha.example.com.
 * @property {number} [timeoutMs] How long to wait for a reply. Default 5 000.
 * @property {typeof fetch} [fetch] Fetch implementation to use instead of the global one.
 */

/**
 * A redeemed token proves a captcha was solved for this key. `success` is false when the
 * token is unknown, expired, already used, or was issued for another key.
 *
 * @typedef {{ success: true, challengeType: string, solvedAt: Date } | { success: false }} VerifyTokenResult
 */

/** Redeems the tokens your frontend obtained, from your backend. Requires Node.js 18 or later. */
export class WauCaptchaServer {
  /** @param {WauCaptchaServerOptions} options */
  constructor(options) {
    if (!options || typeof options.secretKey !== "string" || !options.secretKey.trim()) {
      throw new TypeError("secretKey is required: the secret key of your API key, sk_…");
    }
    if (typeof options.baseUrl !== "string" || !options.baseUrl.trim()) {
      throw new TypeError("baseUrl is required, e.g. https://captcha.example.com");
    }
    this.secretKey = options.secretKey.trim();
    this.baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 5_000;
    /** @type {typeof fetch} */
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Redeems a token once. Treat a thrown WauCaptchaError as a failed check too: it means
   * the token could not be checked, e.g. a wrong secret key (SECRET_KEY_INVALID) or no
   * reply (NETWORK_ERROR, TIMEOUT).
   *
   * @param {string} token The token the widget put in the form, or that WauCaptchaClient.verify returned.
   * @returns {Promise<VerifyTokenResult>}
   */
  async verifyToken(token) {
    if (typeof token !== "string" || !token.trim()) return { success: false };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = `${this.baseUrl}/siteverify?${new URLSearchParams({ token: token.trim() })}`;
    let response;
    try {
      response = await this.fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.secretKey}`, Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new WauCaptchaError("TIMEOUT", `no reply within ${this.timeoutMs} ms`);
      throw new WauCaptchaError("NETWORK_ERROR", `could not reach WAU Captcha at ${this.baseUrl}: ${describe(error)}`);
    } finally {
      clearTimeout(timer);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new WauCaptchaError("INVALID_RESPONSE", `WAU Captcha answered ${response.status} without JSON`, response.status);
    }
    if (!response.ok) {
      throw new WauCaptchaError(
        typeof body?.reason === "string" && body.reason ? body.reason : "UNKNOWN",
        typeof body?.message === "string" && body.message ? body.message : response.statusText,
        response.status,
        body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
      );
    }
    if (!body.success) return { success: false };
    return { success: true, challengeType: body.challenge_type, solvedAt: new Date(body.challenge_ts) };
  }
}

/** @param {unknown} error */
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
