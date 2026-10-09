# @wau-captcha/client

Browser SDK of [WAU Captcha](https://waucaptcha.com): a ready-made widget, and a client to build
your own UI. No dependencies.

```bash
npm install @wau-captcha/client
```

## Widget

```js
import { renderWidget } from "@wau-captcha/client";

const widget = renderWidget(document.querySelector("#captcha"), {
  siteKey: "pk_…",
  baseUrl: "https://api.waucaptcha.com",
  // challengeType: ChallengeType.SLIDE_PUZZLE, labels: VI_LABELS, onSuccess, onExpire, onError
});
```

Inside a form, a solved widget puts the token in the hidden field `wau-captcha-token`. Your server
redeems it with [`@wau-captcha/server`](https://www.npmjs.com/package/@wau-captcha/server).

The `<script>` build renders every element with `data-wau-captcha` by itself; pin an exact release
with its integrity hash:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@wau-captcha/client@1.3.0/dist/wau-captcha.global.js"
  integrity="sha384-…"
  crossorigin="anonymous"></script>
<div data-wau-captcha data-site-key="pk_…" data-base-url="https://api.waucaptcha.com" data-lang="vi"></div>
```

## Your own UI

```js
import { WauCaptchaClient } from "@wau-captcha/client";

const captcha = new WauCaptchaClient({ siteKey: "pk_…", baseUrl: "https://api.waucaptcha.com" });
const challenge = await captcha.newChallenge();
// show challenge.imageUrl, record behaviour with recordBehavior, then:
const result = await captcha.verify(challenge.id, answer, { behavior });
```

From 1.3.0 the client sends the site key with every answer, so an answer only counts for the
key whose challenge it solves, and it solves the proof of work each challenge asks for: in the
background, from the moment `newChallenge` returns, in slices that keep the page responsive.
`verify` waits for it and sends it along. Fetch a challenge when it is about to be shown, not ahead
of time: challenges fetched and never answered count against the key. A key that requires behaviour
data refuses answers sent without `behavior` (`ErrorCode.BEHAVIOR_REQUIRED`).

`baseUrl` must be https; plain http is accepted for `localhost`, `127.0.0.1` and `[::1]` only.
A failed call throws `WauCaptchaError`; compare `error.code` with `ErrorCode`, and with
`ErrorCode.RATE_LIMITED` wait `error.retryAfter` seconds.

Documentation: https://waucaptcha.com/docs · Changes: [CHANGELOG.md](https://github.com/wau-captcha/wau-sdk-js/blob/main/CHANGELOG.md) · License: MIT
