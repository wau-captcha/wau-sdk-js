/** Hosts that may be called over plain http, for local development. */
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

/**
 * The service address without trailing slashes. It must be https, so tokens and secret keys are
 * never sent in clear text; http is only allowed for localhost, 127.0.0.1 and [::1]. Anything else
 * is a TypeError. The same rule as normalizeBaseUrl of @waucaptcha-sdk/client: keep the two in step.
 */
export function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (typeof baseUrl !== "string" || !baseUrl.trim()) throw new TypeError("baseUrl is required, e.g. https://api.waucaptcha.com");
  const address = baseUrl.trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new TypeError(`baseUrl is not a URL: ${address}`);
  }
  const local = url.protocol === "http:" && LOCAL_HOSTS.includes(url.hostname);
  if (url.protocol !== "https:" && !local) {
    throw new TypeError(
      "baseUrl must start with https:// so the token and secret key are never sent in clear text " +
        "(http:// only for localhost, 127.0.0.1 or [::1])",
    );
  }
  return address;
}
