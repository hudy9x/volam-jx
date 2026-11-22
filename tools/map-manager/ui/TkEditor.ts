import type { TkBattleMapConfig, TkCamp, TkNpcRole } from '../../../packages/shared/src/battle/tongkim.js';

export interface TkPoint { x: number; y: number }

export interface TkPortalsDraft {
  tongOut: TkPoint | null;
  tongBack: TkPoint | null;
  kimOut: TkPoint | null;
  kimBack: TkPoint | null;
}

export interface TkDocument {
  config: TkBattleMapConfig | null;
  revision: string;
  configured: boolean;
  portals: TkPortalsDraft;
}

export type TkToolKind = 'spawn' | 'gateOut' | 'gateExit' | 'gateBack' | 'marshal' | 'frontline' | 'npc';
type NpcGroupRole = Exclude<TkNpcRole, 'marshal'>;

const NPC_ROLE_LABELS: Record<NpcGroupRole, string> = {
  soldier: 'Binh sĩ',
  captain: 'Đội trưởng',
  commander: 'Thống lĩnh',
  deputy: 'Phó tướng',
  general: 'Đại tướng',
};

const CAMP_COLORS: Record<TkCamp, string> = {
  tong: '#e8b878',
  kim: '#d58cff',
};

type DragItem =
  | { kind: 'spawn' | 'gateOut' | 'gateExit' | 'gateBack' | 'marshal'; camp: TkCamp }
  | { kind: 'frontline' | 'npc'; camp: TkCamp; index: number };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => $<HTMLInputElement>(id);

export class TkEditor {
  config: TkBattleMapConfig | null = null;
  portals: TkPortalsDraft = { tongOut: null, tongBack: null, kimOut: null, kimBack: null };
  revision = '';
  dirty = false;
  camp: TkCamp = 'tong';
  tool: TkToolKind = 'spawn';
  selectedNpc = -1;
  private drag: DragItem | null = null;
  private mapId = 0;
  private mapSize = { width: 10000, height: 10000 };

  constructor(
    private refresh: () => void,
    private standable: (x: number, y: number) => boolean,
    private nearestWalkable: (x: number, y: number) => TkPoint,
  ) {
    this.bindPanel();
  }

  setup(mapId: number, size: { width: number; height: number }, doc: TkDocument): void {
    this.mapId = mapId;
    this.mapSize = size;
    this.config = doc.config ? structuredClone(doc.config) : null;
    this.portals = structuredClone(doc.portals ?? { tongOut: null, tongBack: null, kimOut: null, kimBack: null });
    this.revision = doc.revision;
    this.dirty = false;
    this.selectedNpc = -1;
    this.drag = null;
    this.syncPanel();
  }

  saved(doc: TkDocument): void {
    this.config = doc.config ? structuredClone(doc.config) : null;
    this.portals = structuredClone(doc.portals ?? this.portals);
    this.revision = doc.revision;
    this.dirty = false;
    this.syncPanel();
  }

  payload() {
    return {
      config: this.config,
      revision: this.revision,
      portals: this.portals,
    };
  }

  private portalKey(camp: TkCamp, kind: 'out' | 'back'): keyof TkPortalsDraft {
    if (camp === 'tong') return kind === 'out' ? 'tongOut' : 'tongBack';
    return kind === 'out' ? 'kimOut' : 'kimBack';
  }

