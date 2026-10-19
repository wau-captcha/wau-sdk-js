import { normalizeBaseUrl } from "./base-url.js";
import { BehaviorVerdict, type ChallengeType, ErrorCode } from "./constants.js";
import { WauCaptchaError } from "./errors.js";

export interface WauCaptchaServerOptions {
  /** Secret key of the API key, "sk_…". Keep it on the server. */
  secretKey: string;
  /** Address of the WAU Captcha API, e.g. https://api.waucaptcha.com. https only, but for localhost. */
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
export type VerifyTokenResult =
  | {
      success: true;
      challengeType: ChallengeType;
      solvedAt: Date;
      behavior: BehaviorResult;
      /**
       * Host name of the website the challenge was solved on, from the Origin of the browser's
       * requests: compare it with your own domains, with hostnameMatches. A script outside a
       * browser can forge it, so it stops other websites from using your key, not bots. Empty
       * when the challenge was asked for without an origin, or from a service before site binding.
       */
      hostname: string;
    }
  | { success: false };

/** How the person who solved the challenge behaved, as the service judged it. */
export type BehaviorResult = {
  verdict: BehaviorVerdict;
  /** From 0 (scripted) to 1 (human-like); null when not measured. */
  score: number | null;
  /** Short codes of what lowered the score, e.g. "webdriver". */
  reasons: string[];
};

/** POST /siteverify, as the service sends it: `success` is left out when false. */
interface SiteVerifyReply {
  success?: boolean;
  /** Set when success is true. */
  challenge_type: ChallengeType;
  /** When the challenge was solved, as an RFC 3339 timestamp. Set when success is true. */
  challenge_ts: string;
  /** Left out by services that do not check behaviour yet. */
  behavior?: { verdict?: string; score?: number | null; reasons?: string[] | null } | null;
  /** Left out by services before site binding. */
  hostname?: string;
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
    this.secretKey = options.secretKey.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
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
    let response: Response;
    try {
      // The token travels in the body, never in the URL, so it stays out of access logs.
      response = await this.fetch(`${this.baseUrl}/siteverify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.secretKey}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
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
    return {
      success: true,
      challengeType: reply.challenge_type,
      solvedAt: new Date(reply.challenge_ts),
      behavior: toBehavior(reply.behavior),
      hostname: typeof reply.hostname === "string" ? reply.hostname : "",
    };
  }
}

/**
 * Turns the service's error body into a WauCaptchaError, filling in what it left out. The seconds
 * a RATE_LIMITED reply asks to wait come in metadata.retry_after, or else in Retry-After.
 */
function errorFromReply(body: unknown, response: Response): WauCaptchaError {
  const reply: ErrorReply = body && typeof body === "object" ? body : {};
  const metadata = reply.metadata && typeof reply.metadata === "object" ? { ...(reply.metadata as Record<string, string>) } : {};
  const retryAfter = response.headers.get("Retry-After");
  if (!metadata.retry_after && retryAfter) metadata.retry_after = retryAfter;
  return new WauCaptchaError(
    typeof reply.reason === "string" && reply.reason ? reply.reason : ErrorCode.UNKNOWN,
    typeof reply.message === "string" && reply.message ? reply.message : response.statusText,
    response.status,
    metadata,
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A service that does not check behaviour yet, or a verdict this SDK does not know, reads as not measured. */
function toBehavior(raw: SiteVerifyReply["behavior"]): BehaviorResult {
  const verdicts: readonly string[] = Object.values(BehaviorVerdict);
  if (!raw?.verdict || !verdicts.includes(raw.verdict)) return { verdict: BehaviorVerdict.NOT_MEASURED, score: null, reasons: [] };
  return { verdict: raw.verdict as BehaviorVerdict, score: typeof raw.score === "number" ? raw.score : null, reasons: raw.reasons ?? [] };
}
