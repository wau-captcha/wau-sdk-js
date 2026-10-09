import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { leadingZeroBits, sha256, solvePow } from "../src/pow.js";

const hex = (bytes) => Buffer.from(bytes).toString("hex");
const text = (value) => new TextEncoder().encode(value);

test("sha256 matches the FIPS 180-2 vectors", () => {
  assert.equal(hex(sha256(text(""))), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(hex(sha256(text("abc"))), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(
    hex(sha256(text("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))),
    "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
  );
  assert.equal(hex(sha256(text("a".repeat(1_000_000)))), "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0");
});

test("sha256 matches node:crypto across block boundaries", () => {
  for (let length = 0; length <= 200; length++) {
    const bytes = randomBytes(length);
    assert.equal(hex(sha256(bytes)), createHash("sha256").update(bytes).digest("hex"), `${length} bytes`);
  }
});

test("leadingZeroBits", () => {
  assert.equal(leadingZeroBits(Uint8Array.of(0x80)), 0);
  assert.equal(leadingZeroBits(Uint8Array.of(0x01)), 7);
  assert.equal(leadingZeroBits(Uint8Array.of(0x00, 0x0f)), 12);
  assert.equal(leadingZeroBits(Uint8Array.of(0x00, 0x00)), 16);
});

const challengeId = "0f9c6b5e-1d2a-4c3b-8e7f-9a0b1c2d3e4f";
const salt = text("0123456789abcdef");

test("solvePow finds the nonce the service expects", async () => {
  // The vector of the challenge service's TestPowSolved (internal/biz/pow_test.go).
  assert.equal(await solvePow(salt, challengeId, 12), "1233");
  const digest = createHash("sha256").update(Buffer.concat([salt, text(challengeId), text("1233")])).digest();
  assert.ok(leadingZeroBits(digest) >= 12);
  assert.equal(await solvePow(salt, challengeId, 0), "0");
});

test("solvePow gives up on what it cannot or should not solve", async () => {
  assert.equal(await solvePow(salt, challengeId, 33), undefined);
  assert.equal(await solvePow(salt, challengeId, -1), undefined);
  assert.equal(await solvePow(salt, challengeId, 1.5), undefined);
  const stop = new AbortController();
  stop.abort();
  assert.equal(await solvePow(salt, challengeId, 20, { signal: stop.signal }), undefined);
});

test("solvePow at the default difficulty of 15", async () => {
  const times = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    const id = crypto.randomUUID();
    const challengeSalt = randomBytes(16);
    const nonce = await solvePow(challengeSalt, id, 15);
    times.push(performance.now() - start);
    const digest = createHash("sha256").update(Buffer.concat([challengeSalt, text(id), text(nonce)])).digest();
    assert.ok(leadingZeroBits(digest) >= 15);
  }
  times.sort((a, b) => a - b);
  const average = times.reduce((sum, time) => sum + time, 0) / times.length;
  console.log(`difficulty 15 in node: average ${average.toFixed(0)} ms, median ${times[10].toFixed(0)} ms, max ${times[19].toFixed(0)} ms`);
});
