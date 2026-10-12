import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { browserHints } from "../src/behavior-recorder.js";
import { WauCaptchaClient } from "../src/client.js";
import { leadingZeroBits } from "../src/pow.js";

const challengeId = "0f9c6b5e-1d2a-4c3b-8e7f-9a0b1c2d3e4f";
const salt = Buffer.from("0123456789abcdef");

/**
 * A fetch that answers /challenge/new with `challenge` and remembers the URLs it was asked and the
 * bodies sent to /challenge/verify.
 */
function service(challenge, verifyStatus = 200) {
  const requested = [];
  const verified = [];
  const fetch = async (url, init) => {
    if (url.includes("/challenge/new")) {
      requested.push(new URL(url));
      return Response.json({ challenge_id: challengeId, challenge_type: "image_distort", image: "", mime_type: "image/png", width: 200, height: 70, expires_in: 120, ...challenge });
    }
    verified.push(JSON.parse(init.body));
    if (verifyStatus !== 200) return Response.json({ code: verifyStatus, reason: "BEHAVIOR_REQUIRED", message: "update" }, { status: verifyStatus });
    return Response.json({ success: true, token: "token", expires_in: 120 });
  };
  return { fetch, requested, verified };
}

/** An auto_check challenge as the service sends it: no image, and the fallback it chose. */
const autoCheck = { challenge_type: "auto_check", image: "", mime_type: "", width: 0, height: 0, fallback_type: "image_distort" };

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

test("newChallenge sends fallback_type only for auto_check", async () => {
  const { fetch, requested } = service(autoCheck);
  const client = new WauCaptchaClient({ siteKey: "pk_shop", baseUrl: "https://api.waucaptcha.com", fetch });
  await client.newChallenge({ challengeType: "auto_check", fallbackType: "slide_puzzle" });
  await client.newChallenge({ challengeType: "auto_check" });
  await client.newChallenge({ challengeType: "image_distort", fallbackType: "slide_puzzle" });
  await client.newChallenge({ fallbackType: "slide_puzzle" });
  assert.deepEqual(
    requested.map((url) => Object.fromEntries(url.searchParams)),
    [
      { site_key: "pk_shop", challenge_type: "auto_check", fallback_type: "slide_puzzle" },
      { site_key: "pk_shop", challenge_type: "auto_check" },
      { site_key: "pk_shop", challenge_type: "image_distort" },
      { site_key: "pk_shop", challenge_type: "image_distort" },
    ],
  );
});

test("an auto_check challenge has its fallback type and no image", async () => {
  const client = (challenge) => new WauCaptchaClient({ siteKey: "pk_shop", baseUrl: "https://api.waucaptcha.com", fetch: service(challenge).fetch });
  const auto = await client(autoCheck).newChallenge({ challengeType: "auto_check" });
  assert.equal(auto.type, "auto_check");
  assert.equal(auto.imageUrl, "");
  assert.equal(auto.fallbackType, "image_distort");
  assert.equal(auto.width, 0);
  // A key that allows nothing to fall back to.
  assert.equal((await client({ ...autoCheck, fallback_type: "" }).newChallenge()).fallbackType, "");
  // The other types keep their image, and have no fallbackType.
  const text = await client({ image: "iVBORw0KGgo=" }).newChallenge();
  assert.equal(text.imageUrl, "data:image/png;base64,iVBORw0KGgo=");
  assert.equal("fallbackType" in text, false);
});

test("verifyAuto sends the probe as the JSON the service reads", async () => {
  const { fetch, verified } = service({ ...autoCheck, pow_salt: salt.toString("base64"), pow_difficulty: 12 });
  const client = new WauCaptchaClient({ siteKey: "pk_shop", baseUrl: "https://api.waucaptcha.com", fetch });
  const challenge = await client.newChallenge({ challengeType: "auto_check" });
  await client.workDone(challenge.id);
  const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 ${"x".repeat(600)}`;
  const findings = Array.from({ length: 20 }, (_, i) => `probe_${i}`);
  const result = await client.verifyAuto(challenge.id, { userAgent, language: "vi-VN", findings });
  assert.equal(result.success, true);
  assert.equal(verified[0].site_key, "pk_shop");
  assert.equal(verified[0].pow_nonce, "1233");
  // The User-Agent cut to 512 characters, at most 16 findings, in the order the service documents.
  assert.equal(verified[0].answer, JSON.stringify({ v: 1, ua: userAgent.slice(0, 512), lang: "vi-VN", f: findings.slice(0, 16) }));
  assert.ok(verified[0].answer.startsWith('{"v":1,"ua":"Mozilla/5.0 (X11; Linux x86_64)'));
  assert.ok(new TextEncoder().encode(verified[0].answer).length <= 2048);

  const clean = service({ ...autoCheck });
  const other = new WauCaptchaClient({ siteKey: "pk_shop", baseUrl: "https://api.waucaptcha.com", fetch: clean.fetch });
  await other.verifyAuto(challengeId, { userAgent: "UA", language: "en-US", findings: [] });
  assert.equal(clean.verified[0].answer, '{"v":1,"ua":"UA","lang":"en-US","f":[]}');
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
