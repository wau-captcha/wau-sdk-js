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

/** The service address without trailing slashes, or a TypeError when it is missing. */
export function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) throw new TypeError("baseUrl is required, e.g. https://captcha.example.com");
  return baseUrl.trim().replace(/\/+$/, "");
}
