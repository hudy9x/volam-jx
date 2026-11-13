import { npcSheet, jxSheetUrl, spriteRow } from '../../art/jx';
import type { NpcTalk } from '../../game/ports';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import './npcTalk.css';

const ID = 'npc-dlg';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="">
  <div class="npc-talk">
    <div class="npc-face" id="npc-face"></div>
    <div class="grow">
      <p id="npc-text"></p>
      <div id="npc-options"></div>
    </div>
  </div>
</section>`;

/** Talking to a town NPC: their picture, a line and the choices (like the original NPC window), plus "Rời khỏi". */
export class NpcTalkWindow {
  constructor(parent: HTMLElement) {
    mount(parent, HTML);
    dialogs.register(ID);
  }

  talk(npc: NpcTalk): void {
    dialogs.setTitle(ID, npc.name);
    $('npc-text').textContent = npc.text;
    fillNpcFace($('npc-face'), npc.res);
    $('npc-options').replaceChildren(...[...npc.options, { label: 'Rời khỏi', run: () => undefined }].map(o => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'npc-opt';
      btn.textContent = o.label;
      btn.addEventListener('click', () => { dialogs.close(ID); o.run(); });
      return btn;
    }));
    dialogs.open(ID);
  }
}

/** First frame of an NPC's standing sheet, facing the viewer, fitted in the face box (its content is replaced each time). */
function fillNpcFace(box: HTMLElement, res: string): void {
  box.replaceChildren();
  const layer = npcSheet(res, 'stand');
  if (!layer) return;
  const [w, h, , , perDir, dirs, cols] = layer.meta;
  const rowsPerDir = Math.ceil(perDir / cols);
  const k = Math.min(1, 70 / w, 94 / h);
  const el = document.createElement('div');
  Object.assign(el.style, {
    width: `${Math.round(w * k)}px`,
    height: `${Math.round(h * k)}px`,
    backgroundImage: `url(${jxSheetUrl(layer.key)})`,
    backgroundSize: `${cols * w * k}px ${dirs * rowsPerDir * h * k}px`,
    backgroundPosition: `0 ${-spriteRow(0, dirs) * rowsPerDir * h * k}px`,
  });
  box.appendChild(el);
}
