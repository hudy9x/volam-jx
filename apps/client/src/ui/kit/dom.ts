/** Element by id (the interface keeps the original ids, so the CSS can target them). */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Add the HTML at the end of `parent`; returns the first new element. */
export function mount(parent: HTMLElement, html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  const first = t.content.firstElementChild as HTMLElement;
  parent.appendChild(t.content);
  return first;
}
