/**
 * The challenge types, by their API names. IMAGE_DISTORT is distorted text in a PNG;
 * MOTION_NOISE hides the text in a short animated GIF of moving dots; SLIDE_PUZZLE asks to drag
 * a puzzle piece into its hole and checks that the drag moved like a hand.
 */
export const ChallengeType = {
  IMAGE_DISTORT: "image_distort",
  MOTION_NOISE: "motion_noise",
  SLIDE_PUZZLE: "slide_puzzle",
} as const;

export type ChallengeType = (typeof ChallengeType)[keyof typeof ChallengeType];

/**
 * What the behaviour check concluded about the answer behind a token. HUMAN: it behaved like a
 * person. SUSPICIOUS: the answer was right but the session looked scripted; refuse it for
 * sensitive actions if you like. NOT_MEASURED: the client sent no behaviour (an older SDK or a
 * plain REST call), so only the answer was checked. Answers judged automated never get a token.
 */
export const BehaviorVerdict = {
  HUMAN: "human",
  SUSPICIOUS: "suspicious",
  NOT_MEASURED: "not_measured",
} as const;

export type BehaviorVerdict = (typeof BehaviorVerdict)[keyof typeof BehaviorVerdict];

/**
 * The codes a WauCaptchaError can carry on the server: the reasons the verify service and the
 * gateway send, then the ones the SDK raises itself when no usable reply arrived.
 */
export const ErrorCode = {
  SECRET_KEY_INVALID: "SECRET_KEY_INVALID",
  API_KEY_SUSPENDED: "API_KEY_SUSPENDED",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  RATE_LIMITED: "RATE_LIMITED",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
