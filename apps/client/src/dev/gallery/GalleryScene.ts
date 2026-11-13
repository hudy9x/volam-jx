import Phaser from 'phaser';
import { DEFAULT_LOOK, HORSES, HORSE_IDS, ITEM_LIST, type ItemDef } from '@vltk/shared';
import type { AssocKey, Look } from '../../art/jx';
import { FRAME_MS, JxSprite } from '../../game/actors/PaperDoll';
import { uiPx } from '../../game/display';

/** Weapons cycled with W: [label, melee/range item type or -1 for none]. */
const WEAPONS: [string, string | null][] = [
  ['Tay không', null], ['Kiếm', 'melee-0'], ['Đao', 'melee-1'], ['Côn', 'melee-2'], ['Thương', 'melee-3'],
  ['Chùy', 'melee-4'], ['Song đao', 'melee-5'], ['Triền thủ', 'melee-6'], ['Ám khí', 'range-0'],
];
const ACTIONS: [string, AssocKey][] = [
  ['Đứng chiến đấu', 'stand'], ['Đứng thường', 'idle'], ['Chạy', 'run'], ['Đánh 1', 'attack1'], ['Đánh 2', 'attack2'],
  ['Nội công', 'magic'], ['Trúng đòn', 'wound'], ['Ngã', 'die'], ['Chạy (trong thành)', 'townRun'],
];
const CELL_W = 150, CELL_H = 190, LEFT = 20, TOP = 70;

interface Cell { label: string; sx: 'm' | 'f'; armor: ItemDef; helm?: ItemDef; doll?: JxSprite; text?: Phaser.GameObjects.Text }

/**
 * Dev-only (`?gallery`): every armor look of levels 1–10 (male and female) at the original 1:1 resolution, with
 * the helm of the same set. Keys: 1–9 action · ←/→ facing · W weapon · W+Shift previous · H helm · M horse · R auto-rotate.
 */
export class GalleryScene extends Phaser.Scene {
  private cells: Cell[] = [];
  private action = 0;
  private dir = 0;
  private weapon = 1;
  private helm = true;
  private mounted = false;
  private rotate = false;
  private info!: Phaser.GameObjects.Text;
  private start = 0;

  constructor() { super('gallery'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#3b4a33');
    this.cameras.main.roundPixels = true;
    // One cell per distinct armor visual (levels sharing a picture are grouped).
    const groups = new Map<string, ItemDef[]>();
    for (const it of ITEM_LIST) {
      if (it.kind !== 'armor' || it.look === undefined) continue;
      const key = `${it.sex}|${it.look}`;
      groups.set(key, [...(groups.get(key) ?? []), it]);
    }
    const sorted = [...groups.values()].sort((a, b) => (a[0].sex! < b[0].sex! ? -1 : a[0].sex! > b[0].sex! ? 1 : a[0].type - b[0].type || a[0].level - b[0].level));
    for (const list of sorted) {
      const armor = list[0];
      const levels = list.map(i => i.level);
      const helm = ITEM_LIST.find(i => i.kind === 'helm' && i.type === armor.type && i.level === armor.level);
      const lv = levels.length > 1 ? `${Math.min(...levels)}–${Math.max(...levels)}` : `${levels[0]}`;
      this.cells.push({ label: `${armor.name}\n${armor.sex === 'm' ? 'Nam' : 'Nữ'} · cấp ${lv}`, sx: armor.sex!, armor, helm });
    }
    const cols = Math.max(1, Math.floor((this.scale.width - LEFT * 2) / CELL_W));
    const style = { fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: uiPx(12), color: '#f1e6cf', align: 'center', stroke: '#000', strokeThickness: 3 };
    this.cells.forEach((c, i) => {
      const x = LEFT + (i % cols) * CELL_W + CELL_W / 2, y = TOP + Math.floor(i / cols) * CELL_H + 140;
      c.text = this.add.text(x, y + 8, c.label, style).setOrigin(0.5, 0).setDepth(1e6);
      c.doll = new JxSprite(this, { kind: 'look', look: this.lookOf(c) });
      (c as Cell & { x: number; y: number }).x = x;
      (c as Cell & { x: number; y: number }).y = y;
    });
    this.info = this.add.text(12, 10, '', { ...style, fontSize: uiPx(14), align: 'left', color: '#e8c879' }).setScrollFactor(0).setDepth(2e6);
    const rows = Math.ceil(this.cells.length / cols);
    this.cameras.main.setBounds(0, 0, this.scale.width, TOP + rows * CELL_H + 40);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => { this.cameras.main.scrollY += dy; });

    const k = this.input.keyboard!;
    k.on('keydown', (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= ACTIONS.length) { this.action = n - 1; this.start = this.time.now; }
      else if (e.key === 'ArrowLeft') this.dir = (this.dir + 7) % 8;
      else if (e.key === 'ArrowRight') this.dir = (this.dir + 1) % 8;
      else if (e.key.toLowerCase() === 'w') this.weapon = (this.weapon + (e.shiftKey ? WEAPONS.length - 1 : 1)) % WEAPONS.length;
      else if (e.key.toLowerCase() === 'h') this.helm = !this.helm;
      else if (e.key.toLowerCase() === 'm') this.mounted = !this.mounted;
      else if (e.key.toLowerCase() === 'r') this.rotate = !this.rotate;
      else return;
      for (const c of this.cells) c.doll!.setSource({ kind: 'look', look: this.lookOf(c) });
    });
  }

  private lookOf(c: Cell): Look {
    const weaponId = WEAPONS[this.weapon][1];
    const weapon = weaponId ? ITEM_LIST.find(i => i.id === `${weaponId}-1`)?.look ?? 0 : 0;
    return {
      sx: c.sx,
      armor: c.armor.look!,
      helm: this.helm && c.helm?.look !== undefined ? c.helm.look : DEFAULT_LOOK.helm,
      weapon,
      horse: this.mounted ? HORSES[HORSE_IDS[0]].jxRow : -1,
    };
  }

  update(time: number): void {
    if (this.rotate) this.dir = Math.floor(time / 1500) % 8;
    const [label, key] = ACTIONS[this.action];
    const elapsed = time - this.start;
    for (const c of this.cells as (Cell & { x: number; y: number })[]) {
      c.doll!.render(c.x, c.y, c.y, key, this.dir, n => Math.floor(elapsed / FRAME_MS) % n);
    }
    this.info.setText(
      `${label} · hướng ${this.dir} · vũ khí: ${WEAPONS[this.weapon][0]} · mũ: ${this.helm ? 'có' : 'không'} · ngựa: ${this.mounted ? 'có' : 'không'}` +
      `   [1–9 động tác · ←/→ hướng · R tự xoay · W vũ khí · H mũ · M ngựa · lăn chuột: cuộn]`,
    );
  }
}
