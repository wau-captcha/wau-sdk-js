import { WauCaptchaError } from "./errors.js";

/**
 * @typedef {Object} RequestOptions
 * @property {typeof fetch} fetch
 * @property {string} url
 * @property {RequestInit} init
 * @property {number} timeoutMs
 * @property {AbortSignal} [signal]
 */

/**
 * Sends one request and returns the parsed JSON reply. Replies that are not 2xx become a
 * WauCaptchaError carrying the service's {reason, message, metadata}.
 *
 * @param {RequestOptions} options
 * @returns {Promise<Record<string, any>>}
 */
export async function requestJson({ fetch, url, init, timeoutMs, signal }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new WauCaptchaError("TIMEOUT", `no reply within ${timeoutMs} ms`)), timeoutMs);
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  let response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.reason instanceof WauCaptchaError) throw controller.signal.reason;
    if (signal?.aborted) throw error;
    throw new WauCaptchaError("NETWORK_ERROR", `could not reach WAU Captcha at ${url}: ${describe(error)}`);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
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
  return body;
}

/** @param {unknown} error */
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The service address without trailing slashes, or a TypeError when it is missing.
 *
 * @param {string | undefined} baseUrl
 */
export function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) throw new TypeError("baseUrl is required, e.g. https://captcha.example.com");
  return baseUrl.trim().replace(/\/+$/, "");
}
