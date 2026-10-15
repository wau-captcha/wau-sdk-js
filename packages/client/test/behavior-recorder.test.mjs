import assert from "node:assert/strict";
import { test } from "node:test";
import { recordBehavior } from "../src/behavior-recorder.js";

/** A stand-in for document or the widget that keeps its listeners, so a test can call them with events of its own. */
function target(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter((known) => known !== listener));
    },
    fire(type, event) {
      for (const listener of listeners.get(type) ?? []) listener({ type, ...event });
    },
  };
}

/** Runs `run` with a page of stand-ins: document, a widget at (0, 0), and a navigator if Node.js has none. */
function withPage(run) {
  const saved = ["document", "navigator"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const page = target({ hidden: false });
  Object.defineProperty(globalThis, "document", { value: page, configurable: true });
  if (typeof navigator === "undefined") Object.defineProperty(globalThis, "navigator", { value: { userAgent: "", languages: ["vi"] }, configurable: true });
  try {
    return run(page, target({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }));
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/**
 * A PointerEvent-like move at `time` ms to (x, y): by the mouse, trusted, reporting its movement,
 * and made of `coalesced` moves of the mouse, unless told otherwise.
 */
function move(time, x, y, { coalesced = 1, movement = true, pointerType = "mouse", isTrusted = true, coalescedEvents = true } = {}) {
  return {
    isTrusted,
    pointerType,
    timeStamp: time,
    clientX: x,
    clientY: y,
    movementX: movement ? 1 : 0,
    movementY: movement ? 1 : 0,
    ...(coalescedEvents ? { getCoalescedEvents: () => Array.from({ length: coalesced }) } : {}),
  };
}

test("pointerSummary counts how the mouse moves were made, over every move", () => {
  withPage((page, root) => {
    // A hand: moves 7, 9, 12 and 16 ms apart, every other one coalesced with another.
    const hand = recordBehavior({ root, page: true });
    let time = 1000;
    for (let i = 0; i <= 40; i++) {
      page.fire("pointermove", move(time, 10 + i, 20 + i, { coalesced: i % 2 === 0 ? 2 : 1 }));
      time += [7, 9, 12, 16][i % 4];
    }
    // 7 ms is as common as the others and comes first: 6 to 8 ms take 10 of the 40 gaps.
    assert.deepEqual(hand.pointerSummary(), { n: 41, k: 21, z: 0, s: 10 });
    hand.stop();

    // A script: 90 moves exactly 16 ms apart, none coalesced, without movement although they moved.
    const script = recordBehavior({ root, page: true });
    for (let i = 0; i < 90; i++) page.fire("pointermove", move(5000 + i * 16, 100 + i * 3, 200, { movement: false }));
    assert.deepEqual(script.pointerSummary(), { n: 90, k: 0, z: 89, s: 89 });
    script.stop();
  });
});

test("pointerSummary without getCoalescedEvents, as in browsers that lack it", () => {
  withPage((page, root) => {
    const recorder = recordBehavior({ root, page: true });
    for (let i = 0; i < 30; i++) page.fire("pointermove", move(i * 10, i, i, { coalescedEvents: false }));
    assert.deepEqual(recorder.pointerSummary(), { n: 30, k: -1, z: 0, s: 29 });
    recorder.stop();
  });
});

test("pointerSummary leaves out what is not a trusted mouse move", () => {
  withPage((page, root) => {
    const recorder = recordBehavior({ root, page: true });
    page.fire("pointermove", move(0, 1, 1, { isTrusted: false }));
    page.fire("pointermove", move(10, 2, 2, { pointerType: "touch" }));
    page.fire("pointermove", move(20, 3, 3, { pointerType: "pen" }));
    page.fire("pointerdown", move(30, 3, 3));
    assert.deepEqual(recorder.pointerSummary(), { n: 0, k: 0, z: 0, s: 0 });
    // Standing still without movement is no sign of anything; a pause is no gap to compare.
    page.fire("pointermove", move(40, 5, 5));
    page.fire("pointermove", move(55.6, 5, 5, { movement: false }));
    page.fire("pointermove", move(72, 6, 6));
    page.fire("pointermove", move(372, 7, 7));
    // 15.6 and 16.4 ms both round to 16 ms; the 300 ms pause is left out.
    assert.deepEqual(recorder.pointerSummary(), { n: 4, k: 0, z: 0, s: 2 });
    recorder.stop();
    page.fire("pointermove", move(400, 8, 8));
    assert.equal(recorder.pointerSummary().n, 4);
  });
});

test("pointerSummary counts before the 16 ms thinning, and only with page: true", () => {
  withPage((page, root) => {
    const auto = recordBehavior({ root, page: true });
    const widget = recordBehavior({ root });
    const start = performance.now();
    for (let i = 0; i < 50; i++) page.fire("pointermove", move(start + 1 + i * 4, i, i, { coalesced: 3 }));
    assert.deepEqual(auto.pointerSummary(), { n: 50, k: 50, z: 0, s: 49 });
    // The behaviour data keeps a move per 16 ms at most.
    assert.ok(auto.snapshot().pointer.length <= 13);
    assert.deepEqual(widget.pointerSummary(), { n: 0, k: 0, z: 0, s: 0 });
    auto.stop();
    widget.stop();
  });
});