  private initDefault(): void {
    if (!this.mapId) return;
    const w = this.mapSize.width, h = this.mapSize.height;
    const tSpawn = this.nearestWalkable(Math.round(w * 0.16), Math.round(h * 0.84));
    const tOut = this.nearestWalkable(Math.round(w * 0.22), Math.round(h * 0.78));
    const tExit = this.nearestWalkable(Math.round(w * 0.30), Math.round(h * 0.70));
    const tBack = this.nearestWalkable(Math.round(w * 0.26), Math.round(h * 0.74));
    const tMarshal = this.nearestWalkable(Math.round(w * 0.31), Math.round(h * 0.69));

    const kSpawn = this.nearestWalkable(Math.round(w * 0.84), Math.round(h * 0.16));
    const kOut = this.nearestWalkable(Math.round(w * 0.78), Math.round(h * 0.22));
    const kExit = this.nearestWalkable(Math.round(w * 0.70), Math.round(h * 0.30));
    const kBack = this.nearestWalkable(Math.round(w * 0.74), Math.round(h * 0.26));
    const kMarshal = this.nearestWalkable(Math.round(w * 0.69), Math.round(h * 0.31));

    const mid = this.nearestWalkable(Math.round(w * 0.5), Math.round(h * 0.5));
    this.config = {
      id: this.mapId,
      tong: {
        spawn: tSpawn,
        safeRadius: 1100,
        gateExit: tExit,
        marshal: tMarshal,
        frontlines: [mid],
        npcSpawns: [],
      },
      kim: {
        spawn: kSpawn,
        safeRadius: 1100,
        gateExit: kExit,
        marshal: kMarshal,
        frontlines: [mid],
        npcSpawns: [],
      },
    };
    this.portals = {
      tongOut: tOut,
      tongBack: tBack,
      kimOut: kOut,
      kimBack: kBack,
    };
    this.dirty = true;
    this.selectedNpc = -1;
    this.syncPanel();
    this.refresh();
  }

  private bindPanel(): void {
    $('tk-init').onclick = () => this.initDefault();
    document.querySelectorAll<HTMLButtonElement>('[data-tk-camp]').forEach(btn => {
      btn.onclick = () => {
        this.camp = btn.dataset.tkCamp === 'kim' ? 'kim' : 'tong';
        this.selectedNpc = -1;
        this.syncPanel();
        this.refresh();
      };
    });
    $<HTMLSelectElement>('tk-tool').onchange = () => {
      this.tool = $<HTMLSelectElement>('tk-tool').value as TkToolKind;
      this.syncPanel();
    };
    field('tk-safe-radius').onchange = () => {
      if (!this.config) return;
      const v = Math.max(100, Math.min(5000, Math.round(Number(field('tk-safe-radius').value) || 1100)));
      this.config[this.camp].safeRadius = v;
      this.dirty = true;
      this.syncPanel();
      this.refresh();
    };
    $('tk-frontline-pop').onclick = () => {
      if (!this.config) return;
      const list = [...this.config[this.camp].frontlines];
      if (!list.length) return;
      list.pop();
      this.config[this.camp].frontlines = list;
      this.dirty = true;
      this.syncPanel();
      this.refresh();
    };
    const updateSelectedNpc = () => {
      if (!this.config || this.selectedNpc < 0) return;
      const list = [...this.config[this.camp].npcSpawns];
      const item = list[this.selectedNpc];
      if (!item) return;
      const role = $<HTMLSelectElement>('tk-npc-role').value as NpcGroupRole;
      const count = Math.max(1, Math.min(30, Math.round(Number(field('tk-npc-count').value) || 1)));
      const radius = Math.max(0, Math.min(2000, Math.round(Number(field('tk-npc-radius').value) || 0)));
      list[this.selectedNpc] = { ...item, role, count, radius };
      this.config[this.camp].npcSpawns = list;
      this.dirty = true;
      this.syncPanel();
      this.refresh();
    };
    $<HTMLSelectElement>('tk-npc-role').onchange = updateSelectedNpc;
    field('tk-npc-count').onchange = updateSelectedNpc;
    field('tk-npc-radius').onchange = updateSelectedNpc;
    $('tk-npc-remove').onclick = () => {
      if (!this.config || this.selectedNpc < 0) return;
      const list = [...this.config[this.camp].npcSpawns];
      list.splice(this.selectedNpc, 1);
      this.config[this.camp].npcSpawns = list;
      this.selectedNpc = -1;
      this.dirty = true;
      this.syncPanel();
      this.refresh();
    };
  }

