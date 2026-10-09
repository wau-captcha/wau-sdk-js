// Prints the Subresource Integrity hash of the <script> build of @wau-captcha/client as jsDelivr
// serves it, for the integrity attribute of the CDN snippet. Run it after each release and update
// the dashboard's lib/sdk-cdn.ts with the version and the hash together.
//   node scripts/sri.mjs 1.3.0
import { createHash } from "node:crypto";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("usage: node scripts/sri.mjs <exact version, e.g. 1.3.0>");
  process.exit(1);
}

// The file name of the global build, as scripts/build-package.mjs writes it and the jsdelivr
// field of packages/client/package.json names it.
const url = `https://cdn.jsdelivr.net/npm/@wau-captcha/client@${version}/dist/wau-captcha.global.js`;
const response = await fetch(url);
if (!response.ok) {
  console.error(`${url} answered ${response.status}; is ${version} published?`);
  process.exit(1);
}
const body = Buffer.from(await response.arrayBuffer());
console.log(`sha384-${createHash("sha384").update(body).digest("base64")}`);
