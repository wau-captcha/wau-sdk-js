// The browser probes of auto_check. Each is a hint a determined script can fake, and a few people's
// setups trip one (a privacy tool, a virtual machine without a GPU), so the service only lets them
// lower the score: a visitor it is unsure of gets a puzzle, never an error. Only the names of the
// probes that tripped leave the page, with the User-Agent and the language every request carries
// already: no canvas or WebGL output, no fonts, no plugins, nothing that tells one browser from
// another of its kind.

import type { AutoProbe } from "./types.js";

/** The most the probes take together; the proof of work goes on meanwhile. */
const PROBE_BUDGET_MS = 300;
/** navigator.permissions.query hangs in some browsers: the notification probe gives up after this. */
const PERMISSION_TIMEOUT_MS = 200;
/** What headless Chrome, servers and some virtual machines render WebGL with: the CPU. */
const SOFTWARE_RENDERER = /SwiftShader|llvmpipe|softpipe/i;
const MOBILE_USER_AGENT = /Android|iPhone|Mobile/;

type Probe = (nav: Navigator, userAgent: string) => boolean | Promise<boolean>;

/** In the order the findings are reported, which is always the same. */
const PROBES: Array<[string, Probe]> = [
  ["patched_natives", patchedNatives],
  ["outer_zero", () => globalThis.outerWidth === 0 || globalThis.outerHeight === 0],
  ["software_gl", softwareGL],
  ["notification_mismatch", notificationMismatch],
  ["touch_mismatch", (nav, userAgent) => MOBILE_USER_AGENT.test(userAgent) && nav.maxTouchPoints === 0],
  ["no_hardware", (nav) => !nav.hardwareConcurrency],
  // Desktop Chrome lists its PDF viewer five times; Chrome on Android and Android WebView list nothing.
  ["no_plugins", (nav, userAgent) => /\bChrome\/\d/.test(userAgent) && !MOBILE_USER_AGENT.test(userAgent) && nav.plugins.length === 0],
];

/**
 * Runs the browser probes of auto_check and returns what verifyAuto sends: navigator.userAgent,
 * navigator.language and the names of the probes that tripped. A probe that throws, or that the
 * browser cannot run, found nothing; the probes together take 300 ms at most, and without a
 * navigator, as in Node.js, none runs.
 */
export async function probeBrowser(): Promise<AutoProbe> {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const userAgent = typeof nav?.userAgent === "string" ? nav.userAgent : "";
  const language = typeof nav?.language === "string" ? nav.language : "";
  const found = new Set<string>();
  if (nav) {
    const run = async ([name, probe]: [string, Probe]) => {
      try {
        if (await probe(nav, userAgent)) found.add(name);
      } catch {
        // Not supported, or blocked by a privacy tool: not a sign of a script.
      }
    };
    await withTimeout(Promise.all(PROBES.map(run)), PROBE_BUDGET_MS);
  }
  return { userAgent, language, findings: PROBES.map(([name]) => name).filter((name) => found.has(name)) };
}

/**
 * Stealth plugins hide navigator.webdriver behind a getter of their own, and some replace
 * Function.prototype.toString so it reads native. A careful one patches both well; this finds the rest.
 */
function patchedNatives(): boolean {
  const toString = Function.prototype.toString;
  const native = (fn: unknown) => typeof fn !== "function" || toString.call(fn).includes("[native code]");
  const webdriver = typeof Navigator === "function" ? Object.getOwnPropertyDescriptor(Navigator.prototype, "webdriver")?.get : undefined;
  return !native(webdriver) || !native(toString);
}

/** Whether WebGL renders on the CPU. Only the yes or no leaves the page, never the renderer. */
function softwareGL(): boolean {
  if (typeof document === "undefined") return false;
  const gl = document.createElement("canvas").getContext("webgl");
  if (!gl) return false;
  try {
    let renderer = String(gl.getParameter(gl.RENDERER));
    // Chrome and Safari mask RENDERER and name the renderer in their debug extension only; Firefox
    // names it in RENDERER and warns about the extension, so it is asked only when masked.
    if (renderer === "WebKit WebGL") {
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      if (debug) renderer = String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    }
    return SOFTWARE_RENDERER.test(renderer);
  } finally {
    // Browsers keep a few contexts per page: this one is given back at once.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

/** Headless Chrome denies notifications while its Permissions API still says it would ask. */
async function notificationMismatch(nav: Navigator): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "denied") return false;
  const status = await withTimeout(nav.permissions.query({ name: "notifications" }), PERMISSION_TIMEOUT_MS);
  return status?.state === "prompt";
}

/** `promise`, or undefined once `ms` have passed without it settling. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
