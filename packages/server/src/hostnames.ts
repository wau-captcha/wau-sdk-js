/**
 * Whether `hostname`, the website a token was solved on (VerifyTokenResult.hostname), is one of
 * `allowed`: an array, or a string with commas or white space between the entries, as an
 * environment variable holds them. Each entry is reduced to its host name, so
 * "https://Shop.example.com/", "shop.example.com:443" and "shop.example.com" are the same, and
 * "*.example.com" stands for every subdomain of example.com but not example.com itself. An empty
 * hostname, of a challenge asked for without an origin, or no entries match nothing.
 *
 * @example
 * if (!result.success || !hostnameMatches(result.hostname, process.env.WAU_ALLOWED_HOSTNAMES)) throw new Error("captcha failed");
 */
export function hostnameMatches(hostname: string, allowed: string | readonly string[] | undefined): boolean {
  const host = typeof hostname === "string" ? toHost(hostname) : "";
  if (!host) return false;
  const list = typeof allowed === "string" ? [allowed] : (allowed ?? []);
  return list
    .flatMap((entry) => (typeof entry === "string" ? entry.split(/[\s,]+/) : []))
    .map(toHost)
    .some((pattern) => (pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) : pattern !== "" && host === pattern));
}

/** The host name in a host name, origin or URL: lowercase, without scheme, user, port, path or final dot. */
function toHost(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^[a-z][a-z\d+.-]*:\/\//, "").replace(/^\/\//, "");
  value = value.split(/[/?#]/, 1)[0] ?? "";
  value = value.slice(value.lastIndexOf("@") + 1);
  if (value.startsWith("[")) {
    // An IPv6 address, which the service reports without its brackets.
    const end = value.indexOf("]");
    if (end > 0) value = value.slice(1, end);
  } else if (value.indexOf(":") === value.lastIndexOf(":")) {
    // One colon at most: a port. More are an IPv6 address written without brackets.
    value = value.split(":", 1)[0] ?? "";
  }
  return value.replace(/\.$/, "");
}
