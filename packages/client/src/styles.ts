/*
 * The look of the widget, shared by renderWidget and <WauCaptcha /> from @waucaptcha-sdk/react.
 * Colors follow the color-scheme of the page through light-dark(); each one can be overridden
 * with a --wau-captcha-* custom property on the widget or any ancestor, e.g.
 * `--wau-captcha-primary: #0a7`. The logo tile of auto_check is the exception: a logo keeps the
 * colours of the brand, purple on light and lime on dark. The .wau-captcha__trigger rules stay for
 * <WauCaptcha /> before 1.7.0, whose MODAL mode opened the dialog from a button.
 */
export const WIDGET_STYLES = `
.wau-captcha{
--_background:var(--wau-captcha-background,light-dark(#fff,#080d0f));
--_foreground:var(--wau-captcha-foreground,light-dark(#03080a,#fcfcfe));
--_muted-foreground:var(--wau-captcha-muted-foreground,light-dark(#03080ab0,#fcfcfea0));
--_muted:var(--wau-captcha-muted,light-dark(#03080a08,#fcfcfe08));
--_border:var(--wau-captcha-border,light-dark(#03080a14,#fcfcfe14));
--_primary:var(--wau-captcha-primary,light-dark(#7624f4,#c8ff00));
--_primary-foreground:var(--wau-captcha-primary-foreground,light-dark(#fcfcfe,#03080a));
--_positive:var(--wau-captcha-positive,light-dark(#007544,#34dfaa));
--_negative:var(--wau-captcha-negative,light-dark(#bf0024,#ff2d55));
--_focus-border:light-dark(#03080a4d,#fcfcfe4d);
--_focus-ring:light-dark(#03080a0f,#fcfcfe0f);
display:grid;gap:8px;box-sizing:border-box;width:100%;max-width:320px;
color:var(--_foreground);font:inherit;font-size:14px;line-height:1.5}
.wau-captcha [hidden]{display:none}
.wau-captcha[data-theme=light]{color-scheme:light}
.wau-captcha[data-theme=dark]{color-scheme:dark}
.wau-captcha__panel{display:grid;gap:12px;padding:12px;border:1px solid var(--_border);border-radius:8px;background:var(--_background)}
.wau-captcha__image{display:block;box-sizing:border-box;width:100%;height:auto;border-radius:6px;background:var(--_muted)}
.wau-captcha__puzzle{position:relative;user-select:none;-webkit-user-select:none}
.wau-captcha__piece{position:absolute;display:block;height:auto;pointer-events:none}
.wau-captcha__track{position:relative;height:40px;border-radius:6px;background:var(--_muted);box-shadow:inset 0 0 0 1px var(--_border);
touch-action:none;user-select:none;-webkit-user-select:none}
.wau-captcha__track-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 8px 0 calc(20% + 8px);
color:var(--_muted-foreground);font-size:13px;line-height:1.25;text-align:center;pointer-events:none}
.wau-captcha__handle{position:absolute;top:0;left:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:17%;height:100%;
margin:0;padding:0;border:0;border-radius:6px;background:var(--_primary);color:var(--_primary-foreground);cursor:grab;touch-action:none;outline:none;
transition:box-shadow .15s,opacity .15s}
.wau-captcha__handle:active:enabled{cursor:grabbing}
.wau-captcha__handle:focus-visible{box-shadow:0 0 0 1px var(--_focus-border),0 0 0 4px var(--_focus-ring)}
.wau-captcha__handle:disabled{cursor:default;opacity:.5}
.wau-captcha__jump{position:relative;overflow:hidden;border-radius:6px;background:var(--_muted);user-select:none;-webkit-user-select:none}
.wau-captcha__jump-screen{position:absolute;inset:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.wau-captcha__jump-screen img{position:absolute;inset:0;display:block;width:100%;height:100%;-webkit-touch-callout:none}
.wau-captcha__round{position:absolute;top:6px;left:6px;padding:0 6px;border-radius:9px;background:rgb(0 0 0/.55);color:#fff;
font-size:12px;font-weight:500;line-height:18px;pointer-events:none}
.wau-captcha__ring{position:absolute;box-sizing:border-box;width:24px;height:24px;border:2px solid #fff;border-radius:50%;
box-shadow:0 0 0 2px var(--_primary);transform:translate(-50%,-50%);pointer-events:none}
.wau-captcha__jump-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:500;line-height:1.25}
.wau-captcha__task{margin:0;font-weight:500;line-height:1.25}
.wau-captcha__rotate{position:relative;overflow:hidden;border-radius:6px;background:var(--_muted);user-select:none;-webkit-user-select:none}
.wau-captcha__rotate-frame{position:absolute;inset:0;border-radius:6px;background-repeat:no-repeat;outline:none}
.wau-captcha__rotate-frame:focus-visible{box-shadow:inset 0 0 0 2px var(--_primary)}
.wau-captcha__rotate-bar{display:flex;gap:8px}
.wau-captcha__turn{font-size:20px;line-height:1}
.wau-captcha__auto{display:flex;align-items:center;gap:10px;min-height:38px;line-height:1.25}
.wau-captcha__auto>.wau-captcha__icon{width:22px;height:22px;color:var(--_primary)}
.wau-captcha__auto[data-tone=positive]{color:var(--_positive);font-weight:500}
.wau-captcha__auto[data-tone=positive]>.wau-captcha__icon{color:inherit}
.wau-captcha__auto-text{flex:1;min-width:0}
.wau-captcha__check{display:flex;flex:1;align-items:center;gap:10px;min-width:0;margin:0;padding:0;border:0;background:none;color:inherit;
font:inherit;line-height:1.25;text-align:left;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}
.wau-captcha__check[aria-checked=true]{cursor:default}
.wau-captcha__check>.wau-captcha__icon{width:22px;height:22px}
.wau-captcha__check-box{flex-shrink:0;box-sizing:border-box;width:22px;height:22px;border:2px solid color-mix(in srgb,var(--_foreground) 35%,transparent);
border-radius:5px;background:var(--_background);transition:border-color .15s,box-shadow .15s}
.wau-captcha__check:hover .wau-captcha__check-box{border-color:var(--_primary)}
.wau-captcha__check:focus-visible .wau-captcha__check-box{border-color:var(--_primary);box-shadow:0 0 0 3px var(--_focus-ring)}
.wau-captcha__mark{display:grid;justify-items:center;gap:3px;flex-shrink:0;color:var(--_muted-foreground);font-size:10px;font-weight:600;
line-height:1;white-space:nowrap}
.wau-captcha__mark-tile{display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;
background:light-dark(#7624f4,#c8ff00);color:light-dark(#fcfcfe,#03080a)}
.wau-captcha__mark-tile .wau-captcha__icon{width:12px;height:12px}
.wau-captcha__field{display:grid;gap:6px;font-weight:500}
.wau-captcha__input{box-sizing:border-box;width:100%;height:40px;margin:0;padding:0 12px;border:1px solid var(--_border);border-radius:6px;
background:transparent;color:inherit;font:inherit;font-weight:450;outline:none;transition:border-color .15s,box-shadow .15s,opacity .15s}
.wau-captcha__input:read-only{opacity:.6}
.wau-captcha__actions{display:flex;gap:8px}
.wau-captcha__button,.wau-captcha__trigger{display:inline-flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;
height:40px;margin:0;padding:0 16px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;
font:inherit;font-weight:500;line-height:1.25;cursor:pointer;outline:none;transition:background-color .15s,border-color .15s,box-shadow .15s,opacity .15s}
.wau-captcha__input:focus,.wau-captcha__button:focus-visible,.wau-captcha__trigger:focus-visible{border-color:var(--_focus-border);box-shadow:0 0 0 3px var(--_focus-ring)}
.wau-captcha__button:disabled{cursor:default;opacity:.5}
.wau-captcha__button[data-variant=primary]{flex:1;background:var(--_primary);color:var(--_primary-foreground)}
.wau-captcha__button[data-variant=primary]:hover:enabled{background:color-mix(in srgb,var(--_primary) 88%,transparent)}
.wau-captcha__button[data-variant=outline]{border-color:var(--_border)}
.wau-captcha__button[data-variant=ghost]{color:var(--_muted-foreground)}
.wau-captcha__button:is([data-variant=outline],[data-variant=ghost]):hover:enabled{background:var(--_muted);color:var(--_foreground)}
.wau-captcha__button[data-size=icon]{width:40px;padding:0}
.wau-captcha__button[data-size=icon-sm]{width:32px;height:32px;padding:0}
.wau-captcha__button[data-size=sm]{flex-shrink:0;gap:6px;height:32px;padding:0 12px}
.wau-captcha__trigger{justify-content:flex-start;width:100%;border-color:var(--_border);background:var(--_background)}
.wau-captcha__trigger:hover:enabled{background:var(--_muted)}
.wau-captcha__trigger:disabled{cursor:default;color:var(--_positive)}
.wau-captcha__status{display:flex;align-items:center;gap:6px;margin:0;min-height:20px;color:var(--_muted-foreground);font-size:13px}
.wau-captcha__status:empty{display:none}
.wau-captcha__status[data-tone=negative]{color:var(--_negative)}
.wau-captcha__status[data-tone=positive]{color:var(--_positive);font-size:14px;font-weight:500}
.wau-captcha__icon{width:16px;height:16px;flex-shrink:0}
.wau-captcha__spinner{animation:wau-captcha-spin 1s linear infinite}
@keyframes wau-captcha-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.wau-captcha__spinner{animation:none}}
.wau-captcha__dialog{box-sizing:border-box;width:min(360px,calc(100vw - 32px));max-width:none;max-height:calc(100dvh - 32px);margin:auto;padding:0;
border:1px solid var(--_border);border-radius:8px;background:var(--_background);color:var(--_foreground);box-shadow:0 16px 48px rgb(0 0 0/.24);overflow:auto}
.wau-captcha__dialog::backdrop{background:rgb(0 0 0/.5)}
.wau-captcha__dialog-body{display:grid;gap:12px;padding:16px}
.wau-captcha__dialog-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 -8px 0 0;font-size:16px;font-weight:600}
.wau-captcha__dialog .wau-captcha__panel{padding:0;border:0;background:none}
@media (pointer:coarse){.wau-captcha__input{font-size:16px}}
`;
