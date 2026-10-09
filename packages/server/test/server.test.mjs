import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBaseUrl } from "../src/base-url.js";
import { WauCaptchaServer } from "../src/server.js";

const secretKey = "sk_4a43813384268b62be376cf7b81eb47ca9619c23e2b4c198";

test("the base URL must be https, or http on localhost", () => {
  assert.equal(normalizeBaseUrl("https://api.waucaptcha.com/"), "https://api.waucaptcha.com");
  assert.equal(normalizeBaseUrl("http://localhost:8080"), "http://localhost:8080");
  assert.equal(normalizeBaseUrl("http://127.0.0.1:8080"), "http://127.0.0.1:8080");
  assert.equal(normalizeBaseUrl("http://[::1]:8080"), "http://[::1]:8080");
  for (const address of ["http://api.waucaptcha.com", "not a url", "", "javascript:alert(1)"]) {
    assert.throws(() => normalizeBaseUrl(address), TypeError, address);
  }
});

test("the constructor refuses plain http", () => {
  assert.throws(() => new WauCaptchaServer({ secretKey, baseUrl: "http://api.waucaptcha.com" }), /must start with https:\/\//);
  assert.doesNotThrow(() => new WauCaptchaServer({ secretKey, baseUrl: "https://api.waucaptcha.com" }));
});

test("verifyToken posts the token as JSON, never in the URL", async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = { url, init };
    return new Response(
      JSON.stringify({ success: true, challenge_type: "image_distort", challenge_ts: "2026-10-08T08:15:02Z", behavior: { verdict: "human", score: 1, reasons: [] } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const server = new WauCaptchaServer({ secretKey, baseUrl: "https://api.waucaptcha.com", fetch });
  const result = await server.verifyToken(" the-token ");
  assert.equal(sent.url, "https://api.waucaptcha.com/siteverify");
  assert.equal(sent.init.method, "POST");
  assert.equal(sent.init.headers["Content-Type"], "application/json");
  assert.equal(sent.init.headers.Authorization, `Bearer ${secretKey}`);
  assert.deepEqual(JSON.parse(sent.init.body), { token: "the-token" });
  assert.equal(result.success, true);
});

test("a RATE_LIMITED reply carries retryAfter", async () => {
  const fetch = async () =>
    new Response(JSON.stringify({ code: 429, reason: "RATE_LIMITED", message: "too many requests", metadata: {} }), {
      status: 429,
      headers: { "Retry-After": "9" },
    });
  const server = new WauCaptchaServer({ secretKey, baseUrl: "https://api.waucaptcha.com", fetch });
  await assert.rejects(server.verifyToken("token"), (error) => error.code === "RATE_LIMITED" && error.retryAfter === 9);
});

test("verifyToken returns the hostname, empty from an older service", async () => {
  const replyWith = (extra) => async () =>
    Response.json({ success: true, challenge_type: "image_distort", challenge_ts: "2026-10-08T08:15:02Z", behavior: { verdict: "human", score: 1, reasons: [] }, ...extra });
  const bound = new WauCaptchaServer({ secretKey, baseUrl: "https://api.waucaptcha.com", fetch: replyWith({ hostname: "shop.example.com" }) });
  const result = await bound.verifyToken("token");
  assert.equal(result.success, true);
  assert.equal(result.hostname, "shop.example.com");
  const older = new WauCaptchaServer({ secretKey, baseUrl: "https://api.waucaptcha.com", fetch: replyWith({}) });
  assert.equal((await older.verifyToken("token")).hostname, "");
});
