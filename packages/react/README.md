# @waucaptcha-sdk/react

`<WauCaptcha />`, the React component of [WAU Captcha](https://waucaptcha.com), for React 18 or
later: inline or in a modal, with the token in your form.

```bash
npm install @waucaptcha-sdk/react
```

```jsx
import { WauCaptcha } from "@waucaptcha-sdk/react";

export default function SignUpPage() {
  return (
    <form action={signUp}>
      <input name="email" type="email" required />
      <WauCaptcha siteKey="pk_…" baseUrl="https://api.waucaptcha.com" />
      <button type="submit">Sign up</button>
    </form>
  );
}
```

Once solved, the form sends the token in the hidden field `wau-captcha-token`; your server
redeems it with [`@waucaptcha-sdk/server`](https://www.npmjs.com/package/@waucaptcha-sdk/server).
Props: `siteKey` and `baseUrl` (required), `mode` (`WauCaptchaMode.INLINE`, the default, or `MODAL`),
`challengeType`, `fallbackChallengeType` and `appearance` (for auto_check), `theme` (`WauCaptchaTheme.AUTO`, the
default, `LIGHT` or `DARK`), `inputName` (default `"wau-captcha-token"`), `labels` (e.g. `VI_LABELS` for
Vietnamese), `timeoutMs` (per request, default 10 000), `className`, `onSuccess`, `onExpire`, `onError`. To start
over, e.g. after your backend redeemed the token, change the component's `key`.

`mode={WauCaptchaMode.MODAL}` shows, for every type but auto_check, a box like auto_check's: an empty checkbox with
"I'm not a robot" (`labels.notRobot`) and the WAU Captcha mark. The checkbox opens the challenge in a dialog titled
`labels.open`, which loads it only then and closes by itself once the answer is right; the box then shows the check
and "Verified". When the token expires the checkbox is clear again.

`challengeType` is `ChallengeType.IMAGE_DISTORT` (the default), `MOTION_NOISE`, `SLIDE_PUZZLE`, `ANIMAL_JUMP`,
`OBJECT_ROTATE` or `AUTO_CHECK`. `SLIDE_PUZZLE` and `ANIMAL_JUMP` need a pointer, so keep `IMAGE_DISTORT` where keyboard-only users
must get through; animal_jump plays its rounds from `blob:` URLs, which a Content-Security-Policy must allow in
`img-src`. `OBJECT_ROTATE` asks to turn an object until it faces an arrow, in two rounds, with Rotate left, Rotate
right and Done or with the arrow keys and Enter; it works without a pointer, but needs sight.

```jsx
import { Appearance, ChallengeType, WauCaptcha } from "@waucaptcha-sdk/react";

<WauCaptcha
  siteKey="pk_…"
  baseUrl="https://api.waucaptcha.com"
  challengeType={ChallengeType.AUTO_CHECK}
  fallbackChallengeType={ChallengeType.IMAGE_DISTORT}
  appearance={Appearance.INTERACTION_ONLY}
/>
```

`AUTO_CHECK` asks nothing of most visitors: a compact box checks them once it is in view and turns into
"Verified". A visitor it is unsure of gets a challenge of `fallbackChallengeType` (default `SLIDE_PUZZLE`;
`IMAGE_DISTORT` where keyboard-only visitors matter) in its place, without being told why; the service may pick
another fallback the key allows. `appearance` is `Appearance.ALWAYS` (the default) or
`Appearance.INTERACTION_ONLY`, which keeps the captcha hidden unless the fallback or an error must be shown. It always
runs inline, also with `mode={WauCaptchaMode.MODAL}`, and after its token expired it checks again on the visitor's
next click, key press or focus in the page.

A browser that solved a puzzle on your site keeps the clearance the service hands out with the token, in
`localStorage`, and auto_check sends it back with counts of how the mouse moves were made: with it the browser passes
for a while without a puzzle. Your backend sees how a pass was earned in the siteverify `behavior.reasons`, `cleared`
or `first_visit`; refuse `first_visit` for sign-ups, logins and payments.

Documentation: https://waucaptcha.com/docs · Changes: [CHANGELOG.md](https://github.com/wau-captcha/wau-sdk-js/blob/main/CHANGELOG.md) · License: MIT
