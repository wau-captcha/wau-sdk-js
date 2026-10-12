/**
 * The challenge types, by their API names. IMAGE_DISTORT is distorted text in a PNG;
 * MOTION_NOISE hides the text in a short animated GIF of moving dots; SLIDE_PUZZLE asks to drag
 * a puzzle piece into its hole and checks that the drag moved like a hand; ANIMAL_JUMP plays two
 * rounds of 2 s in which five animal heads jump, and asks to click, in each, the one that jumps
 * highest; OBJECT_ROTATE shows, in each of two rounds, an object beside an arrow on the ground and
 * asks to turn the object a step at a time until it faces the arrow; AUTO_CHECK shows nothing to
 * solve: it checks the browser and the behaviour in it, and shows a challenge of its fallback type
 * only when it is unsure. A key's plan decides which ones it may request. SLIDE_PUZZLE and
 * ANIMAL_JUMP need a pointer, so keyboard-only users cannot solve them; OBJECT_ROTATE works with a
 * pointer or the keyboard, but needs sight. AUTO_CHECK needs no action from most visitors and shows
 * the fallback type to the rest, so it is as accessible as its fallback: choose IMAGE_DISTORT as
 * the fallback where keyboard-only visitors matter. Where accessibility matters, keep IMAGE_DISTORT
 * available as well.
 */
export const ChallengeType = {
  IMAGE_DISTORT: "image_distort",
  MOTION_NOISE: "motion_noise",
  SLIDE_PUZZLE: "slide_puzzle",
  ANIMAL_JUMP: "animal_jump",
  OBJECT_ROTATE: "object_rotate",
  AUTO_CHECK: "auto_check",
} as const;

export type ChallengeType = (typeof ChallengeType)[keyof typeof ChallengeType];

/**
 * When an AUTO_CHECK widget shows: ALWAYS from the start; INTERACTION_ONLY only when the visitor
 * must act, for the fallback challenge or an error, and never while it checks or once it passed.
 */
export const Appearance = {
  ALWAYS: "always",
  INTERACTION_ONLY: "interaction-only",
} as const;

export type Appearance = (typeof Appearance)[keyof typeof Appearance];

/**
 * The codes a WauCaptchaError can carry in the browser: the reasons the challenge service
 * and the gateway send, then the ones the SDK raises itself when no usable reply arrived.
 */
export const ErrorCode = {
  SITE_KEY_INVALID: "SITE_KEY_INVALID",
  /** The address of the visitor is not in the IP list of the key. */
  ORIGIN_NOT_ALLOWED: "ORIGIN_NOT_ALLOWED",
  /** The website is not in the allowed domains of the key. */
  DOMAIN_NOT_ALLOWED: "DOMAIN_NOT_ALLOWED",
  CHALLENGE_TYPE_UNSUPPORTED: "CHALLENGE_TYPE_UNSUPPORTED",
  CHALLENGE_TYPE_NOT_ALLOWED: "CHALLENGE_TYPE_NOT_ALLOWED",
  CHALLENGE_NOT_FOUND: "CHALLENGE_NOT_FOUND",
  CHALLENGE_ID_INVALID: "CHALLENGE_ID_INVALID",
  /** The key requires behaviour data and the answer came without any: send recordBehavior's snapshot. */
  BEHAVIOR_REQUIRED: "BEHAVIOR_REQUIRED",
  API_KEY_SUSPENDED: "API_KEY_SUSPENDED",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  DAILY_QUOTA_EXCEEDED: "DAILY_QUOTA_EXCEEDED",
  RATE_LIMITED: "RATE_LIMITED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  /** The service failed; the details stay in its log. */
  INTERNAL: "INTERNAL",
  ROUTE_NOT_FOUND: "ROUTE_NOT_FOUND",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
