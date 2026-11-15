import { storage } from '../../platform/storage';
import { $ } from './dom';
import { tooltip } from './tooltip';
import './dialog.css';
import { hudSize, localPoint } from './viewport';

/**
 * One kind of window for the whole interface (original JX1 look: jade frame, stone title bar with the two
 * coins, gold title, round ✕). Every window is a `<section class="dlg" data-title="…">` that its module adds to
 * the page (ui/windows/); the manager adds the title bar, makes it draggable by the title bar (position remembered
 * on this device), keeps the last opened / clicked window on top and closes the top-most one with ESC.
 */
const POS_KEY = 'vltk.dlg.';
const Z0 = 20;

export interface DialogOptions {
  /** ESC and ✕ close it (default true). The trọng thương window is not closable. */
  closable?: boolean;
  /** Called after the window is hidden. */
  onClose?: () => void;
  /** Called after the window is shown. */
  onOpen?: () => void;
}

interface Entry { el: HTMLElement; opts: DialogOptions; z: number }

export class Dialogs {
  private entries = new Map<string, Entry>();
  private sizes = new ResizeObserver(changes => {
    for (const { target } of changes) if (!target.classList.contains('hidden')) this.clamp(target as HTMLElement);
  });
  /** ESC with no window open (the system menu). */
  onIdleEscape: (() => void) | null = null;