  syncPanel(): void {
    const has = Boolean(this.config);
    $('tk-empty').hidden = has;
    $('tk-editor-body').hidden = !has;
    document.querySelectorAll<HTMLButtonElement>('[data-tk-camp]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.tkCamp === this.camp));
    });
    if (!this.config) {
      $('tk-summary').textContent = 'Map này chưa có cấu hình Tống Kim.';
      return;
    }
    const c = this.config[this.camp];
    const pOut = this.portals[this.portalKey(this.camp, 'out')];
    const pBack = this.portals[this.portalKey(this.camp, 'back')];
    $<HTMLSelectElement>('tk-tool').value = this.tool;
    field('tk-safe-radius').value = String(c.safeRadius);
    $('tk-coords-summary').innerHTML = [
      `<div>Tập trung: <b>${c.spawn.x}, ${c.spawn.y}</b> (R=${c.safeRadius}) ${this.standable(c.spawn.x, c.spawn.y) ? '' : '<span class="tk-bad">· Bị chặn</span>'}</div>`,
      `<div>Cổng ra (trong): <b>${pOut ? `${pOut.x}, ${pOut.y}` : 'Chưa đặt'}</b>${pOut && !this.standable(pOut.x, pOut.y) ? ' <span class="tk-bad">· Bị chặn</span>' : ''}</div>`,
      `<div>Đáp ngoài cổng: <b>${c.gateExit.x}, ${c.gateExit.y}</b>${this.standable(c.gateExit.x, c.gateExit.y) ? '' : ' <span class="tk-bad">· Bị chặn</span>'}</div>`,
      `<div>Cổng về (ngoài): <b>${pBack ? `${pBack.x}, ${pBack.y}` : 'Chưa đặt'}</b>${pBack && !this.standable(pBack.x, pBack.y) ? ' <span class="tk-bad">· Bị chặn</span>' : ''}</div>`,
      `<div>Nguyên Soái: <b>${c.marshal.x}, ${c.marshal.y}</b>${this.standable(c.marshal.x, c.marshal.y) ? '' : ' <span class="tk-bad">· Bị chặn</span>'}</div>`,
      `<div>Tiền tuyến: <b>${c.frontlines.length}</b> điểm · Cụm NPC: <b>${c.npcSpawns.length}</b></div>`,
    ].join('');

