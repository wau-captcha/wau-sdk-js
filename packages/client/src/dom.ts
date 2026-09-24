import { WIDGET_STYLES } from "./styles.js";

/** Creates an element with an optional class. */
export function createElement<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className?: string): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** A widget button that never submits the form around it. */
export function createButton(text: string, variant: "primary" | "outline"): HTMLButtonElement {
  const node = createElement("button", "wau-captcha__button");
  node.type = "button";
  node.dataset.variant = variant;
  node.textContent = text;
  return node;
}

/** Adds the stylesheet of the widget to the page, once. */
export function addStyles() {
  if (document.getElementById("wau-captcha-styles")) return;
  const style = createElement("style");
  style.id = "wau-captcha-styles";
  style.textContent = WIDGET_STYLES;
  document.head.append(style);
}
