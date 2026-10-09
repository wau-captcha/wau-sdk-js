import type { ChallengeType } from "./constants.js";

export interface Challenge {
  /** Pass it to verify together with the answer. */
  id: string;
  type: ChallengeType;
  /** A data: URL, ready for an <img> src. */
  imageUrl: string;
  /** "image/png", "image/gif" or, for slide_puzzle, "image/jpeg". */
  mimeType: string;
  /** Size to display the image at, in CSS pixels. */
  width: number;
  height: number;
  /** After this the challenge can no longer be answered. */
  expiresAt: Date;
  /**
   * slide_puzzle only: the piece to drag over the image, a PNG data: URL. It starts with its left
   * edge at x = 0 and moves horizontally; y, width and height are in CSS pixels of the image.
   */
  piece?: { imageUrl: string; y: number; width: number; height: number };
  /**
   * The proof of work the service asks for: SHA-256(salt ‖ id ‖ nonce) must start with
   * `difficulty` zero bits. WauCaptchaClient solves it in the background as soon as the challenge
   * arrives and sends the nonce with the answer; there is nothing to do with it.
   */
  pow?: { salt: Uint8Array; difficulty: number };
}

/**
 * A slide_puzzle drag: where the left edge of the piece ended, and the points of the drag, each
 * [ms since pointerdown, left edge of the piece, vertical offset of the pointer from where it
 * went down], in CSS pixels of the image. trackSlide records it.
 */
export type SlideDrag = { x: number; trail: Array<[number, number, number]> };

/**
 * How the person behaved while a challenge was on screen, as recordBehavior records it and the
 * service reads it: times in ms since the challenge was shown, x and y in CSS px from the top-left
 * corner of the widget. It never holds the keys pressed or anything from the page.
 */
export type Behavior = {
  version: 1;
  elapsed_ms: number;
  /** Pointer moves (one per 16 ms at most) and the places it went down, the latest 200. */
  pointer: Array<{ t: number; x: number; y: number }>;
  /** "mouse", "touch", "pen", or "" when no pointer was used. */
  pointer_type: string;
  /** Milliseconds between key presses in the answer box, the latest 64. */
  key_intervals_ms: number[];
  input_events: number;
  paste_events: number;
  /** Events a script dispatched on the widget. */
  untrusted_events: number;
  webdriver: boolean;
  hidden_ms: number;
  /**
   * Hints the browser gives about itself, from 1.3.0 on: navigator.userAgent names HeadlessChrome,
   * navigator.languages is empty, a Chrome user agent without window.chrome. A script can fake
   * each and some privacy tools trip them, so the service only lets them lower the score.
   */
  headless_ua?: boolean;
  no_languages?: boolean;
  chrome_without_window_chrome?: boolean;
};

export type VerifyOptions = {
  signal?: AbortSignal | undefined;
  /** What recordBehavior recorded for this challenge. Without it only the answer is checked. */
  behavior?: Behavior | undefined;
  /** The proof of work, for a challenge fetched without newChallenge; found by it otherwise. */
  powNonce?: string | undefined;
};

/** A correct answer carries the one-time token your backend redeems with @wau-captcha/server. */
export type VerifyResult = { success: true; token: string; expiresAt: Date } | { success: false };
