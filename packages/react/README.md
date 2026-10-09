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

Documentation: https://waucaptcha.com/docs · Changes: [CHANGELOG.md](https://github.com/wau-captcha/wau-sdk-js/blob/main/CHANGELOG.md) · License: MIT
