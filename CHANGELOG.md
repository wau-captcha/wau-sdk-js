# Changelog

Every release of the three packages, newest first. Versions follow [Semantic Versioning](https://semver.org/).

## @waucaptcha-sdk/client 1.7.2

- object_rotate asks "Turn the object to face the way the arrow points" in English, where it asked to "face the arrow":
  the service now draws the arrow in a panel of its own beside the object, and the old words read as "turn it
  towards that panel". The Vietnamese text is unchanged. The comments describe the two panels.

## @waucaptcha-sdk/react 1.6.2

- Depends on `@waucaptcha-sdk/client` ^1.7.2, for the new object_rotate prompt.

## @waucaptcha-sdk/server 1.7.1

- The comments of `ChallengeType` describe object_rotate's two panels, the arrow on the left and the object on the right.

## @waucaptcha-sdk/server 1.7.0

- `hostnameMatches(result.hostname, allowed)`: whether the website a token was solved on is one of yours. `allowed`
  is an array or a string with commas or white space between the entries, such as an environment variable, and each
  entry is reduced to its host name: `https://Shop.example.com/`, `shop.example.com:443` and `shop.example.com` are
  the same, and `*.example.com` stands for every subdomain of example.com but not example.com itself. An empty
  hostname, or no entries, never match. Use it instead of `result.hostname !== "shop.example.com"`, which refuses
  every token once the domain is written with `https://` or a port.

## @waucaptcha-sdk/client 1.7.1

- The auto_check box shows the WAU Captcha logo, the W on its app tile, where it showed a shield. The tile keeps the
  colours of the brand, purple on light and lime on dark, whatever `--wau-captcha-primary` says.

## @waucaptcha-sdk/react 1.6.1

- Depends on `@waucaptcha-sdk/client` ^1.7.1. The auto_check box of `<WauCaptcha />` shows the WAU Captcha logo
  instead of the shield.

## New package names (2026-10-17)

- The packages are now published as `@waucaptcha-sdk/client`, `@waucaptcha-sdk/react` and `@waucaptcha-sdk/server`,
  starting at client 1.7.0, react 1.6.0 and server 1.6.0, with the same code as the last `@wau-captcha` releases.
- To move, replace `@wau-captcha/` with `@waucaptcha-sdk/` in `package.json` and in your imports.
- The `@wau-captcha` packages stay on npm and keep working, but get no further releases.

## @wau-captcha/client 1.7.0

- auto_check clearances. A puzzle solved comes with a clearance from the service: `verify` keeps it in
  `localStorage` under `wau-captcha:clearance:<siteKey>` (a private window or blocked storage just means none) and
  `verifyAuto` sends it back in the auto_check answer as `c`, so a browser that solved a puzzle on a site passes
  auto_check there without one for a while (on the hosted service 7 days, 6 automatic passes an hour and 24 a day). It
  goes nowhere else, never to your backend, and nothing the package exports reads it. `AutoProbe.clearance` sends
  another one instead.
- Pointer counts. `recordBehavior` with `page: true` also counts how the trusted mouse moves were made, before it thins
  them out, and the recorder's new `pointerSummary()` returns them as a `PointerSummary`, `{ n, k, z, s }`: the moves,
  those coalesced with others (`-1` without `getCoalescedEvents`), those without movement although the position
  changed, and those within 1 ms of the most common gap between moves. Counts only, no positions or times.
  `verifyAuto` sends them as `m` when a move was counted (`AutoProbe.pointer`); the widget does it by itself.
- Your backend sees how an auto_check pass was earned in the siteverify `behavior.reasons`: `cleared` (a clearance) or
  `first_visit` (no clearance, on the signals alone, where the service allows it). Refuse `first_visit` for sign-ups,
  logins and payments. `@wau-captcha/server` passes the reasons through as they are.
- Answers of 1.6.0 and older still work: they carry neither field and are judged as before.

## @wau-captcha/react 1.6.0

- Depends on `@wau-captcha/client` ^1.7.0. `<WauCaptcha />` keeps the clearance of a solved puzzle and sends it, with the
  pointer counts, in its auto_check answers.

## @wau-captcha/client 1.6.0

- A new challenge type, `ChallengeType.AUTO_CHECK` (`auto_check`), like Cloudflare Turnstile without its checkbox:
  once the widget comes into view, a compact box says "Checking that you are human…" while the SDK solves a harder
  proof of work, probes the browser and records the behaviour on the whole page; at least 1.5 s after the challenge
  arrived it sends what it found. Most visitors then see "Verified" and get a token without doing anything. A visitor
  the service is unsure of is never told why: a challenge of the fallback type takes the place of the box ("One more
  step: please solve this challenge.") and every challenge after it is of that type until the visitor passes. Without
  a type to fall back to, the widget reports `CHALLENGE_TYPE_NOT_ALLOWED`. When its token expires unused, auto_check
  checks again on the visitor's next click, key press or focus in the page, never by itself, since every pass counts
  against the key.
- Widget options `fallbackChallengeType` (default `SLIDE_PUZZLE`; `IMAGE_DISTORT` where keyboard-only visitors
  matter) and `appearance`: `Appearance.ALWAYS` (default) or `Appearance.INTERACTION_ONLY`, which keeps the widget
  hidden while it checks and once it passed. The `<script>` build reads them from `data-fallback-type` and
  `data-appearance`.
- `newChallenge` takes `fallbackType`, sent as `fallback_type` for auto_check only, and `Challenge.fallbackType`
  (from `fallback_type`) names the type the service chose; a challenge without an image has `imageUrl: ""`.
  `verifyAuto(challengeId, probe, options)` sends the `AutoProbe` that `probeBrowser()` gathers: `navigator.userAgent`
  (512 characters at most), `navigator.language` and the names of the checks that tripped, out of `patched_natives`,
  `outer_zero`, `software_gl`, `notification_mismatch`, `touch_mismatch`, `no_hardware` and `no_plugins`. No
  fingerprint, canvas or WebGL output, fonts or plugins leave the page. `workDone(challengeId)` resolves once the
  proof of work of a challenge is done.
- `recordBehavior` takes `page: true`, which records the presses of the pointer anywhere on the page, still measured
  from the widget.
- New labels `autoChecking` and `autoFallback`, in English (`DEFAULT_LABELS`) and Vietnamese (`VI_LABELS`).

## @wau-captcha/server 1.6.0

- `ChallengeType.AUTO_CHECK`: `verifyToken` returns `challengeType: "auto_check"` for a visitor who passed without a
  puzzle, and the fallback's type for one who solved the fallback. For sign-ups, logins or payments, require
  `behavior.score` at or above a threshold of your own.

## @wau-captcha/react 1.5.0

- Depends on `@wau-captcha/client` ^1.6.0. `<WauCaptcha challengeType={ChallengeType.AUTO_CHECK} />` shows the
  compact box once it is in view, then the panel of the fallback type if the check does not pass, with the new props
  `fallbackChallengeType` and `appearance`; `Appearance` is exported. auto_check always runs inline, also in `MODAL`
  mode. The labels gain `autoChecking` and `autoFallback`.

## @wau-captcha/client 1.5.0

- A new challenge type, `ChallengeType.OBJECT_ROTATE` (`object_rotate`): in each of two rounds an object stands beside
  an arrow on the ground, and the person turns it a frame at a time until it faces the arrow, then presses Done. The
  widget shows the task above the image, a `1/2`, `2/2` counter, and Rotate left (↺), Rotate right (↻) and Done; on
  the focused image ArrowLeft and ArrowRight turn the object and Enter is Done. Done waits for a first press, presses
  past 24 a round are ignored, and nothing is said between the rounds. It works with a pointer or the keyboard, and
  the key presses count in the behaviour data; it needs sight.
- `Challenge.frameCount` (from `frame_count`): `imageUrl` and `secondImage` are each a strip of that many frames side
  by side. `verifyRotate(challengeId, rounds, options)` with the `RotateRound` and `RotatePress` types, and
  `trackRotate`, which shows the frames and records the presses for your own UI.
- New labels `rotatePrompt`, `rotateLeft`, `rotateRight` and `rotateDone`, in English (`DEFAULT_LABELS`) and
  Vietnamese (`VI_LABELS`).
- `recordBehavior`'s `input` takes any element whose key presses are timed, not only an `<input>`.

## @wau-captcha/server 1.5.0

- `ChallengeType.OBJECT_ROTATE`: `verifyToken` returns `challengeType: "object_rotate"` for the tokens of that type.

## @wau-captcha/react 1.4.0

- Depends on `@wau-captcha/client` ^1.5.0. `<WauCaptcha challengeType={ChallengeType.OBJECT_ROTATE} />` shows the two
  rounds with Rotate left, Rotate right and Done, which turns into the spinner while the answer is checked. The labels
  gain `rotatePrompt`, `rotateLeft`, `rotateRight` and `rotateDone`.

## @wau-captcha/client 1.4.0

- A new challenge type, `ChallengeType.ANIMAL_JUMP` (`animal_jump`): two rounds of 2 s in which five animal heads jump;
  in each, the person clicks the one that jumps highest. The widget plays each round once with a `1/2`, `2/2` counter
  and a Replay button (three replays a round), marks each click with a ring for 250 ms and submits both clicks after
  round 2. Nothing is said between the rounds, so a script cannot learn which one it got wrong. Like `SLIDE_PUZZLE` it
  needs a pointer: where accessibility matters, keep `IMAGE_DISTORT` available.
- `Challenge.secondImage` (round 2; `imageUrl` is round 1), `verifyJump(challengeId, clicks, options)` with the
  `JumpClick` type, and `trackJump`, which plays the rounds and records the clicks for your own UI.
- New labels `jumpPrompt` and `replay`, in English (`DEFAULT_LABELS`) and Vietnamese (`VI_LABELS`).
- Each playback of a round is a `blob:` object URL, so that every browser starts it from the first frame: a
  Content-Security-Policy that limits `img-src` must allow `blob:` as well as `data:`.

## @wau-captcha/server 1.4.0

- `ChallengeType.ANIMAL_JUMP`: `verifyToken` returns `challengeType: "animal_jump"` for the tokens of that type.

## @wau-captcha/react 1.3.0

- Depends on `@wau-captcha/client` ^1.4.0. `<WauCaptcha challengeType={ChallengeType.ANIMAL_JUMP} />` shows the two
  rounds with the Replay button, which turns into the spinner while the answer is checked. The labels gain `jumpPrompt`
  and `replay`.

## @wau-captcha/client 1.3.0

- Sends the site key with every answer (`site_key`): an answer only counts for the key whose challenge it solves.
- Solves the proof of work of each challenge (`pow_salt`, `pow_difficulty` of `/challenge/new`) and sends it as
  `pow_nonce`. It starts as soon as `newChallenge` returns and runs in slices of a few milliseconds, so the page stays
  responsive; at the default difficulty of 15 it took 37 ms (median) in desktop Chrome and 162 ms (median, 573 ms at
  worst) with the CPU throttled four times, like a mid-range phone. Answers from older clients go without it and are
  judged at most `suspicious`. New exports: `sha256`, `solvePow`, `leadingZeroBits`, and `pow` on
  `Challenge`; `VerifyOptions.powNonce` for challenges fetched without `newChallenge`.
- Behaviour data carries three hints about the browser: `headless_ua`, `no_languages` and
  `chrome_without_window_chrome` (Android WebView is left out of the last). They only lower the score.
- New error codes: `DOMAIN_NOT_ALLOWED` (the website is not in the allowed domains of the key), `BEHAVIOR_REQUIRED`
  (the key requires behaviour data), `CHALLENGE_ID_INVALID`, `PAYLOAD_TOO_LARGE` and `INTERNAL`.
- `baseUrl` must be https; plain http is accepted for `localhost`, `127.0.0.1` and `[::1]` only. Anything else throws a
  `TypeError`.
- `WauCaptchaError.retryAfter` gives the seconds a `RATE_LIMITED` reply asks to wait, from its metadata or its
  `Retry-After` header. The widget says "Too many attempts. Try again in N s." instead of a bare error code.
- Vietnamese texts: `VI_LABELS`, or `data-lang="vi"` on the element the `<script>` build renders.
- Published from GitHub Actions with npm provenance; `node scripts/sri.mjs <version>` prints the integrity hash of the
  `<script>` build.

## @wau-captcha/server 1.3.0

- Sends the token in the JSON body of `POST /siteverify` instead of the query string, so it stays out of access logs.
  The service still accepts the query string from 1.2.0 and earlier.
- `hostname` on a successful result: the host name of the website the challenge was solved on. Compare it with your own
  domain; a script outside a browser can forge it.
- `baseUrl` must be https; plain http is accepted for `localhost`, `127.0.0.1` and `[::1]` only.
- `WauCaptchaError.retryAfter` with `RATE_LIMITED`; new error codes `PAYLOAD_TOO_LARGE` and `INTERNAL`.
- `BehaviorVerdict` documents what to do with each verdict: refuse `not_measured` (the client sent no behaviour data),
  decide about `suspicious` per form and refuse it for sign-up and login.
- Published from GitHub Actions with npm provenance.

## @wau-captcha/react 1.2.0

- Depends on `@wau-captcha/client` ^1.3.0, so `<WauCaptcha />` sends the site key, the proof of work and the browser
  hints without any change on your side.
- Exports `DEFAULT_LABELS` and `VI_LABELS` (Vietnamese texts); a `RATE_LIMITED` reply shows how many seconds to wait.
- Published from GitHub Actions with npm provenance.

## Earlier releases

This file starts with the releases above. Before them, @wau-captcha/client and @wau-captcha/server 1.2.0 added the
behaviour check (`recordBehavior`, the `behavior` of `verifyToken`), and earlier versions added slide_puzzle.
