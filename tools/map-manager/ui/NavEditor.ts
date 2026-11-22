export interface NavOverrideDoc {
  override: { unblock: number[]; block: number[] };
  revision: string;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class NavEditor {
  brush: 'unblock' | 'block' = 'unblock';
  brushSize = 3;
  revision = '';
  dirty = false;
  private baseBlocked = new Uint8Array(0);
  private unblockSet = new Set<number>();
  private blockSet = new Set<number>();
  private columns = 0;
  private rows = 0;
  private cellW = 32;
  private cellH = 16;
  private blockedRef: Uint8Array = new Uint8Array(0);
  hoverCell: { col: number; row: number } | null = null;

  constructor(private refresh: () => void) {
    this.bindPanel();
  }

  setup(
    columns: number,
    rows: number,
    cellW: number,
    cellH: number,
    baseBlocked: Uint8Array,
    blockedTarget: Uint8Array,
    doc: NavOverrideDoc,
  ): void {
    this.columns = columns;
    this.rows = rows;
    this.cellW = cellW;
    this.cellH = cellH;
    this.baseBlocked = new Uint8Array(baseBlocked);
    this.blockedRef = blockedTarget;
    this.unblockSet = new Set(doc.override.unblock);
    this.blockSet = new Set(doc.override.block);
    this.revision = doc.revision;
    this.dirty = false;
    this.applyToBlocked();
    this.syncPanel();
  }

  saved(doc: NavOverrideDoc): void {
    this.unblockSet = new Set(doc.override.unblock);
    this.blockSet = new Set(doc.override.block);
    this.revision = doc.revision;
    this.dirty = false;
    this.applyToBlocked();
    this.syncPanel();
  }

  payload() {
    return {
      override: {
        unblock: [...this.unblockSet].sort((a, b) => a - b),
        block: [...this.blockSet].sort((a, b) => a - b),
      },
      revision: this.revision,
    };
  }

  private applyToBlocked(): void {
    this.blockedRef.set(this.baseBlocked);
    const max = this.blockedRef.length * 8;
    for (const idx of this.unblockSet) {
      if (idx >= 0 && idx < max) this.blockedRef[idx >> 3] &= ~(1 << (idx & 7));
    }
    for (const idx of this.blockSet) {
      if (idx >= 0 && idx < max) this.blockedRef[idx >> 3] |= (1 << (idx & 7));
    }
  }

  private bindPanel(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-nav-brush]').forEach(btn => {
      btn.onclick = () => {
        this.brush = btn.dataset.navBrush === 'block' ? 'block' : 'unblock';
        this.syncPanel();
      };
    });
    $<HTMLSelectElement>('nav-brush-size').onchange = () => {
      this.brushSize = Math.max(1, Math.min(15, Number($<HTMLSelectElement>('nav-brush-size').value) || 3));
      this.refresh();
    };
    $('nav-reset-all').onclick = () => {
      if (!this.unblockSet.size && !this.blockSet.size) return;
      this.unblockSet.clear();
      this.blockSet.clear();
      this.dirty = true;
      this.applyToBlocked();
      this.syncPanel();
      this.refresh();
    };
  }

  syncPanel(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-nav-brush]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.navBrush === this.brush));
    });
    $<HTMLSelectElement>('nav-brush-size').value = String(this.brushSize);
    $('nav-summary').textContent = `Đã mở: ${this.unblockSet.size} ô · Đã chặn thêm: ${this.blockSet.size} ô · ${this.dirty ? 'Chưa lưu' : 'Đã nạp bản lưu'}`;
    $<HTMLButtonElement>('nav-reset-all').disabled = !this.unblockSet.size && !this.blockSet.size;
  }

  paint(wx: number, wy: number): boolean {
    if (!this.columns || !this.rows) return false;
    const cc = Math.floor(wx / this.cellW);
    const cr = Math.floor(wy / this.cellH);
    const half = Math.floor(this.brushSize / 2);
    let changed = false;
    for (let dr = -half; dr <= half; dr++) {
      const r = cr + dr;
      if (r < 0 || r >= this.rows) continue;
      for (let dc = -half; dc <= half; dc++) {
        const c = cc + dc;
        if (c < 0 || c >= this.columns) continue;
        const idx = r * this.columns + c;
        const baseIsBlocked = Boolean((this.baseBlocked[idx >> 3] >> (idx & 7)) & 1);
        if (this.brush === 'unblock') {
          if (this.blockSet.delete(idx)) changed = true;
          if (baseIsBlocked && !this.unblockSet.has(idx)) {
            this.unblockSet.add(idx);
            changed = true;
          }
          this.blockedRef[idx >> 3] &= ~(1 << (idx & 7));
        } else {
          if (this.unblockSet.delete(idx)) changed = true;
          if (!baseIsBlocked && !this.blockSet.has(idx)) {
            this.blockSet.add(idx);
            changed = true;
          }
          this.blockedRef[idx >> 3] |= (1 << (idx & 7));
        }
      }
    }
    if (changed) {
      this.dirty = true;
      this.syncPanel();
      this.refresh();
    }
    return changed;
  }

  drawCursor(ctx: CanvasRenderingContext2D, zoom: number): void {
    if (!this.hoverCell || !this.columns || !this.rows) return;
    const half = Math.floor(this.brushSize / 2);
    const x = (this.hoverCell.col - half) * this.cellW;
    const y = (this.hoverCell.row - half) * this.cellH;
    const w = this.brushSize * this.cellW;
    const h = this.brushSize * this.cellH;
    ctx.save();
    ctx.strokeStyle = this.brush === 'unblock' ? '#7ec8a0' : '#f2ad9b';
    ctx.fillStyle = this.brush === 'unblock' ? 'rgba(126,200,160,0.22)' : 'rgba(242,173,155,0.22)';
    ctx.lineWidth = 2 / zoom;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}
