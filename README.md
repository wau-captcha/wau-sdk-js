# WAU Captcha JavaScript SDKs

The JavaScript SDKs of [WAU Captcha](https://waucaptcha.com), a hosted CAPTCHA service: show a
challenge in the browser, check how the person solved it, and redeem the one-time token on your
server.

| Package | What it is |
| --- | --- |
| [`@wau-captcha/client`](packages/client) | Browser SDK: a ready-made widget, also as a `<script>` build, and a client for your own UI. |
| [`@wau-captcha/react`](packages/react) | `<WauCaptcha />` for React 18 or later, inline or in a modal. |
| [`@wau-captcha/server`](packages/server) | Node.js 18+ SDK that redeems tokens with your secret key. |

None of them has a runtime dependency; React is a peer dependency of `@wau-captcha/react`.

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
  src="https://cdn.jsdelivr.net/npm/@wau-captcha/client@1.4.0/dist/wau-captcha.global.js"
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

The documentation is at https://waucaptcha.com/docs.

## Verify the package

From 1.3.0 on, every release is built and published by the `publish` workflow of this repository
with [npm provenance](https://docs.npmjs.com/generating-provenance-statements): the package page on
npmjs.com links the commit and the workflow run. After installing, check it with:

```bash
npm audit signatures
```

## Develop

```bash
npm ci
npm run typecheck
npm run build
npm test
```

The changes of each release are in [CHANGELOG.md](CHANGELOG.md).

## Security

Please report vulnerabilities privately, as [SECURITY.md](SECURITY.md) explains, not in a public
issue.

## License

[MIT](LICENSE)
