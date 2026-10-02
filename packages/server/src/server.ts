import { type ChallengeType, ErrorCode } from "./constants.js";
import { WauCaptchaError } from "./errors.js";

export interface WauCaptchaServerOptions {
  /** Secret key of the API key, "sk_…". Keep it on the server. */
  secretKey: string;
  /** Address of the WAU Captcha API, e.g. https://captcha.example.com. */
  baseUrl: string;
  /** How long to wait for a reply. Default 5 000. */
  timeoutMs?: number | undefined;
  /** Fetch implementation to use instead of the global one. */
  fetch?: typeof fetch | undefined;
}

/**
 * A redeemed token proves a captcha was solved for this key. `success` is false when the
 * token is unknown, expired, already used, or was issued for another key.
 */
export type VerifyTokenResult = { success: true; challengeType: ChallengeType; solvedAt: Date } | { success: false };

/** POST /siteverify, as the service sends it: `success` is left out when false. */
interface SiteVerifyReply {
  success?: boolean;
  /** Set when success is true. */
  challenge_type: ChallengeType;
  /** When the challenge was solved, as an RFC 3339 timestamp. Set when success is true. */
  challenge_ts: string;
}

/** The error body the service sends with every reply that is not 2xx. */
interface ErrorReply {
  reason?: unknown;
  message?: unknown;
  metadata?: unknown;
}

/** Redeems the tokens your frontend obtained, from your backend. Requires Node.js 18 or later. */
export class WauCaptchaServer {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  private readonly secretKey: string;
  private readonly fetch: typeof fetch;

  constructor(options: WauCaptchaServerOptions) {
    if (!options || typeof options.secretKey !== "string" || !options.secretKey.trim()) {
      throw new TypeError("secretKey is required: the secret key of your API key, sk_…");
    }
    if (typeof options.baseUrl !== "string" || !options.baseUrl.trim()) {
      throw new TypeError("baseUrl is required, e.g. https://captcha.example.com");
    }
    this.secretKey = options.secretKey.trim();
    this.baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Redeems a token once. Treat a thrown WauCaptchaError as a failed check too: it means
   * the token could not be checked, e.g. a wrong secret key (ErrorCode.SECRET_KEY_INVALID) or
   * no reply (ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT).
   *
   * @param token The token the widget put in the form, or that WauCaptchaClient.verify returned.
   */
  async verifyToken(token: string): Promise<VerifyTokenResult> {
    if (typeof token !== "string" || !token.trim()) return { success: false };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const url = `${this.baseUrl}/siteverify?${new URLSearchParams({ token: token.trim() })}`;
    let response: Response;
    try {
      response = await this.fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.secretKey}`, Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new WauCaptchaError(ErrorCode.TIMEOUT, `no reply within ${this.timeoutMs} ms`);
      throw new WauCaptchaError(ErrorCode.NETWORK_ERROR, `could not reach WAU Captcha at ${this.baseUrl}: ${describeError(error)}`);
    } finally {
      clearTimeout(timer);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new WauCaptchaError(ErrorCode.INVALID_RESPONSE, `WAU Captcha answered ${response.status} without JSON`, response.status);
    }
    if (!response.ok) throw errorFromReply(body, response);
    const reply = body as SiteVerifyReply;
    if (!reply.success) return { success: false };
    return { success: true, challengeType: reply.challenge_type, solvedAt: new Date(reply.challenge_ts) };
  }
}

/** Turns the service's error body into a WauCaptchaError, filling in what it left out. */
function errorFromReply(body: unknown, response: Response): WauCaptchaError {
  const reply: ErrorReply = body && typeof body === "object" ? body : {};
  return new WauCaptchaError(
    typeof reply.reason === "string" && reply.reason ? reply.reason : ErrorCode.UNKNOWN,
    typeof reply.message === "string" && reply.message ? reply.message : response.statusText,
    response.status,
    reply.metadata && typeof reply.metadata === "object" ? (reply.metadata as Record<string, string>) : {},
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
