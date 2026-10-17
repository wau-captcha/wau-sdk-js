import type { Challenge, SlideDrag } from "./client.js";

// The service reads at most 400 points; one every 8 ms keeps the shape of a drag of up to 3 s.
const MIN_INTERVAL_MS = 8;
const MAX_POINTS = 400;

export interface SlideTrackerOptions {
  /** The slider handle. While it is disabled, pressing it starts no drag. */
  handle: HTMLButtonElement;
  /** The challenge image as displayed: its rendered width turns CSS pixels on screen into pixels of the image. */
  image: HTMLElement;
  /** A slide_puzzle challenge, which has a piece. */
  challenge: Challenge;
  /** Where the left edge of the piece is now, in pixels of the image: on every move, and 0 when a drag is dropped. */
  onMove: (x: number) => void;
  /** The finished drag, on release. A drag that leaves the piece at x = 0 sends nothing. */
  onRelease: (drag: SlideDrag) => void;
}

interface Drag {
  pointerId: number;
  /** timeStamp, clientX and clientY of the pointerdown. */
  startTime: number;
  startX: number;
  startY: number;
  /** Pixels of the image per CSS pixel on screen. */
  scale: number;
  trail: SlideDrag["trail"];
}

/**
 * Records the drags of a slide_puzzle handle the way the service checks them: for each point, the
 * time since pointerdown, the left edge of the piece and the vertical offset of the pointer, in
 * pixels of the image. Shared by renderWidget and <WauCaptcha /> from @waucaptcha-sdk/react; put
 * touch-action: none on the track so touch screens drag instead of scrolling. Returns a function
 * that stops recording.
 */
export function trackSlide({ handle, image, challenge, onMove, onRelease }: SlideTrackerOptions): () => void {
  const maxX = challenge.width - (challenge.piece?.width ?? 0);
  let drag: Drag | null = null;

  /** Adds the point of `event` to the trail and returns the piece's x there. */
  function record(current: Drag, event: PointerEvent, release: boolean): number {
    const t = event.timeStamp - current.startTime;
    const x = Math.min(Math.max((event.clientX - current.startX) * current.scale, 0), maxX);
    const y = (event.clientY - current.startY) * current.scale;
    const { trail } = current;
    if (t - trail[trail.length - 1][0] >= MIN_INTERVAL_MS) trail.push([t, x, y]);
    // The release always ends the trail, so that its x is where the piece stopped; the pointerdown stays first.
    else if (release) trail.splice(Math.max(trail.length - 1, 1), 1, [t, x, y]);
    return x;
  }

  function press(event: PointerEvent) {
    const width = image.getBoundingClientRect().width;
    if (drag || handle.disabled || !event.isPrimary || event.button !== 0 || width === 0) return;
    // Keeps the browser from selecting text or starting a native drag instead.
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    drag = {
      pointerId: event.pointerId,
      startTime: event.timeStamp,
      startX: event.clientX,
      startY: event.clientY,
      scale: challenge.width / width,
      trail: [[0, 0, 0]],
    };
  }

  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    // Browsers merge fast pointer moves into one event per frame; the merged ones keep their timing.
    // getCoalescedEvents is missing outside secure contexts.
    const samples = event.getCoalescedEvents?.() ?? [];
    let x = 0;
    for (const sample of samples.length > 0 ? samples : [event]) x = record(drag, sample, false);
    onMove(x);
  }

  function release(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const finished = drag;
    drag = null;
    const x = record(finished, event, true);
    onMove(x);
    if (x > 0) onRelease({ x, trail: thin(finished.trail) });
  }

  function drop(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    onMove(0);
  }

  const listeners = [
    ["pointerdown", press],
    ["pointermove", move],
    ["pointerup", release],
    ["pointercancel", drop],
    ["lostpointercapture", drop],
  ] as const;
  for (const [type, listener] of listeners) handle.addEventListener(type, listener);
  return () => {
    drag = null;
    for (const [type, listener] of listeners) handle.removeEventListener(type, listener);
  };
}

/** Keeps MAX_POINTS evenly spread points of a longer trail, the first and the last among them. */
function thin(trail: SlideDrag["trail"]): SlideDrag["trail"] {
  if (trail.length <= MAX_POINTS) return trail;
  return Array.from({ length: MAX_POINTS }, (_, i) => trail[Math.round((i * (trail.length - 1)) / (MAX_POINTS - 1))]);
}
