/** Plain script shared by Manager and its mounted Boss page. */
export const reloadClient = `(() => {
let version; let pending = false;
setInterval(async () => {
  if (pending) return; pending = true;
  try {
    const r = await fetch('/__tool-version', {cache:'no-store'}); if (!r.ok) return;
    const next = await r.text();
    if (!version) { version = next; return; }
    if (next === version) return;
    if (document.querySelector('#save-status.dirty')) return;
    if (!window.dispatchEvent(new Event('manager:reload', {cancelable:true}))) return;
    location.reload();
  } catch {} finally { pending = false; }
}, 1000);
})();`;
