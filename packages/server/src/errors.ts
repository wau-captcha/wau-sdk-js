/**
 * A call to WAU Captcha that failed. `code` is the reason the service gave, such as
 * ErrorCode.SECRET_KEY_INVALID, or one the SDK raised when no usable reply arrived, such as
 * ErrorCode.NETWORK_ERROR. Compare it with the ErrorCode constants.
 */
export class WauCaptchaError extends Error {
  /** An ErrorCode value; a string, so reasons newer than this SDK still come through. */
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
