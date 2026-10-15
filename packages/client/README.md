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
  // challengeType: ChallengeType.ANIMAL_JUMP, labels: VI_LABELS, inputName, timeoutMs, onSuccess, onExpire, onError
});
```

`renderWidget` returns a handle: `refresh()` loads a new challenge, `getToken()` gives the token while it is
valid, and `destroy()` removes the widget. `challengeType` defaults to `ChallengeType.IMAGE_DISTORT`, `inputName`
to `"wau-captcha-token"` and `timeoutMs`, per request, to 10 000.

```js
import { Appearance, ChallengeType, renderWidget } from "@wau-captcha/client";

renderWidget(document.querySelector("#captcha"), {
  siteKey: "pk_…",
  baseUrl: "https://api.waucaptcha.com",
  challengeType: ChallengeType.AUTO_CHECK,
  fallbackChallengeType: ChallengeType.IMAGE_DISTORT,
  appearance: Appearance.INTERACTION_ONLY,
});
```

With `challengeType: ChallengeType.AUTO_CHECK` most visitors have nothing to do: a compact box says it is checking
them once it comes into view, and turns into "Verified". When the check does not let a visitor through, a challenge
of `fallbackChallengeType` (default `SLIDE_PUZZLE`; `IMAGE_DISTORT` where keyboard-only visitors matter) takes its
place, and the visitor is not told why. The service may pick another fallback the key allows. `appearance` is
`Appearance.ALWAYS` (the default) or `Appearance.INTERACTION_ONLY`, which keeps the widget hidden unless the
fallback or an error must be shown. When its token expires unused, auto_check checks again on the visitor's next
click, key press or focus in the page rather than by itself: every pass counts against the key.

A browser that solved a puzzle on your site keeps the clearance the service hands out with the token, in
`localStorage` under `wau-captcha:clearance:<siteKey>`, and auto_check sends it back: it lets that browser pass for a
while without a puzzle (on the hosted service 7 days, 6 passes an hour and 24 a day). A private window, cleared site
data or a browser update means one more puzzle. Your backend sees how a pass was earned in the siteverify
`behavior.reasons`, `cleared` or `first_visit`; refuse `first_visit` for sign-ups, logins and payments.

Inside a form, a solved widget puts the token in the hidden field `wau-captcha-token`. Your server
redeems it with [`@wau-captcha/server`](https://www.npmjs.com/package/@wau-captcha/server).

The `<script>` build renders every element with `data-wau-captcha` by itself; pin an exact release
with its integrity hash:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@wau-captcha/client@1.7.0/dist/wau-captcha.global.js"
  integrity="sha384-…"
  crossorigin="anonymous"></script>
<div data-wau-captcha data-site-key="pk_…" data-base-url="https://api.waucaptcha.com" data-lang="vi"></div>
```

The element also takes `data-challenge-type` (an API name such as `auto_check`), for auto_check
`data-fallback-type` and `data-appearance` (`always` or `interaction-only`), `data-input-name` for the hidden
field, and `data-lang="vi"` for Vietnamese texts (English otherwise). The build exposes `window.WauCaptcha`;
`WauCaptcha.autoRender()` renders elements added after the page loaded.

## Your own UI

```js
import { recordBehavior, WauCaptchaClient } from "@wau-captcha/client";

const captcha = new WauCaptchaClient({ siteKey: "pk_…", baseUrl: "https://api.waucaptcha.com" });
const challenge = await captcha.newChallenge();
// Show challenge.imageUrl in an <img> inside your widget element, and record while it is on screen:
const recorder = recordBehavior({ root: widgetElement, input: answerInput });
// once the person has typed the text:
const result = await captcha.verify(challenge.id, answerInput.value, { behavior: recorder.snapshot() });
recorder.stop();
if (result.success) result.token; // send it to your server, which redeems it before result.expiresAt
```

The client also takes `challengeType` (the type `newChallenge()` asks for when it names none, default
`IMAGE_DISTORT`), `timeoutMs` (per request, default 10 000) and `fetch`.

The challenge types are `ChallengeType.IMAGE_DISTORT` (the default), `MOTION_NOISE`, `SLIDE_PUZZLE`,
`ANIMAL_JUMP`, `OBJECT_ROTATE` and `AUTO_CHECK`. For slide_puzzle and animal_jump, `trackSlide` and `trackJump` record the drag
and the clicks the way the service checks them, and `verifySlide` and `verifyJump` send them. Both need a pointer,
so keyboard-only users cannot solve them: where accessibility matters, keep `IMAGE_DISTORT` available. animal_jump
plays each round from a `blob:` URL: a Content-Security-Policy that limits `img-src` must allow `blob:` as well as
`data:`.

object_rotate shows two rounds, each a strip of `challenge.frameCount` frames of `width` × `height` side by side
(`imageUrl`, then `secondImage`): an object beside an arrow on the ground, which the person turns a frame at a time
until it faces the arrow. `trackRotate` shows a frame of the strip as the background of an element and returns
`rotate(1)` (Rotate right), `rotate(-1)` (Rotate left) and `done()` for your controls; it records the presses the
way the service checks them, and `verifyRotate` sends them. The widget also takes the arrow keys and Enter on the
image, so object_rotate works with a pointer or the keyboard, but needs sight.

auto_check has no image (`imageUrl` is `""`) and a harder proof of work. Ask for it with
`newChallenge({ challengeType: ChallengeType.AUTO_CHECK, fallbackType })`, record with `recordBehavior({ root,
page: true })` (the presses anywhere on the page count, measured from the widget), run `probeBrowser()`, and once
`workDone(challenge.id)` has resolved and at least 1.5 s have passed since the challenge arrived, send the probe with
`verifyAuto(challenge.id, { ...probe, pointer: recorder.pointerSummary() }, { behavior: recorder.snapshot() })`.
`success: false` means: show a challenge of `challenge.fallbackType` (`""` when the key allows none). The probe holds
`navigator.userAgent`, `navigator.language` and the names of the checks that tripped, such as `outer_zero`, and
`pointerSummary()` counts how the mouse moves were made, without positions or times; nothing else about the browser
leaves the page. `verifyAuto` adds the clearance the browser keeps for the site by itself.

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
