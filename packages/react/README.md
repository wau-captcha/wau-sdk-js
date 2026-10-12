# @wau-captcha/react

`<WauCaptcha />`, the React component of [WAU Captcha](https://waucaptcha.com), for React 18 or
later: inline or in a modal, with the token in your form.

```bash
npm install @wau-captcha/react
```

```jsx
import { WauCaptcha } from "@wau-captcha/react";

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
redeems it with [`@wau-captcha/server`](https://www.npmjs.com/package/@wau-captcha/server).
Props: `mode` (`WauCaptchaMode.INLINE` or `MODAL`), `challengeType`, `theme`, `inputName`,
`labels` (e.g. `VI_LABELS` for Vietnamese), `onSuccess`, `onExpire`, `onError`.

`challengeType` is `ChallengeType.IMAGE_DISTORT` (the default), `MOTION_NOISE`, `SLIDE_PUZZLE`, `ANIMAL_JUMP` or
`OBJECT_ROTATE`. `SLIDE_PUZZLE` and `ANIMAL_JUMP` need a pointer, so keep `IMAGE_DISTORT` where keyboard-only users
must get through; animal_jump plays its rounds from `blob:` URLs, which a Content-Security-Policy must allow in
`img-src`. `OBJECT_ROTATE` asks to turn an object until it faces an arrow, in two rounds, with Rotate left, Rotate
right and Done or with the arrow keys and Enter; it works without a pointer, but needs sight.

Documentation: https://waucaptcha.com/docs · Changes: [CHANGELOG.md](https://github.com/wau-captcha/wau-sdk-js/blob/main/CHANGELOG.md) · License: MIT
