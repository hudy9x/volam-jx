import { moneyText } from '@vltk/shared';
import Phaser from 'phaser';
import { ITEMS, QUALITY_COLORS, groundObjSprite } from '@vltk/shared';
import { ui, uiPx, textResolution, zoomPlate } from '../display';
import { assetUrl } from '../../art/assets';

/** A drop on the ground as the server syncs it (MapState.ground). */
export interface GroundState { x: number; y: number; def: string; q: number; amount: number; owner: string; ownerUntil: number }

const MONEY_ICON = 'ui/money';
const MONEY_COLOR = '#ffd94e';

/**
 * One item / money pile lying on the ground (VT7): the item's original icon (money: the silver icon) on its spot and its
 * name in the colour of its quality, like the original ground labels. Click it to pick it up (WorldScene).
 */
export class GroundView {
  private img: Phaser.GameObjects.Image | null = null;
  private readonly label: Phaser.GameObjects.Text;
  private dead = false;

  constructor(scene: Phaser.Scene, readonly id: string, readonly g: GroundState) {
    const def = g.def === 'money' ? undefined : ITEMS[g.def];
    const key = groundObjSprite(g.def, g.amount) ?? def?.icon ?? MONEY_ICON;
    const tex = `gnd:${key}`;
    const add = () => {
      if (this.dead) return;
      this.img = scene.add.image(g.x, g.y, tex).setOrigin(0.5, 1).setDepth(g.y - 2);
      this.label.setY(g.y - Math.max(18, this.img.height + 4));
    };
    const name = def ? def.name : `${moneyText(g.amount)} lượng`;
    this.label = scene.add.text(g.x, g.y - 24, name, {
      resolution: textResolution(), fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: uiPx(12), stroke: '#000', strokeThickness: ui(3),
      color: def ? QUALITY_COLORS[g.q] ?? '#ffffff' : MONEY_COLOR,
    }).setOrigin(0.5, 1).setScale(zoomPlate().textScale).setDepth(1e6 - 1);
    if (scene.textures.exists(tex)) add();
    else {
      scene.load.image(tex, assetUrl(`${key}.webp`));
      scene.load.once(`filecomplete-image-${tex}`, add);
      scene.load.start();
    }
  }

  syncZoom(): void {
    if (!this.dead) this.label.setScale(zoomPlate().textScale);
  }

  /** Click test (world coordinates): the icon and its label. */
  contains(wx: number, wy: number): boolean {
    return Math.abs(wx - this.g.x) <= 24 && wy >= this.g.y - 44 && wy <= this.g.y + 6;
  }

  destroy(): void {
    this.dead = true;
    this.img?.destroy();
    this.label.destroy();
  }
}
