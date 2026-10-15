// The clearance of auto_check. After a puzzle is solved the service hands one out with the token,
// and this browser sends it back with its auto_check answers on the same site: it lets the browser
// skip the puzzle there for a while. It is kept in localStorage, under the site's origin and site
// key, and goes nowhere but to the service with an auto_check answer: never to the site's backend,
// and nothing the package exports reads it.

const STORAGE_PREFIX = "wau-captcha:clearance:";
/** The longest clearance the service reads; the ones it hands out are shorter. */
export const MAX_CLEARANCE = 256;

/** Keeps the clearance of a solved puzzle. A private window or blocked storage just means none. */
export function keepClearance(siteKey: string, clearance: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_PREFIX + siteKey, clearance);
  } catch {
    // Full, blocked or missing storage: auto_check shows a puzzle a little more often.
  }
}

/** The clearance this browser keeps for the site key, or undefined. */
export function keptClearance(siteKey: string): string | undefined {
  try {
    const clearance = globalThis.localStorage?.getItem(STORAGE_PREFIX + siteKey);
    return clearance && clearance.length <= MAX_CLEARANCE ? clearance : undefined;
  } catch {
    return undefined;
  }
}
