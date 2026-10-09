import { ErrorCode } from "./constants.js";
import { WauCaptchaError } from "./errors.js";

export interface RequestOptions {
  fetch: typeof fetch;
  url: string;
  init: RequestInit;
  timeoutMs: number;
  signal?: AbortSignal | undefined;
}

/** The error body the service sends with every reply that is not 2xx. */
interface ErrorReply {
  reason?: unknown;
  message?: unknown;
  metadata?: unknown;
}

/**
 * Sends one request and returns the parsed JSON reply, typed as `T`. Replies that are not
 * 2xx become a WauCaptchaError carrying the service's {reason, message, metadata}.
 */
export async function requestJson<T>({ fetch, url, init, timeoutMs, signal }: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new WauCaptchaError(ErrorCode.TIMEOUT, `no reply within ${timeoutMs} ms`)), timeoutMs);
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.reason instanceof WauCaptchaError) throw controller.signal.reason;
    if (signal?.aborted) throw error;
    throw new WauCaptchaError(ErrorCode.NETWORK_ERROR, `could not reach WAU Captcha at ${url}: ${describeError(error)}`);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WauCaptchaError(ErrorCode.INVALID_RESPONSE, `WAU Captcha answered ${response.status} without JSON`, response.status);
  }
  if (!response.ok) throw errorFromReply(body, response);
  return body as T;
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

/** Hosts that may be called over plain http, for local development. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/**
 * The service address without trailing slashes. It must be https, so tokens and secret keys are
 * never sent in clear text; http is only allowed for localhost, 127.0.0.1 and [::1]. Anything else
 * is a TypeError. @wau-captcha/server keeps a copy of this rule.
 */
export function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) throw new TypeError("baseUrl is required, e.g. https://api.waucaptcha.com");
  const address = baseUrl.trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new TypeError(`baseUrl is not a URL: ${address}`);
  }
  const local = url.protocol === "http:" && LOCAL_HOSTS.includes(url.hostname);
  if (url.protocol !== "https:" && !local) {
    throw new TypeError(
      "baseUrl must start with https:// so the token and secret key are never sent in clear text " +
        "(http:// only for localhost, 127.0.0.1 or [::1])",
    );
  }
  return address;
}