    $('tk-frontline-box').hidden = this.tool !== 'frontline';
    $<HTMLButtonElement>('tk-frontline-pop').disabled = c.frontlines.length === 0;
    $('tk-npc-box').hidden = this.tool !== 'npc';
    const selNpc = this.selectedNpc >= 0 ? c.npcSpawns[this.selectedNpc] : undefined;
    if (selNpc) {
      $<HTMLSelectElement>('tk-npc-role').value = selNpc.role;
      field('tk-npc-count').value = String(selNpc.count);
      field('tk-npc-radius').value = String(selNpc.radius);
    }
    $<HTMLButtonElement>('tk-npc-remove').disabled = !selNpc;
    $('tk-npc-selected').textContent = selNpc
      ? `Đang chọn #${this.selectedNpc + 1}: ${NPC_ROLE_LABELS[selNpc.role]} ×${selNpc.count} (${selNpc.x}, ${selNpc.y})`
      : 'Bấm map để thêm cụm mới, hoặc bấm vào chấm cụm NPC để sửa/xóa.';
    $('tk-summary').textContent = `${this.camp === 'tong' ? 'Đại Tống' : 'Đại Kim'} · ${this.dirty ? 'Chưa lưu' : 'Đã nạp bản lưu'}`;
  }

  private hitTest(wx: number, wy: number, zoom: number): DragItem | null {
    if (!this.config) return null;
    const hitR = Math.max(24, 14 / zoom);
    const hit = (p: TkPoint | null) => p && Math.hypot(p.x - wx, p.y - wy) <= hitR;
    // Ưu tiên kiểm tra phe đang chọn trước
    const camps: TkCamp[] = this.camp === 'tong' ? ['tong', 'kim'] : ['kim', 'tong'];
    for (const c of camps) {
      const cfg = this.config[c];
      if (hit(cfg.spawn)) return { kind: 'spawn', camp: c };
      if (hit(cfg.gateExit)) return { kind: 'gateExit', camp: c };
      if (hit(cfg.marshal)) return { kind: 'marshal', camp: c };
      if (hit(this.portals[this.portalKey(c, 'out')])) return { kind: 'gateOut', camp: c };
      if (hit(this.portals[this.portalKey(c, 'back')])) return { kind: 'gateBack', camp: c };
      for (let i = cfg.frontlines.length - 1; i >= 0; i--) {
        if (hit(cfg.frontlines[i])) return { kind: 'frontline', camp: c, index: i };
      }
      for (let i = cfg.npcSpawns.length - 1; i >= 0; i--) {
        if (hit(cfg.npcSpawns[i])) return { kind: 'npc', camp: c, index: i };
      }
    }
    return null;
  }

  pointerDown(wx: number, wy: number, zoom: number): boolean {
    if (!this.config) return false;
    const found = this.hitTest(wx, wy, zoom);
    if (found) {
      this.camp = found.camp;
      this.drag = found;
      if (found.kind === 'npc') {
        this.tool = 'npc';
        this.selectedNpc = found.index;
      } else if (found.kind === 'frontline') {
        this.tool = 'frontline';
      }
      this.syncPanel();
      this.refresh();
      return true;
    }

    const x = Math.max(0, Math.min(this.mapSize.width - 1, Math.round(wx)));
    const y = Math.max(0, Math.min(this.mapSize.height - 1, Math.round(wy)));
    const c = this.config[this.camp];
    if (this.tool === 'spawn') {
      c.spawn = { x, y };
      this.drag = { kind: 'spawn', camp: this.camp };
    } else if (this.tool === 'gateOut') {
      this.portals[this.portalKey(this.camp, 'out')] = { x, y };
      this.drag = { kind: 'gateOut', camp: this.camp };
    } else if (this.tool === 'gateExit') {
      c.gateExit = { x, y };
      this.drag = { kind: 'gateExit', camp: this.camp };
    } else if (this.tool === 'gateBack') {
      this.portals[this.portalKey(this.camp, 'back')] = { x, y };
      this.drag = { kind: 'gateBack', camp: this.camp };
    } else if (this.tool === 'marshal') {
      c.marshal = { x, y };
      this.drag = { kind: 'marshal', camp: this.camp };
    } else if (this.tool === 'frontline') {
      const list = [...c.frontlines, { x, y }];
      c.frontlines = list;
      this.drag = { kind: 'frontline', camp: this.camp, index: list.length - 1 };
    } else if (this.tool === 'npc') {
      const role = ($<HTMLSelectElement>('tk-npc-role').value || 'soldier') as NpcGroupRole;
      const count = Math.max(1, Math.min(30, Math.round(Number(field('tk-npc-count').value) || 6)));
      const radius = Math.max(0, Math.min(2000, Math.round(Number(field('tk-npc-radius').value) || 260)));
      const list = [...c.npcSpawns, { role, x, y, count, radius }];
      c.npcSpawns = list;
      this.selectedNpc = list.length - 1;
      this.drag = { kind: 'npc', camp: this.camp, index: this.selectedNpc };
    }
    this.dirty = true;
    this.syncPanel();
    this.refresh();
    return true;
  }

  pointerMove(wx: number, wy: number): boolean {
    if (!this.drag || !this.config) return false;
    const x = Math.max(0, Math.min(this.mapSize.width - 1, Math.round(wx)));
    const y = Math.max(0, Math.min(this.mapSize.height - 1, Math.round(wy)));
    const c = this.config[this.drag.camp];
    if (this.drag.kind === 'spawn') c.spawn = { x, y };
    else if (this.drag.kind === 'gateExit') c.gateExit = { x, y };
    else if (this.drag.kind === 'marshal') c.marshal = { x, y };
    else if (this.drag.kind === 'gateOut') this.portals[this.portalKey(this.drag.camp, 'out')] = { x, y };
    else if (this.drag.kind === 'gateBack') this.portals[this.portalKey(this.drag.camp, 'back')] = { x, y };
    else if (this.drag.kind === 'frontline') {
      const list = [...c.frontlines];
      if (list[this.drag.index]) { list[this.drag.index] = { x, y }; c.frontlines = list; }
    } else if (this.drag.kind === 'npc') {
      const list = [...c.npcSpawns];
      if (list[this.drag.index]) { list[this.drag.index] = { ...list[this.drag.index], x, y }; c.npcSpawns = list; }
    }
    this.dirty = true;
    this.syncPanel();
    this.refresh();
    return true;
  }

  pointerUp(): void {
    this.drag = null;
  }

  draw(ctx: CanvasRenderingContext2D, zoom: number): void {
    if (!this.config) return;
    const inv = 1 / zoom;
    const drawLink = (from: TkPoint | null, to: TkPoint | null, color: string) => {
      if (!from || !to) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * inv;
      ctx.setLineDash([6 * inv, 4 * inv]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    };
    const drawPin = (p: TkPoint | null, label: string, color: string, shape: 'circle' | 'diamond' | 'star' = 'circle', selected = false) => {
      if (!p) return;
      const r = (selected ? 9 : 7) * inv;
      const ok = this.standable(p.x, p.y);
      ctx.save();
      ctx.fillStyle = ok ? color : '#f26c5a';
      ctx.strokeStyle = selected ? '#ffffff' : '#101211';
      ctx.lineWidth = (selected ? 2.5 : 1.5) * inv;
      ctx.beginPath();
      if (shape === 'diamond') {
        ctx.moveTo(p.x, p.y - r * 1.2);
        ctx.lineTo(p.x + r * 1.2, p.y);
        ctx.lineTo(p.x, p.y + r * 1.2);
        ctx.lineTo(p.x - r * 1.2, p.y);
        ctx.closePath();
      } else {
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.font = `600 ${Math.max(10, Math.round(12 * inv))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#101211';
      ctx.fillText(label, p.x + inv, p.y - r - 4 * inv + inv);
      ctx.fillStyle = ok ? color : '#f2ad9b';
      ctx.fillText(label, p.x, p.y - r - 4 * inv);
      ctx.restore();
    };

    for (const c of ['tong', 'kim'] as const satisfies readonly TkCamp[]) {
      const cfg = this.config[c];
      const col = CAMP_COLORS[c];
      const tag = c === 'tong' ? 'T' : 'K';
      const pOut = this.portals[this.portalKey(c, 'out')];
      const pBack = this.portals[this.portalKey(c, 'back')];

      // Vùng an toàn hậu doanh (hình elip 2:1 theo isoDistance của game: dy * 2)
      ctx.save();
      ctx.strokeStyle = col;
      ctx.fillStyle = c === 'tong' ? 'rgba(232,184,120,0.08)' : 'rgba(213,140,255,0.08)';
      ctx.lineWidth = 2 * inv;
      ctx.setLineDash([8 * inv, 6 * inv]);
      ctx.beginPath();
      ctx.ellipse(cfg.spawn.x, cfg.spawn.y, cfg.safeRadius, cfg.safeRadius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawLink(pOut, cfg.gateExit, col);
      drawLink(pBack, cfg.spawn, '#7ec8a0');

      cfg.frontlines.forEach((f, idx) => drawPin(f, `${tag}:TT${idx + 1}`, '#9fd5b5', 'circle'));
      cfg.npcSpawns.forEach((g, idx) => {
        const isSel = c === this.camp && idx === this.selectedNpc;
        drawPin(g, `${tag}:${NPC_ROLE_LABELS[g.role]}×${g.count}`, col, 'circle', isSel);
      });

      drawPin(cfg.spawn, `${tag}:Tập trung`, col, 'circle');
      drawPin(pOut, `${tag}:Cổng ra`, '#77d4fc', 'diamond');
      drawPin(cfg.gateExit, `${tag}:Đáp ngoài`, '#77d4fc', 'circle');
      drawPin(pBack, `${tag}:Cổng về`, '#7ec8a0', 'diamond');
      drawPin(cfg.marshal, `${tag}:Soái`, '#ff7b72', 'star');
    }
  }
}
