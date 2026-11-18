// Bundle the existing game dialog primitive; keep the tool independent of the game entrypoint.
import { Dialogs } from '../../../apps/client/src/ui/kit/dialog.ts';
const manager = new Dialogs();
const overlay = document.createElement('div');
overlay.className = 'tool-overlay hidden';
document.body.append(overlay);
let active = null;
let opener = null;
let openerSelector = null;
export function setupToolDialog(id) {
  const native = document.getElementById(id);
  const el = document.createElement('section');
  el.id = id;
  el.className = 'dlg hidden';
  el.dataset.title = native.querySelector('h2').textContent;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', `${id}-title-bar`);
  el.append(...native.childNodes);
  el.querySelector('.dlg-head').className = 'picker-head';
  native.replaceWith(el);
  manager.register(id, { onClose() {
    el.dispatchEvent(new Event('toolclose'));
    active = null;
    overlay.classList.add('hidden');
    for (const root of document.querySelectorAll('body > .topbar,body > .tool-nav,body > main')) root.inert = false;
    if (opener?.isConnected) opener.focus();
    else (document.querySelector(openerSelector || '#inp-search') || document.getElementById('inp-search')).focus();
  }});
  el.querySelector('.dlg-title').id = `${id}-title-bar`;
  el.showModal = () => {
    opener = document.activeElement;
    openerSelector = opener?.dataset.openSkills ? `[data-open-skills="${opener.dataset.openSkills}"]` : opener?.id === 'edit-selected-skills' ? '#edit-selected-skills' : opener?.dataset.openGold ? `[data-open-gold="${opener.dataset.openGold}"]` : opener?.dataset.openMap ? `[data-open-map="${opener.dataset.openMap}"]` : null;
    manager.setTitle(id, el.querySelector('.picker-head h2').textContent);
    overlay.classList.remove('hidden');
    for (const root of document.querySelectorAll('body > .topbar,body > .tool-nav,body > main')) root.inert = true;
    manager.open(id);
    active = el;
    (el.querySelector('input:not([disabled])') || el.querySelector('button:not([disabled])'))?.focus();
  };
  el.close = () => manager.close(id);
  return el;
}
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !active) return;
  const controls = [...active.querySelectorAll('button,input,select,[tabindex="0"]')]
    .filter(el => !el.disabled && el.getClientRects().length);
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
