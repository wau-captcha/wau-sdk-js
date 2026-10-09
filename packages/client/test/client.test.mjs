import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { browserHints } from "../src/behavior-recorder.js";
import { WauCaptchaClient } from "../src/client.js";
import { leadingZeroBits } from "../src/pow.js";

const challengeId = "0f9c6b5e-1d2a-4c3b-8e7f-9a0b1c2d3e4f";
const salt = Buffer.from("0123456789abcdef");

/** A fetch that answers /challenge/new with `challenge` and remembers the bodies sent to /challenge/verify. */
function service(challenge, verifyStatus = 200) {
  const verified = [];
  const fetch = async (url, init) => {
    if (url.includes("/challenge/new")) {
      return Response.json({ challenge_id: challengeId, challenge_type: "image_distort", image: "", mime_type: "image/png", width: 200, height: 70, expires_in: 120, ...challenge });
    }
    verified.push(JSON.parse(init.body));
    if (verifyStatus !== 200) return Response.json({ code: verifyStatus, reason: "BEHAVIOR_REQUIRED", message: "update" }, { status: verifyStatus });
    return Response.json({ success: true, token: "token", expires_in: 120 });
  };
  return { fetch, verified };
}

test("verify sends the site key and the proof of work", async () => {
  const { fetch, verified } = service({ pow_salt: salt.toString("base64"), pow_difficulty: 12 });
  const client = new WauCaptchaClient({ siteKey: " pk_shop ", baseUrl: "https://api.waucaptcha.com", fetch });
  const challenge = await client.newChallenge();
  assert.equal(challenge.pow.difficulty, 12);
  assert.deepEqual(Buffer.from(challenge.pow.salt), salt);
  const result = await client.verify(challenge.id, "abcde");
  assert.equal(result.success, true);
  assert.equal(verified[0].site_key, "pk_shop");
  assert.equal(verified[0].pow_nonce, "1233");
  const digest = createHash("sha256").update(Buffer.concat([salt, Buffer.from(challengeId), Buffer.from(verified[0].pow_nonce)])).digest();
  assert.ok(leadingZeroBits(digest) >= 12);
});

test("without a proof of work asked for, none is sent", async () => {
  const { fetch, verified } = service({ pow_salt: "", pow_difficulty: 0 });
  const client = new WauCaptchaClient({ siteKey: "pk_shop", baseUrl: "https://api.waucaptcha.com", fetch });
  const challenge = await client.newChallenge();
  assert.equal(challenge.pow, undefined);
  await client.verify(challenge.id, "abcde");
  assert.equal(verified[0].site_key, "pk_shop");
  assert.equal("pow_nonce" in verified[0], false);
});

test("BEHAVIOR_REQUIRED comes through as a WauCaptchaError", async () => {
  const { fetch } = service({}, 400);
  const client = new WauCaptchaClient({ siteKey: "pk_shop", baseUrl: "https://api.waucaptcha.com", fetch });
  const error = await client.verify(challengeId, "abcde").catch((caught) => caught);
  assert.equal(error.code, "BEHAVIOR_REQUIRED");
  assert.equal(error.status, 400);
});

test("browserHints", () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const chromeUA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  const hints = (userAgent, languages) => {
    Object.defineProperty(globalThis, "navigator", { value: { userAgent, languages }, configurable: true });
    return browserHints();
  };
  try {
    // Node has no window.chrome, like headless Chrome before version 112.
    assert.deepEqual(hints(chromeUA, ["vi-VN"]), { headless_ua: false, no_languages: false, chrome_without_window_chrome: true });
    assert.deepEqual(hints(chromeUA.replace("Chrome/", "HeadlessChrome/"), []), { headless_ua: true, no_languages: true, chrome_without_window_chrome: false });
    // Android WebView has no window.chrome either: it is not counted.
    assert.equal(hints("Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36", ["vi"]).chrome_without_window_chrome, false);
    assert.equal(hints("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15", ["en"]).chrome_without_window_chrome, false);
    globalThis.chrome = {};
    assert.equal(hints(chromeUA, ["vi-VN"]).chrome_without_window_chrome, false);
  } finally {
    delete globalThis.chrome;
    if (saved) Object.defineProperty(globalThis, "navigator", saved);
    else delete globalThis.navigator;
  }
});
