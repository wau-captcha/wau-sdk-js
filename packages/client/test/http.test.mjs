import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBaseUrl, requestJson } from "../src/http.js";
import { WauCaptchaError } from "../src/errors.js";

test("normalizeBaseUrl takes https", () => {
  assert.equal(normalizeBaseUrl("https://api.waucaptcha.com"), "https://api.waucaptcha.com");
  assert.equal(normalizeBaseUrl("  https://api.waucaptcha.com/// "), "https://api.waucaptcha.com");
  assert.equal(normalizeBaseUrl("https://example.com/captcha/"), "https://example.com/captcha");
});

test("normalizeBaseUrl takes http only for local development", () => {
  assert.equal(normalizeBaseUrl("http://localhost:8080"), "http://localhost:8080");
  assert.equal(normalizeBaseUrl("http://127.0.0.1:8080/"), "http://127.0.0.1:8080");
  assert.equal(normalizeBaseUrl("http://[::1]:8080"), "http://[::1]:8080");
});

test("normalizeBaseUrl refuses http and anything that is not a URL", () => {
  for (const address of ["http://api.waucaptcha.com", "http://localhost.evil.example", "ftp://example.com", "api.waucaptcha.com", "https//x", "", "   "]) {
    assert.throws(() => normalizeBaseUrl(address), TypeError, address);
  }
  assert.throws(() => normalizeBaseUrl(undefined), TypeError);
  assert.throws(() => normalizeBaseUrl("http://api.waucaptcha.com"), /must start with https:\/\//);
});

test("a RATE_LIMITED reply carries retryAfter", async () => {
  const reply = (body, headers) => async () => new Response(JSON.stringify(body), { status: 429, headers });
  const fromMetadata = await requestJson({
    fetch: reply({ code: 429, reason: "RATE_LIMITED", message: "too many requests", metadata: { retry_after: "37" } }, {}),
    url: "https://api.waucaptcha.com/challenge/new",
    init: {},
    timeoutMs: 1000,
  }).catch((error) => error);
  assert.ok(fromMetadata instanceof WauCaptchaError);
  assert.equal(fromMetadata.code, "RATE_LIMITED");
  assert.equal(fromMetadata.retryAfter, 37);

  const fromHeader = await requestJson({
    fetch: reply({ code: 429, reason: "RATE_LIMITED", message: "too many requests", metadata: {} }, { "Retry-After": "12" }),
    url: "https://api.waucaptcha.com/challenge/verify",
    init: {},
    timeoutMs: 1000,
  }).catch((error) => error);
  assert.equal(fromHeader.retryAfter, 12);

  assert.equal(new WauCaptchaError("SITE_KEY_INVALID", "site key is invalid", 401).retryAfter, undefined);
});
