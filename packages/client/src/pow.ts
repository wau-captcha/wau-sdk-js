// The proof of work of a challenge: find the decimal nonce for which SHA-256(salt ‖ challenge id ‖
// nonce) starts with `difficulty` zero bits. The service checks it with the answer; an answer
// without it is judged at most "suspicious". SHA-256 is written out here so the SDK keeps no
// dependency, and runs in slices that leave the page responsive.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const INITIAL = Uint32Array.of(0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19);
// Reused by every hash: the solver runs tens of thousands of them, and allocations would dominate.
const W = new Uint32Array(64);
const H = new Uint32Array(8);

/** The size of `length` bytes once padded: the message, a 1 bit, zeros and its length, in 64-byte blocks. */
function paddedSize(length: number): number {
  return Math.ceil((length + 9) / 64) * 64;
}

/**
 * Hashes the first `length` bytes of `buffer` and returns the state, valid until the next hash.
 * `buffer` must hold paddedSize(length) bytes; what follows the message is overwritten.
 */
function hashInto(buffer: Uint8Array, length: number): Uint32Array {
  const end = paddedSize(length);
  buffer[length] = 0x80;
  buffer.fill(0, length + 1, end - 8);
  const bits = length * 8;
  const high = Math.floor(bits / 0x100000000);
  const low = bits >>> 0;
  for (let i = 0; i < 4; i++) {
    buffer[end - 8 + i] = (high >>> (24 - 8 * i)) & 0xff;
    buffer[end - 4 + i] = (low >>> (24 - 8 * i)) & 0xff;
  }
  H.set(INITIAL);
  for (let offset = 0; offset < end; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      W[i] = (buffer[j]! << 24) | (buffer[j + 1]! << 16) | (buffer[j + 2]! << 8) | buffer[j + 3]!;
    }
    for (let i = 16; i < 64; i++) {
      const w15 = W[i - 15]!;
      const w2 = W[i - 2]!;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      W[i] = W[i - 16]! + s0 + W[i - 7]! + s1;
    }
    let a = H[0]!;
    let b = H[1]!;
    let c = H[2]!;
    let d = H[3]!;
    let e = H[4]!;
    let f = H[5]!;
    let g = H[6]!;
    let h = H[7]!;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i]! + W[i]!) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    // Uint32Array stores the sums modulo 2^32.
    H[0] = H[0]! + a;
    H[1] = H[1]! + b;
    H[2] = H[2]! + c;
    H[3] = H[3]! + d;
    H[4] = H[4]! + e;
    H[5] = H[5]! + f;
    H[6] = H[6]! + g;
    H[7] = H[7]! + h;
  }
  return H;
}

/** SHA-256 of `bytes`, as 32 bytes. */
export function sha256(bytes: Uint8Array): Uint8Array {
  const buffer = new Uint8Array(paddedSize(bytes.length));
  buffer.set(bytes);
  const state = hashInto(buffer, bytes.length);
  const digest = new Uint8Array(32);
  for (let i = 0; i < 32; i++) digest[i] = (state[i >> 2]! >>> (24 - 8 * (i & 3))) & 0xff;
  return digest;
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

/** How many zero bits `digest` starts with. */
export function leadingZeroBits(digest: Uint8Array): number {
  let zeros = 0;
  for (const byte of digest) {
    if (byte !== 0) return zeros + Math.clz32(byte) - 24;
    zeros += 8;
  }
  return zeros;
}

/** The most the service asks for; past it the work would keep a phone busy for minutes. */
const MAX_DIFFICULTY = 32;
/** Work this long between two yields to the page, in ms. */
const SLICE_MS = 8;

export interface SolveOptions {
  /** Stops the search; the promise then resolves to undefined. */
  signal?: AbortSignal | undefined;
}

/**
 * Finds the nonce, counting up from 0, a few milliseconds at a time so the page stays responsive.
 * Resolves to undefined for a difficulty out of range, when aborted, or past 256 times the
 * expected work: the answer then goes without it, as from an older SDK.
 */
export async function solvePow(salt: Uint8Array, challengeId: string, difficulty: number, options: SolveOptions = {}): Promise<string | undefined> {
  if (!Number.isInteger(difficulty) || difficulty < 0 || difficulty > MAX_DIFFICULTY) return undefined;
  const prefix = new TextEncoder().encode(challengeId);
  const nonceAt = salt.length + prefix.length;
  // Room for the longest nonce, 20 digits, and its padding.
  const message = new Uint8Array(paddedSize(nonceAt + 20));
  message.set(salt);
  message.set(prefix, salt.length);
  const limit = 2 ** (difficulty + 8);
  let nonce = 0;
  while (nonce < limit) {
    if (options.signal?.aborted) return undefined;
    const sliceEnd = now() + SLICE_MS;
    do {
      const digits = String(nonce);
      for (let i = 0; i < digits.length; i++) message[nonceAt + i] = digits.charCodeAt(i);
      // Up to 32 bits are asked for: the first word of the digest tells.
      if (Math.clz32(hashInto(message, nonceAt + digits.length)[0]!) >= difficulty) return digits;
      nonce++;
    } while ((nonce & 0xff) !== 0 || now() < sliceEnd);
    await yieldToPage();
  }
  return undefined;
}

/**
 * Lets the page handle input and paint between two slices: scheduler.yield where the browser has
 * it, otherwise a message, which setTimeout(0) is not: browsers hold that back 4 ms once nested.
 */
function yieldToPage(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  if (typeof MessageChannel === "function") {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/** Decodes the base64 of pow_salt; undefined when it is not base64. */
export function decodeBase64(text: string): Uint8Array | undefined {
  try {
    const binary = atob(text);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return undefined;
  }
}
