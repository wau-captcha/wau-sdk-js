/**
 * The challenge types, by their API names. IMAGE_DISTORT is distorted text in a PNG;
 * MOTION_NOISE hides the text in a short animated GIF of moving dots; SLIDE_PUZZLE asks to drag
 * a puzzle piece into its hole and checks that the drag moved like a hand; ANIMAL_JUMP plays two
 * rounds of 2 s in which five animal heads jump, and asks to click, in each, the one that jumps
 * highest; OBJECT_ROTATE shows, in each of two rounds, an object beside an arrow on the ground and
 * asks to turn the object a step at a time until it faces the arrow; AUTO_CHECK shows nothing to
 * solve: it checks the browser and the behaviour in it, and shows a challenge of its fallback type
 * only when it is unsure. A token of AUTO_CHECK means the visitor passed without a puzzle; one who
 * solved the fallback has a token of the fallback's type. SLIDE_PUZZLE and ANIMAL_JUMP need a
 * pointer, so keyboard-only users cannot solve them; OBJECT_ROTATE works with a pointer or the
 * keyboard, but needs sight. AUTO_CHECK needs no action from most visitors and shows the fallback
 * type to the rest, so it is as accessible as its fallback: choose IMAGE_DISTORT as the fallback
 * where keyboard-only visitors matter. Where accessibility matters, keep IMAGE_DISTORT available as
 * well.
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
 * What the behaviour check concluded about the answer behind a token. HUMAN: it behaved like a
 * person. SUSPICIOUS: the answer was right but the session looked scripted, or came without the
 * proof of work of SDK 1.3.0; decide per form, and refuse it for sign-up and login.
 * NOT_MEASURED: the client sent no behaviour (an SDK older than 1.2.0 or a hand-written
 * integration), so only the answer was checked: treat it as untrusted and refuse it. Answers
 * judged automated never get a token.
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
