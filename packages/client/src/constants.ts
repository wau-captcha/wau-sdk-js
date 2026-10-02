/**
 * The challenge types, by their API names. IMAGE_DISTORT is distorted text in a PNG;
 * MOTION_NOISE hides the text in a short animated GIF of moving dots. A key's plan decides
 * which ones it may request.
 */
export const ChallengeType = {
  IMAGE_DISTORT: "image_distort",
  MOTION_NOISE: "motion_noise",
} as const;

export type ChallengeType = (typeof ChallengeType)[keyof typeof ChallengeType];

/**
 * The codes a WauCaptchaError can carry in the browser: the reasons the challenge service
 * and the entry point in front of it send, then the ones the SDK raises itself when no usable
 * reply arrived.
 */
export const ErrorCode = {
  SITE_KEY_INVALID: "SITE_KEY_INVALID",
  ORIGIN_NOT_ALLOWED: "ORIGIN_NOT_ALLOWED",
  CHALLENGE_TYPE_UNSUPPORTED: "CHALLENGE_TYPE_UNSUPPORTED",
  CHALLENGE_TYPE_NOT_ALLOWED: "CHALLENGE_TYPE_NOT_ALLOWED",
  CHALLENGE_NOT_FOUND: "CHALLENGE_NOT_FOUND",
  API_KEY_SUSPENDED: "API_KEY_SUSPENDED",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  DAILY_QUOTA_EXCEEDED: "DAILY_QUOTA_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
