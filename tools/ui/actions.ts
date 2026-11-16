/** Small, local SVG set: no font, network request or icon dependency. */
const paths: Record<string, string> = {
  npc: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  zone: '<path d="m4 5 14-2 3 14-12 4-6-9Z"/><circle cx="4" cy="5" r="2"/><circle cx="18" cy="3" r="2"/><circle cx="21" cy="17" r="2"/>',
  portal: '<path d="M3 21V3h12v5M3 21h12v-5M9 12h13m-4-4 4 4-4 4"/>',
  refresh: '<path d="M20 7V2m0 5h-5M4 17v5m0-5h5M5 7a8 8 0 0 1 15 0M4 17a8 8 0 0 0 15 0"/>',
  check: '<path d="m4 12 5 5L20 5"/>',
  cancel: '<path d="m5 5 14 14M5 19 19 5"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 9M4 10V3m0 7h7"/>',
  grid: '<rect x="3" y="3" width="18" height="18"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
  select: '<path d="m5 3 14 9-7 1-3 7Z"/><path d="m12 13 5 7"/>',
  place: '<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M19 13v8m-4-4h8M6 11l3-3 3 3"/>',
  pan: '<path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-4-2-6-4l-3-4a2 2 0 0 1 3-3l1 1Z"/>',
  block: '<path d="m14 4 6 6-8 8-6-6Z"/><path d="M6 12c-4 0-4 8-4 8s8 0 8-4M16 2l6 6"/>',
  erase: '<path d="m14 3 7 7-11 11H5l-4-4Z"/><path d="m8 10 7 7M10 21h12"/>',
  entry: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  undo: '<path d="m8 4-5 5 5 5M3 9h11a7 7 0 0 1 0 14"/>',
  redo: '<path d="m16 4 5 5-5 5m5-5H10a7 7 0 0 0 0 14"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="8" y="8" width="8" height="8"/>',
  minus: '<circle cx="10" cy="10" r="7"/><path d="M6 10h8m1 5 6 6"/>',
  plus: '<circle cx="10" cy="10" r="7"/><path d="M6 10h8m-4-4v8m5 1 6 6"/>',
  new: '<path d="M14 2H5v20h14V7Z"/><path d="M14 2v5h5m-7 4v7m-3-3h6"/>',
  save: '<path d="M4 3h13l4 4v14H3V3Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  open: '<path d="M4 4h6l2 3h8v4H4Z"/><path d="m4 11-2 10h18l2-10Z"/>',
  backup: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  export: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 5 5 3-3 4 4"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 16v5h16v-5"/>',
  duplicate: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  delete: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  pulse: '<circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>',
  enable: '<path d="m8 4 13 8-13 8Z"/>',
  disable: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v1"/>',
};
export function icon(name: string): string {
  return `<svg class="action-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.help}</svg>`;
}
export function labelAction(button: HTMLElement, name: string, label: string, hint: string, shortcut = '', compact = false): void {
  button.innerHTML = icon(name);
  const text = document.createElement('span'); text.textContent = label;
  text.className = compact ? 'sr-only' : 'action-label'; button.append(text);
  button.setAttribute('aria-label', label);
  button.dataset.tip = `${label}${shortcut ? ` (${shortcut})` : ''} · ${hint}`;
  if (shortcut) button.setAttribute('aria-keyshortcuts', shortcut.includes('Ctrl/Cmd') ? `${shortcut.replace('Ctrl/Cmd', 'Control')} ${shortcut.replace('Ctrl/Cmd', 'Meta')}` : shortcut);
}
