/** Creates an element with an optional class and inline style. */
export function element<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className?: string, style?: string): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (style) node.style.cssText = style;
  return node;
}

/** A plain button that never submits the form around it. */
export function button(text: string, className: string): HTMLButtonElement {
  const node = element("button", className, "padding:6px 12px;border:1px solid #c7c7c7;border-radius:6px;background:#fff;font:inherit;cursor:pointer");
  node.type = "button";
  node.textContent = text;
  return node;
}
