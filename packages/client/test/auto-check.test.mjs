import assert from "node:assert/strict";
import { test } from "node:test";
import { probeBrowser } from "../src/auto-check.js";

test("probeBrowser finds nothing and throws nothing where the browser globals are missing", async () => {
  // Node.js 21 and later have a navigator of their own, with a user agent and a CPU count, and none
  // of window, document, Notification or the rest.
  const probe = await probeBrowser();
  assert.deepEqual(probe.findings, []);
  assert.equal(typeof probe.userAgent, "string");

  // Without a navigator at all, as in Node.js 18 and 20.
  const saved = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: undefined, configurable: true });
  try {
    assert.deepEqual(await probeBrowser(), { userAgent: "", language: "", findings: [] });
  } finally {
    if (saved) Object.defineProperty(globalThis, "navigator", saved);
    else delete globalThis.navigator;
  }
});