  constructor() {
    // Capture phase: ESC works even while a text box has focus, before the game sees the key.
    window.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || e.repeat) return;
      if (document.querySelector('dialog[open]')) return;
      const typing = (document.activeElement as HTMLElement | null)?.matches?.('input, textarea');
      if (typing) (document.activeElement as HTMLElement).blur();
      if (this.closeTop()) { e.preventDefault(); return; }
      if (!typing && this.onIdleEscape && this.anyVisibleRoot()) { e.preventDefault(); this.onIdleEscape(); }
    }, true);
    const clamp = () => { for (const [id, en] of this.entries) if (this.isOpen(id)) this.clamp(en.el); };
    window.addEventListener('resize', clamp);
    document.addEventListener('viewportchange', clamp, true);
  }

  /** Turn `<section class="dlg" id=… data-title=…>` into a window. */
  register(id: string, opts: DialogOptions = {}): HTMLElement {
    const el = $(id);
    if (!el) throw new Error(`dialog #${id} missing`);
    const entry: Entry = { el, opts: { closable: true, ...opts }, z: 0 };
    this.entries.set(id, entry);
    if (!el.querySelector(':scope > .dlg-head')) {
      const body = document.createElement('div');
      body.className = 'dlg-body';
      body.append(...el.childNodes);
      const head = document.createElement('header');
      head.className = 'dlg-head';
      head.innerHTML = '<i class="coin"></i><h3 class="dlg-title"></h3><i class="coin"></i>';
      (head.querySelector('.dlg-title') as HTMLElement).textContent = el.dataset.title ?? '';
      if (entry.opts.closable) {
        const x = document.createElement('button');
        x.className = 'dlg-x';
        x.type = 'button';
        x.title = 'Đóng (Esc)';
        x.addEventListener('click', () => this.close(id));
        x.addEventListener('pointerdown', e => e.stopPropagation());
        head.appendChild(x);
      }
      el.append(head, body);
      this.dragByHead(id, el, head);
    }
    el.addEventListener('pointerdown', () => this.front(id), true);
    this.sizes.observe(el);
    return el;
  }

  setTitle(id: string, text: string): void {
    const t = this.entries.get(id)?.el.querySelector('.dlg-title');
    if (t) t.textContent = text;
  }

  isOpen(id: string): boolean {
    const el = this.entries.get(id)?.el;
    return !!el && !el.classList.contains('hidden');
  }

  open(id: string): void {
    const en = this.entries.get(id);
    if (!en) return;
    const was = this.isOpen(id);
    en.el.classList.remove('hidden');
    this.front(id);
    if (!was) {
      this.restore(id, en.el);
      en.opts.onOpen?.();
    }
  }

  close(id: string): void {
    const en = this.entries.get(id);
    if (!en || !this.isOpen(id)) return;
    en.el.classList.add('hidden');
    tooltip.hide(); // a tooltip of the closed window would stay on screen
    en.opts.onClose?.();
  }

  toggle(id: string, open = !this.isOpen(id)): void {
    if (open) this.open(id); else this.close(id);
  }

  closeAll(includeLocked = false): void {
    for (const [id, en] of this.entries) if (includeLocked || en.opts.closable) this.close(id);
  }

  /** Close the top-most closable window; false when none is open. */
  closeTop(): boolean {
    let best: [string, Entry] | null = null;
    for (const [id, en] of this.entries) {
      if (!en.opts.closable || !this.isOpen(id) || !this.visibleRoot(en.el)) continue;
      if (!best || en.z > best[1].z) best = [id, en];
    }
    if (!best) return false;
    this.close(best[0]);
    return true;
  }

  private front(id: string): void {
    const en = this.entries.get(id);
    if (!en) return;
    const ordered = [...this.entries.values()].sort((a, b) => a.z - b.z);
    if (ordered.at(-1) === en && en.z >= Z0) return;
    // Keep window order compact: repeated opens/clicks must never reach the tooltip layer.
    ordered.splice(ordered.indexOf(en), 1);
    ordered.push(en);
    ordered.forEach((entry, index) => {
      entry.z = Z0 + index;
      entry.el.style.zIndex = String(entry.z);
    });
  }

  /** A window inside a hidden container (HUD while on the login screen) does not count. */
  private visibleRoot(el: HTMLElement): boolean {
    for (let p = el.parentElement; p; p = p.parentElement) if (p.classList.contains('hidden')) return false;
    return true;
  }

  private anyVisibleRoot(): boolean {
    return !$('hud')?.classList.contains('hidden');
  }

  // ---------------- dragging ----------------

  private dragByHead(id: string, el: HTMLElement, head: HTMLElement): void {
    head.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const parent = el.offsetParent as HTMLElement;
      const [px, py] = localPoint(parent, e.clientX, e.clientY);
      const [left, top] = localPoint(parent, r.left, r.top);
      const dx = px - left, dy = py - top;
      head.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      const move = (m: PointerEvent) => { const [x, y] = localPoint(parent, m.clientX, m.clientY); this.place(el, x - dx, y - dy); };
      const up = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', up);
        head.removeEventListener('pointercancel', up);
        el.classList.remove('dragging');
        storage.setJson(POS_KEY + id, [parseFloat(el.style.left), parseFloat(el.style.top)]);
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', up);
      head.addEventListener('pointercancel', up);
    });
    head.addEventListener('dblclick', () => {
      // Double-click the title bar: back to the default place.
      storage.remove(POS_KEY + id);
      el.style.left = el.style.top = el.style.right = el.style.bottom = el.style.transform = '';
      el.classList.remove('placed');
      this.clamp(el);
    });
  }

  /** Absolute position in logical HUD pixels, kept inside the game frame. */
  private place(el: HTMLElement, x: number, y: number): void {
    const w = el.offsetWidth, h = el.offsetHeight;
    const { width: vw, height: vh } = hudSize();
    el.classList.add('placed');
    el.style.right = el.style.bottom = el.style.transform = '';
    el.style.left = `${Math.round(Math.max(0, Math.min(Math.max(0, vw - w), x)))}px`;
    el.style.top = `${Math.round(Math.max(0, Math.min(Math.max(0, vh - h), y)))}px`;
  }

  private restore(id: string, el: HTMLElement): void {
    const pos = storage.getJson<[number, number]>(POS_KEY + id);
    if (pos && Number.isFinite(pos[0]) && Number.isFinite(pos[1])) this.place(el, pos[0], pos[1]);
    else this.clamp(el);
  }

  private clamp(el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const parent = el.offsetParent as HTMLElement;
    if (!parent) return;
    const [x, y] = localPoint(parent, r.left, r.top);
    this.place(el, x, y);
  }
}

export const dialogs = new Dialogs();
