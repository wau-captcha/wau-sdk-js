/**
 * A call to WAU Captcha that failed. `code` is the reason the service gave, such as
 * "SITE_KEY_INVALID" or "ORIGIN_NOT_ALLOWED", or one of "NETWORK_ERROR", "TIMEOUT" and
 * "INVALID_RESPONSE" when no usable reply arrived.
 */
export class WauCaptchaError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status] HTTP status of the reply; 0 when there was none.
   * @param {Record<string, string>} [metadata] Details the service attached, e.g. `field`.
   */
  constructor(code, message, status = 0, metadata = {}) {
    super(message);
    this.name = "WauCaptchaError";
    /** @type {string} */
    this.code = code;
    /** @type {number} */
    this.status = status;
    /** @type {Record<string, string>} */
    this.metadata = metadata;
  }
}
