import type { ChallengeType } from "./constants.js";

export interface Challenge {
  /** Pass it to verify together with the answer. */
  id: string;
  type: ChallengeType;
  /** A data: URL, ready for an <img> src; "" for auto_check, which has no image. */
  imageUrl: string;
  /** "image/png", "image/gif" or, for slide_puzzle and object_rotate, "image/jpeg"; "" for auto_check. */
  mimeType: string;
  /** Size to display the image at, in CSS pixels; for object_rotate, the size of one frame; 0 for auto_check. */
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
   * Round 2 as a data: URL, imageUrl being round 1. animal_jump: an animated GIF; each plays once
   * and lasts 2 s, and trackJump plays them and records the clicks. object_rotate: a strip of
   * frameCount frames; trackRotate shows them and records the presses.
   */
  secondImage?: string;
  /**
   * object_rotate only: imageUrl and secondImage are each this many frames of width × height side
   * by side, frame k the object turned k steps clockwise as seen from above.
   */
  frameCount?: number;
  /**
   * auto_check only: the type to load if the check does not let the visitor through, chosen by the
   * service from what the key allows; "" when it allows none.
   */
  fallbackType?: ChallengeType | "";
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
 * The click of one animal_jump round: where it landed, in CSS pixels of the image; the ms since
 * the playback it was made in started, which a replay starts again; and the replays used in the
 * round. trackJump records it.
 */
export type JumpClick = { x: number; y: number; ms: number; replays: number };

/**
 * One press of an object_rotate round: when, in whole ms since the round was shown, and which
 * way: 1 for Rotate right, the object turning a frame clockwise as seen from above, -1 for Rotate
 * left.
 */
export type RotatePress = { ms: number; direction: 1 | -1 };

/**
 * One object_rotate round: the frame on screen when Done was pressed, from 0; every press, in
 * order; and when Done was pressed, in whole ms since the round was shown. trackRotate records it.
 */
export type RotateRound = { frame: number; presses: RotatePress[]; doneMs: number };

/**
 * What auto_check answers with, as probeBrowser gathers it: navigator.userAgent and
 * navigator.language, which every request carries in its headers already, and the names of the
 * browser probes that tripped, e.g. "outer_zero". Nothing else about the browser leaves the page.
 */
export type AutoProbe = {
  userAgent: string;
  language: string;
  findings: string[];
  /**
   * The clearance to send back. Left out, verifyAuto sends the one this browser keeps for the site
   * key: after a puzzle is solved, the service hands one out with the token, and it lets the browser
   * pass auto_check on the site without a puzzle for a while.
   */
  clearance?: string | undefined;
  /** What the recorder's pointerSummary counted while the check ran; sent when it counted a move. */
  pointer?: PointerSummary | undefined;
};

/**
 * How the trusted mouse moves over the page were produced, counted by recordBehavior with
 * `page: true` before it thins them out: `n` moves; `k` of them came coalesced with others, which
 * a mouse polled faster than the screen redraws often produces (-1 when the browser has no
 * getCoalescedEvents); `z` had no movementX or movementY although the position changed; `s` came
 * within 1 ms of the most common gap between moves. Counts only, no positions or times.
 */
export type PointerSummary = { n: number; k: number; z: number; s: number };

/**
 * How the person behaved while a challenge was on screen, as recordBehavior records it and the
 * service reads it: times in ms since the challenge was shown, x and y in CSS px from the top-left
 * corner of the widget. It never holds the keys pressed or anything from the page.
 */
export type Behavior = {
  version: 1;
  elapsed_ms: number;
  /**
   * Pointer moves (one per 16 ms at most) and the places it went down on the widget, or for
   * auto_check anywhere on the page; the latest 200.
   */
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

/** A correct answer carries the one-time token your backend redeems with @waucaptcha-sdk/server. */
export type VerifyResult = { success: true; token: string; expiresAt: Date } | { success: false };
