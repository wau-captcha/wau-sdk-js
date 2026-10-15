# WAU Captcha JavaScript SDKs

The JavaScript SDKs of [WAU Captcha](https://waucaptcha.com), a hosted CAPTCHA service: show a
challenge in the browser, check how the person solved it, and redeem the one-time token on your
server.

| Package | What it is |
| --- | --- |
| [`@wau-captcha/client`](packages/client) | Browser SDK: a ready-made widget, also as a `<script>` build, and a client for your own UI. |
| [`@wau-captcha/react`](packages/react) | `<WauCaptcha />` for React 18 or later, inline or in a modal. |
| [`@wau-captcha/server`](packages/server) | Node.js 18+ SDK that redeems tokens with your secret key. |

`@wau-captcha/client` and `@wau-captcha/server` have no runtime dependency. `@wau-captcha/react`
depends on `@wau-captcha/client`, and React is its peer dependency.

The widgets support every challenge type: `image_distort` (the default), `motion_noise`,
`slide_puzzle`, `animal_jump`, `object_rotate` and `auto_check`. The package READMEs list the
options of each.

## Install

```bash
npm install @wau-captcha/client   # or @wau-captcha/react
npm install @wau-captcha/server
```

## A minimal integration

In the page, with a bundler:

```js
import { renderWidget } from "@wau-captcha/client";

renderWidget(document.querySelector("#captcha"), {
  siteKey: "pk_…",
  baseUrl: "https://api.waucaptcha.com",
});
```

Or with the `<script>` build, pinned to an exact release and its integrity hash
(`node scripts/sri.mjs <version>` prints the hash):

```html
<script
  src="https://cdn.jsdelivr.net/npm/@wau-captcha/client@1.7.0/dist/wau-captcha.global.js"
  integrity="sha384-…"
  crossorigin="anonymous"></script>

<form action="/signup" method="post">
  <div data-wau-captcha data-site-key="pk_…" data-base-url="https://api.waucaptcha.com"></div>
  <button type="submit">Sign up</button>
</form>
```

Once solved, the form sends the token in the hidden field `wau-captcha-token`. On your server:

```js
import { BehaviorVerdict, WauCaptchaServer } from "@wau-captcha/server";

const wau = new WauCaptchaServer({ secretKey: process.env.WAU_SECRET_KEY, baseUrl: "https://api.waucaptcha.com" });

const result = await wau.verifyToken(req.body["wau-captcha-token"]);
if (!result.success || result.hostname !== "shop.example.com") throw new Error("captcha failed");
// not_measured: the client sent no behaviour data; treat it as untrusted.
if (result.behavior.verdict !== BehaviorVerdict.HUMAN) throw new Error("please try again");
```

With `auto_check`, `result.behavior.reasons` says how a pass without a puzzle was earned: `cleared`, by a browser
that solved a puzzle on your site before, or `first_visit`, on its signals alone. Refuse `first_visit` for sign-ups,
logins and payments, and show a puzzle there instead, e.g. `challengeType: ChallengeType.SLIDE_PUZZLE` on those forms.

The documentation is at https://waucaptcha.com/docs.

## Verify the package

From 1.3.0 on, every release is built and published by the `publish` workflow of this repository
with [npm provenance](https://docs.npmjs.com/generating-provenance-statements): the package page on
npmjs.com links the commit and the workflow run. After installing, check it with:

```bash
npm audit signatures
```

## Development

Node.js 18 or later (CI runs 18, 22 and 24).

```bash
npm ci              # install the workspaces
npm run typecheck   # tsc over every package
npm run build       # each package into its dist/: ESM, CommonJS and types; the client also its <script> build
npm test            # node scripts/test.mjs
```

`npm test` runs `scripts/test.mjs`: it bundles each `packages/*/test/*.test.mjs` with esbuild, so a
test can import the TypeScript sources, and runs them with `node --test`. The client and server have
tests; `@wau-captcha/react` has none. `npm run pack:dry` and `npm run publish:dry` show what would be
published.

The changes of each release are in [CHANGELOG.md](CHANGELOG.md).

### Release

1. Bump `version` in each changed `packages/*/package.json`. When `@wau-captcha/react` needs the new
   client, raise its `@wau-captcha/client` range too. Run `npm install` so `package-lock.json`
   follows, update the CDN version in the READMEs, and describe the changes in `CHANGELOG.md`.
2. Once that is merged, run the `publish` workflow (Actions, publish, Run workflow). It typechecks,
   builds and tests, then publishes in dependency order: `@wau-captcha/client` first, because react
   depends on it, then `@wau-captcha/server`, then `@wau-captcha/react`, with provenance through npm
   Trusted Publishing. Versions already on npm are skipped, so it can run again after a partial
   failure. The root `release` script publishes from your own machine, without provenance.
3. Print the integrity hash of the new client's `<script>` build as jsDelivr serves it:

   ```bash
   node scripts/sri.mjs <version>
   ```

4. In wau-dashboard, set `CLIENT_CDN_VERSION` and `CLIENT_CDN_INTEGRITY` in `lib/sdk-cdn.ts` to that
   version and hash.

A version published to npm can never be published again, not even after an unpublish: a broken
release needs a new version number.

## Security

Please report vulnerabilities privately, as [SECURITY.md](SECURITY.md) explains, not in a public
issue.

## License

[MIT](LICENSE)
