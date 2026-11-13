import { settings, type Settings } from '../../state/settings';

/**
 * Inputs with `data-set="<setting>"` inside `box` edit that setting (checkbox = on / off, range = number, the
 * <span> after a range shows its value) and follow it when it changes elsewhere. `muteDisables`: sliders are greyed
 * out while the sound is muted (Tùy chỉnh).
 */
export function bindSettingInputs(box: HTMLElement, muteDisables = false): void {
  const inputs = [...box.querySelectorAll<HTMLInputElement>('[data-set]')];
  for (const input of inputs) {
    const key = input.dataset.set as keyof Settings;
    // checkbox = on / off, <select> = its text value, range = number.
    input.addEventListener('input', () => settings.set({ [key]: input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value) }));
  }
  settings.watch(s => {
    for (const input of inputs) {
      const v = s[input.dataset.set as keyof Settings];
      if (input.type === 'checkbox') input.checked = !!v;
      else {
        input.value = String(v);
        const label = input.nextElementSibling;
        if (label && input.type === 'range') label.textContent = String(v);
      }
      if (muteDisables && input.type === 'range') input.disabled = s.mute;
    }
  });
}
