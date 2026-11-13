import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import './death.css';

const ID = 'death';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Trọng thương">
  <p>Bạn đã bị trọng thương.</p>
  <div class="row end"><button type="button" class="btn" id="respawn">Về thành hồi sinh</button></div>
</section>`;

/** Trọng thương: shown while the own character is dead; cannot be closed, only "Về thành hồi sinh". */
export class DeathWindow {
  constructor(parent: HTMLElement, respawn: () => void) {
    mount(parent, HTML);
    dialogs.register(ID, { closable: false });
    $('respawn').addEventListener('click', () => {
      dialogs.close(ID); // the server revives (or sends us to town) right away
      respawn();
    });
  }

  show(dead: boolean): void {
    if (dead) dialogs.open(ID); else dialogs.close(ID);
  }
}
