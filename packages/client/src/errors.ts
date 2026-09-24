/**
 * A call to WAU Captcha that failed. `code` is the reason the service gave, such as
 * "SITE_KEY_INVALID" or "ORIGIN_NOT_ALLOWED", or one of "NETWORK_ERROR", "TIMEOUT" and
 * "INVALID_RESPONSE" when no usable reply arrived.
 */
export class WauCaptchaError extends Error {
  readonly code: string;
  /** HTTP status of the reply; 0 when there was none. */
  readonly status: number;
  /** Details the service attached, e.g. `field`. */
  readonly metadata: Record<string, string>;

  constructor(code: string, message: string, status = 0, metadata: Record<string, string> = {}) {
    super(message);
    this.name = "WauCaptchaError";
    this.code = code;
    this.status = status;
    this.metadata = metadata;
  }
}
