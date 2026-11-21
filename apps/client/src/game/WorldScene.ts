import { itemViewer } from '../state/progress';
import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import { Callbacks, CloseCode } from '@colyseus/sdk';
import {
  combatRulesAt, combatPairRules, AutoPlay, castRange, getSkill, isMelee, skillCategory, skillResourceCost, canPaySkillCost, equipError, TOWN_MAP_ID, TK_BATTLE_MAP_ID, pvpAllowed, type Camp,
  C2S, FACTIONS, ITEMS, MAPS, NPC_LINES, S2C, TOWN_NPCS, hasNav, registerNav,
  type FxEvent, type MapMeta, type NavFile, type NoticeMsg, type TownNpc, type TransferMsg,
} from '@vltk/shared';
import { ActorView, type ActorState } from './actors/ActorView';
import { npcState } from './actors/npcs';
import { GroundView, type GroundState } from './actors/GroundView';
import { Effects } from './fx/Effects';
import { MapView } from './map/MapView';
import { audio } from './audio/Audio';
import { MAP_MUSIC } from './audio/sounds.gen';
import { NPC_WINDOWS, type WorldActions, type WorldUi } from './ports';
import { cursorCss, type CursorKind } from '../art/cursors';
import { KEYS, SLOT_KEYS, type KeyAction } from '../input/keymap';
import { bagIndexOf, inventory } from '../state/inventory';
import { settings } from '../state/settings';
import { BASIC_SKILL, skillbar, type BarSlot } from '../state/skillbar';
import { assetUrl } from '../art/assets';
import { setActiveZoom, stepZoom, ui, uiPx, zoomPlate, worldRenderScale, textResolution, type ZoomPct } from './display';

/**
 * The map being played: draws the original map, actors and effects, turns clicks / keys into orders for the server,
 * and feeds the interface through the WorldUi contract (ports.ts) — it never touches the interface's code.
 */
export interface WorldData {
  room: Room;
  ui: WorldUi;
  onTransfer: (mapId: number) => void;
  onDisconnect: (reason: string) => void;
}

const MOVE_REPEAT_MS = 150;

export class WorldScene extends Phaser.Scene {
  private room!: Room;
  private ui!: WorldUi;
  private meta!: MapMeta;
  private views = new Map<string, ActorView>();
  private effects!: Effects;
  private cleanups: (() => void)[] = [];
  private lastMoveSent = 0;
  private ready = false;
  private data_!: WorldData;
  private mapView: MapView | null = null;
  /** Client-side town NPCs (Thợ rèn, Xa phu). */
  private npcs: { view: ActorView; npc: TownNpc }[] = [];
  private portalLabels: Phaser.GameObjects.Text[] = [];
  /** Items / money on the ground (MapState.ground). */
  private ground = new Map<string, GroundView>();
  /** Tự động đánh (Hệ thống → Tự động đánh, phím Z). */
  private auto: AutoPlay | null = null;
  private actions!: WorldActions;
  private cursor: CursorKind | null = null;

  constructor() { super('world'); }

  init(data: WorldData): void {
    this.data_ = data;
    this.room = data.room;
    this.ui = data.ui;
    this.views = new Map();
    this.cleanups = [];
    this.ready = false;
  }

  create(): void {
    this.applyZoom(settings.get().zoom);
    const state = this.room.state as { mapId: number; actors: Map<string, ActorState> };
    this.meta = MAPS[state.mapId];
    // Original-client map, streamed by region around the camera; wait for the area around the player first.
    const map = new MapView(this, this.meta);
    this.mapView = map;
    const me = state.actors.get(this.room.sessionId);
    const at = me ? { x: me.x, y: me.y } : this.meta.raw.entry;
    this.ui.loading(`Đang tải bản đồ ${this.meta.name}…`);
    // The navigation grid (NPC placement) comes with the map, not with the code.
    const nav = hasNav(this.meta.id) ? Promise.resolve()
      : fetch(assetUrl(`${this.meta.assets}/nav.json`)).then(r => r.json()).then((n: NavFile) => registerNav(this.meta.id, n.navigation));
    Promise.all([map.ready(at.x, at.y), nav])
      .catch(err => console.error('map load failed', err))
      .then(() => { if (this.mapView === map) this.build(); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private build(): void {
    const { width, height } = this.meta.raw.size;
    this.drawPortals();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.setBackgroundColor('#000000');
    this.cleanups.push(settings.watch(s => this.applyZoom(s.zoom)));

    this.effects = new Effects(this, this.views, this.room.sessionId, skill => skillbar.startCooldown(skill));
    // Hào quang on a hand slot: the server keeps it on (each map room is new, so send it again here).
    let aura = -1;
    let autoAura: number | null = null;
    const sendAura = () => {
      const id = autoAura ?? skillbar.slotAura();
      if (id !== aura) { aura = id; this.room.send(C2S.aura, { skill: id }); }
    };
    this.setAutoAura = id => { autoAura = id; sendAura(); };
    sendAura();
    this.cleanups.push(skillbar.watch(sendAura));
    this.npcs = (TOWN_NPCS[this.meta.id] ?? []).map(npc => ({
      npc, view: new ActorView(this, npc.id, npcState(this.meta.id, npc), false, true),
    }));

    // ---- state sync: create / remove actor views ----
    const $ = Callbacks.get(this.room as any) as any;
    // Drops on the ground (VT7): views appear / go with MapState.ground.
    this.cleanups.push($.onAdd('ground', (g: GroundState, id: string) => { if (!this.ground.has(id)) this.ground.set(id, new GroundView(this, id, g)); }));
    this.cleanups.push($.onRemove('ground', (_g: GroundState, id: string) => { this.ground.get(id)?.destroy(); this.ground.delete(id); }));
    this.cleanups.push($.onAdd('actors', (actor: ActorState, id: string) => this.addView(id, actor)));
    this.cleanups.push($.onRemove('actors', (_actor: ActorState, id: string) => {
      const view = this.views.get(id);
      if (!view) return;
      view.destroy();
      this.views.delete(id);
    }));

    // ---- messages ----
    this.cleanups.push(this.room.onMessage(S2C.fx, (events: FxEvent[]) => this.effects.handle(events)));
    this.cleanups.push(this.room.onMessage(S2C.notice, (msg: NoticeMsg) => this.ui.notice(msg.text)));
    // Unexpected disconnects only: our own leave() (map transfer) closes with CONSENTED.
    const onLeave = (code: number) => {
      if (code === CloseCode.CONSENTED || code === 1000) return;
      this.data_.onDisconnect('Mất kết nối tới máy chủ.');
    };
    this.room.onLeave(onLeave);
    this.cleanups.push(() => this.room.onLeave.remove(onLeave));
    this.cleanups.push(this.room.onMessage(S2C.transfer, (msg: TransferMsg) => {
      this.room.onLeave.remove(onLeave);
      this.ready = false;
      this.data_.onTransfer(msg.mapId);
    }));

    this.actions = this.makeActions();
    this.setupInput();
    this.setupAuto();
    this.ui.show(this.meta, this.actions);
    this.ui.loading(null);
    // Chiến trường Tống Kim (378): mix luân phiên 6 bản nhạc chiến đấu; các map khác giữ nhạc gốc (musicset.txt).
    if (this.meta.id === TK_BATTLE_MAP_ID) {
      audio.playPlaylist(['music/music401', 'music/music402', 'music/music403', 'music/music404', 'music/music400', 'music/music500'], 93);
    } else {
      const music = MAP_MUSIC[this.meta.id];
      audio.playMusic(music?.[0], music?.[1]);
    }
    this.ready = true;
  }

  private addView(id: string, actor: ActorState): void {
    if (this.views.has(id)) return;
    const isSelf = id === this.room.sessionId;
    const view = new ActorView(this, id, actor, isSelf, this.meta.safe);
    this.views.set(id, view);
    if (isSelf) {
      this.cameras.main.startFollow(view.anchor, true, 0.15, 0.15);
      this.ui.setCharacter(actor, FACTIONS[actor.faction]);
    }
  }

  private get self(): ActorView | undefined {
    return this.views.get(this.room.sessionId);
  }

  private applyZoom(pct: number): ZoomPct {
    const z = setActiveZoom(pct);
    const plate = zoomPlate();
    this.cameras.main.setZoom(plate.zoom * worldRenderScale());
    for (const t of this.portalLabels) t.setScale(plate.textScale);
    for (const g of this.ground.values()) g.syncZoom();
    return z;
  }

  private drawPortals(): void {
    this.portalLabels = [];
    const s = zoomPlate().textScale;
    for (const p of this.meta.portals) {
      const ring = this.add.graphics().setDepth(p.y - 1);
      ring.fillStyle(0x6fd2ff, 0.25).fillEllipse(p.x, p.y, p.radius * 2.6, p.radius * 1.3);
      ring.lineStyle(2, 0xbfeaff, 0.9).strokeEllipse(p.x, p.y, p.radius * 2.6, p.radius * 1.3);
      this.tweens.add({ targets: ring, alpha: 0.45, duration: 900, yoyo: true, repeat: -1 });
      this.portalLabels.push(
        this.add.text(p.x, p.y - 28, `➜ ${p.label}`, {
          resolution: textResolution(), fontFamily: 'Segoe UI, sans-serif', fontSize: uiPx(14), color: '#bfeaff', stroke: '#000', strokeThickness: ui(4),
        }).setOrigin(0.5).setScale(s).setDepth(1e6),
      );
    }
  }

  // ======================= input =======================

  private setupInput(): void {
    this.input.mouse?.disableContextMenu();

    /** Use the skill in a bar slot (left / right mouse, keys 1–9) at a point / actor. */
    /** `lock`: left click on an enemy keeps attacking it (server side) until it dies or another order comes. */
    const cast = (slot: BarSlot, wx: number, wy: number, target?: ActorView, lock = false) => {
      if (!this.self || this.self.state.hp <= 0) return;
      // Keys 1–9 may hold a usable item (thuốc): no delay between two, and auto-fight carries on.
      const item = skillbar.itemAt(slot);
      if (item) { this.actions.useItem(item); return; }
      // A hào quang in a hand slot is on by itself (server, C2S.aura): the click attacks with the other hand's skill
      // (or Công kích vật lý) when it is on an enemy, otherwise it does nothing more.
      let skill = skillbar.skillAt(slot);
      if (typeof slot !== 'number' && skillbar.isAuraSlot(slot)) {
        if (!target || !this.isHostile(target)) return;
        const other = slot === 'left' ? 'right' : 'left';
        skill = !skillbar.isAuraSlot(other) ? skillbar.skillAt(other) ?? BASIC_SKILL : BASIC_SKILL;
      }
      if (skill === null) { this.ui.notice(`Ô này chưa có chiêu: mở Kỹ năng (${KEYS.skills.label}) và kéo chiêu vào.`); return; }
      const offensive = getSkill(skill);
      this.auto?.pause(this.time.now, lock && target && offensive && skillCategory(offensive) === 'attack' ? target.id : undefined);
      this.room.send(C2S.cast, { skill, targetId: target?.id, x: Math.round(wx), y: Math.round(wy), lock: lock && !!target });
    };
    const move = (wx: number, wy: number) => {
      this.lastMoveSent = this.time.now;
      this.auto?.pause(this.time.now, null);
      this.room.send(C2S.move, { x: Math.round(wx), y: Math.round(wy) });
    };

    const inside = (p: Phaser.Input.Pointer) => p.x >= 0 && p.y >= 0 && p.x < this.scale.width && p.y < this.scale.height;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.ready || !inside(p)) return;
      p.updateWorldPoint(this.cameras.main);
      // A drop under the cursor: pick it up (the server walks there first when far).
      const drop = !p.rightButtonDown() ? this.pickGround(p.worldX, p.worldY) : undefined;
      if (drop) { this.auto?.pause(this.time.now); this.room.send(C2S.pickup, { id: drop.id }); return; }
      const target = this.pickActor(p.worldX, p.worldY);
      if (p.rightButtonDown()) { cast('right', p.worldX, p.worldY, target && target.state.kind !== 'npc' ? target : undefined); return; }
      if (target && this.isHostile(target)) cast('left', target.x, target.y, target, true);
      else if (target?.state.kind === 'npc') this.talkTo(target);
      else if (target?.state.kind === 'player' && target.state.stallTitle && target.id !== this.room.sessionId) {
        this.room.send(C2S.stallInspect, { charId: target.id });
      }
      else move(p.worldX, p.worldY);
    });
    // Hold the left button to keep walking toward the cursor; otherwise show what a click would do (original cursors).
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.ready || !inside(p)) return;
      p.updateWorldPoint(this.cameras.main);
      const over = this.pickActor(p.worldX, p.worldY);
      const isStall = over?.state.kind === 'player' && !!over.state.stallTitle && over.id !== this.room.sessionId;
      this.setCursor(this.pickGround(p.worldX, p.worldY) ? 'pick'
        : !over ? 'normal' : over.state.kind === 'npc' || isStall ? 'talk' : this.isHostile(over) ? 'attack' : 'normal');
      if (!p.leftButtonDown() || this.time.now - this.lastMoveSent < MOVE_REPEAT_MS) return;
      if (over) return;
      move(p.worldX, p.worldY);
    });
    let wheelStepAt = 0;
    let wheelDir: -1 | 1 | 0 = 0;
    let pendingZoom: ZoomPct | null = null;
    let saveZoomTimer: ReturnType<typeof setTimeout> | null = null;
    const flushZoomSave = () => {
      if (saveZoomTimer !== null) { clearTimeout(saveZoomTimer); saveZoomTimer = null; }
      if (pendingZoom !== null && pendingZoom !== settings.get().zoom) settings.set({ zoom: pendingZoom });
      pendingZoom = null;
    };
    this.cleanups.push(flushZoomSave);

    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (dy === 0 || !inside(p)) return;
      const dir: -1 | 1 = dy > 0 ? -1 : 1;
      const now = performance.now();
      if (dir === wheelDir && now - wheelStepAt < 80) return;
      wheelStepAt = now;
      wheelDir = dir;
      const cur = pendingZoom ?? settings.get().zoom;
      const next = stepZoom(cur, dir);
      if (next === cur) return;
      pendingZoom = this.applyZoom(next);
      if (saveZoomTimer !== null) clearTimeout(saveZoomTimer);
      saveZoomTimer = setTimeout(flushZoomSave, 150);
    });

    const keys = this.input.keyboard;
    if (keys) {
      // Typing in a text box (map search…) must not trigger the game's hotkeys.
      const typing = (e: FocusEvent) => {
        keys.enabled = !(e.type === 'focusin' && (e.target as HTMLElement | null)?.matches?.('input:not([type=checkbox]):not([type=radio]), textarea'));
      };
      document.addEventListener('focusin', typing);
      document.addEventListener('focusout', typing);
      this.cleanups.push(() => { document.removeEventListener('focusin', typing); document.removeEventListener('focusout', typing); keys.enabled = true; });
      const atPointer = (slot: number) => {
        const p = this.input.activePointer;
        if (!inside(p)) return;
        const wp = this.cameras.main.getWorldPoint(p.x, p.y);
        const target = this.pickActor(wp.x, wp.y);
        cast(slot, wp.x, wp.y, target && target.state.kind !== 'npc' ? target : undefined);
      };
      // Shortcuts: input/keymap.ts. Esc is handled by the window manager (ui/kit/dialog.ts).
      SLOT_KEYS.forEach((name, i) => keys.on(`keydown-${name}`, () => atPointer(i)));
      const bind = (action: KeyAction, run: (event: KeyboardEvent) => void) => keys.on(`keydown-${KEYS[action].code}`, run);
      // Tab would move the browser focus: keep it for the big map.
      keys.addCapture(KEYS.bigmap.code);
      bind('skills', () => this.ui.toggleWindow('skills'));
      bind('bigmap', event => {
        if (event?.shiftKey) this.ui.toggleWindow('travel');
        else this.ui.toggleWindow('bigmap');
      });
      bind('pk', () => this.actions.pk());
      bind('team', () => this.ui.toggleWindow('team'));
      bind('kytran', () => this.ui.toggleWindow('kytran'));
      bind('shop', () => this.ui.toggleWindow('shop'));
      bind('mount', () => this.ui.toggleMount());
      bind('auto', event => {
        if (event?.shiftKey) this.ui.setAuto(!this.ui.auto);
        else this.ui.openAuto();
      });
      bind('bag', () => this.ui.toggleWindow('bag'));
      bind('char', () => this.ui.toggleWindow('char'));
      bind('travel', () => this.ui.toggleWindow('travel'));
    }
  }

  /** Original cursor on the game canvas (the page itself uses the normal one, see ui/kit/theme.css). */
  private setCursor(kind: CursorKind): void {
    if (kind === this.cursor) return;
    this.cursor = kind;
    this.game.canvas.style.cursor = cursorCss(kind);
  }

  /** The orders the interface (and auto-fight) give the world: one C2S message each (game/ports.ts). */
  private makeActions(): WorldActions {
    return {
      pk: () => this.room.send(C2S.pk, { mode: ((this.self?.state.pk ?? 0) + 1) % 3 }),
      team: msg => this.room.send(C2S.team, msg),
      suggest: msg => this.room.send(C2S.suggest, msg),
      respawn: () => this.room.send(C2S.respawn, {}),
      useItem: defId => {
        const index = bagIndexOf(defId);
        if (index < 0) this.ui.notice(`Trong hành trang không còn ${ITEMS[defId]?.name ?? 'vật phẩm này'}.`);
        else this.room.send(C2S.use, { index });
      },
      moveTo: (x, y) => this.room.send(C2S.move, { x, y }),
      mount: on => this.room.send(C2S.mount, { on }),
      equip: (index, slot) => this.room.send(C2S.equip, { index, slot }),
      unequip: slot => this.room.send(C2S.unequip, { slot }),
      buy: (item, count = 1) => this.room.send(C2S.buy, { item, count }),
      sell: index => this.room.send(C2S.sell, { index }),
      sellBatch: indices => { if (indices.length) this.room.send(C2S.sell, { indices }); },
      use: index => this.room.send(C2S.use, { index }),
      discard: index => this.room.send(C2S.discard, { index }),
      forge: (item, series, lines, token) => this.room.send(C2S.forge, { item, series, lines, token }),
      chat: (text, ch) => this.room.send(C2S.chat, { text, ch }),
      tradePost: msg => this.room.send(C2S.tradePost, msg),
      tradeBuy: id => this.room.send(C2S.tradeBuy, { id }),
      buyKnb: count => this.room.send(C2S.buyKnb, { count }),
      chatReact: (id, emoji) => this.room.send(C2S.chatReact, { id, emoji }),
      chatMore: before => this.room.send(C2S.chatMore, { before }),
      bagMove: (from, to) => this.room.send(C2S.bagMove, { from, to }),
      bagSort: (page, target) => this.room.send(C2S.bagSort, { page, target }),
      bagSplit: (from, qty, target, to) => this.room.send(C2S.bagSplit, { from, qty, target, to }),
      stashMove: (from, to) => this.room.send(C2S.stashMove, { from, to }),
      bagToStash: (from, to, page) => this.room.send(C2S.bagToStash, { from, to, page }),
      stashToBag: (from, to, page) => this.room.send(C2S.stashToBag, { from, to, page }),
      stashCurrency: (op, currency, amount) => this.room.send(C2S.stashCurrency, { op, currency, amount }),
      returnTraining: () => this.room.send(C2S.train, { returnPrevious: true }),
      teleport: mapId => this.room.send(C2S.teleport, { mapId }),
      setSkillLevel: (skill, level) => this.room.send(C2S.skillLevel, { skill, level }),
      devMoney: amount => this.room.send(C2S.devMoney, { amount }),
      devLevel: levels => this.room.send(C2S.devLevel, { levels }),
      devSpeed: msg => this.room.send(C2S.devSpeed, msg),
      addPotential: (stat, n) => this.room.send(C2S.addPotential, { stat, n }),
      joinFaction: faction => this.room.send(C2S.joinFaction, { faction }),
      raiseSkill: skill => this.room.send(C2S.raiseSkill, { skill }),
      token: msg => this.room.send(C2S.token, msg),
      stallInspect: charId => this.room.send(C2S.stallInspect, { charId }),
      stallPrice: (uid, price, currency) => this.room.send(C2S.stallPrice, { uid, price, currency }),
      stallOpen: title => this.room.send(C2S.stallOpen, { title }),
      stallClose: () => this.room.send(C2S.stallClose, {}),
      stallBuy: (sellerCharId, uid, price, currency) => this.room.send(C2S.stallBuy, { sellerCharId, uid, price, currency }),
      tkAction: msg => this.room.send(C2S.tkAction, msg),
    };
  }

  /** Auto-fight (shared auto/AutoPlay.ts, also the bots' brain) sends the same orders as clicks; the interface's switch starts / stops it. */
  private setAutoAura: (id: number | null) => void = () => {};

  private setupAuto(): void {
    const auto = new AutoPlay({
      learnedSkills: () => Object.keys(skillbar.levels).map(Number).filter(id => skillbar.levelOf(id) > 0),
      aura: id => this.setAutoAura(id),
      self: () => this.self,
      actors: () => this.views.values(),
      safe: () => !this.self || combatRulesAt(this.meta, this.self.state).safe,
      hostile: target => { const v = this.views.get(target.id); return !!v && this.isHostile(v); },
      skillAt: slot => skillbar.skillAt(slot),
      usable: skill => {
        const s = getSkill(skill);
        return !!s && skillbar.levelOf(skill) > 0 && skillbar.usable(skill) && !(s.noHorse && this.self?.state.mounted);
      },
      resourceCost: skill => { const s = getSkill(skill); return s ? skillResourceCost(s, Math.max(1, skillbar.levelOf(skill))) : undefined; },
      cost: skill => { const s = getSkill(skill); const c = s && skillResourceCost(s, Math.max(1, skillbar.levelOf(skill))); return c?.resource === 'mp' ? c.amount : 0; },
      ready: skill => {
        const s = getSkill(skill);
        if (!s || !skillbar.usable(skill) || !skillbar.offCooldown(skill)) return false;
        return !!this.self && canPaySkillCost(skillResourceCost(s, Math.max(1, skillbar.levelOf(skill))), this.self.state);
      },
      range: skill => { const s = getSkill(skill); return s ? castRange(s, Math.max(1, skillbar.levelOf(skill))) : 0; },
      melee: skill => { const s = getSkill(skill); return !!s && isMelee(s); },
      cast: (skill, target, x, y, lock, reach) => {
        skillbar.startCooldown(skill);
        this.room.send(C2S.cast, { skill, targetId: target?.id, x: Math.round(x), y: Math.round(y), lock, reach });
      },
      move: (x, y) => this.room.send(C2S.move, { x: Math.round(x), y: Math.round(y) }),
      bag: () => inventory.get().bag,
      money: () => inventory.get().money,
      use: index => this.actions.use(index),
      sell: index => this.actions.sell(index),
      sellBatch: indices => this.actions.sellBatch(indices),
      buy: (item, count) => this.actions.buy(item, count),
      sortBag: () => this.actions.bagSort(-1, 'bag'),
      wearable: def => { const v = itemViewer(this.self?.state ?? null); return !!v && !equipError(def, v); },
      drops: () => [...this.ground.values()].map(v => ({ id: v.id, x: v.g.x, y: v.g.y, owner: v.g.owner, team: v.g.team, def: v.g.def, q: v.g.q })),
      pickup: id => this.room.send(C2S.pickup, { id }),
      train: (quiet, returnPrevious) => this.room.send(C2S.train, { quiet, returnPrevious }),
      goTown: () => this.room.send(C2S.teleport, { mapId: TOWN_MAP_ID }),
      respawn: () => this.actions.respawn(),
      notice: text => this.ui.notice(text),
      stop: why => this.ui.setAuto(false, why),
    });
    this.auto = auto;
    this.ui.onAuto = on => {
      if (on) { auto.start(); auto.update(this.time.now, settings.get()); }
      else auto.stop();
    };
    // Auto stays on across maps (bãi luyện công, town round, revive — like jx-web-main): carry on on the new map.
    if (this.ui.auto) auto.start();
    this.cleanups.push(() => { if (this.ui.onAuto) this.ui.onAuto = null; this.auto = null; });
  }

  /** Drop under the cursor (front-most). */
  private pickGround(wx: number, wy: number): GroundView | undefined {
    let best: GroundView | undefined;
    for (const g of this.ground.values()) if (g.contains(wx, wy) && (!best || g.g.y > best.g.y)) best = g;
    return best;
  }

  /** Front-most actor under the cursor (excluding self), town NPCs included. */
  private pickActor(wx: number, wy: number): ActorView | undefined {
    let best: ActorView | undefined;
    const all = [...this.views.values(), ...this.npcs.map(n => n.view)];
    for (const view of all) {
      if (view.isSelf || !view.contains(wx, wy)) continue;
      if (!best || view.y > best.y) best = view;
    }
    return best;
  }

  /** Click on a town NPC: their talk window; the choice opens the shop, the map list or the horses. */
  private talkTo(view: ActorView): void {
    const npc = this.npcs.find(n => n.view === view)?.npc;
    if (!npc) return;
    if (npc.talk) {
      this.ui.talk({
        name: npc.name,
        res: npc.res,
        text: npc.talk.text,
        options: npc.talk.options.map(opt => ({ label: opt.label, run: () => this.actions.teleport(opt.toMap) })),
      });
      return;
    }
    const line = NPC_LINES[npc.action];
    if (npc.action === 'tkRecruit') {
      const camp = npc.tkCamp === 'kim' ? 'kim' : 'tong';
      const campName = camp === 'kim' ? 'Đại Kim' : 'Đại Tống';
      this.ui.talk({
        name: npc.name, res: npc.res,
        text: `Chiến trường Tống Kim đang chiêu mộ hào kiệt (cấp ≥ 60, phí 3.000 lượng). Hiệp sĩ muốn gia nhập phe ${campName}?`,
        options: [
          { label: `Báo danh phe ${campName} (3.000 lượng)`, run: () => this.actions.tkAction({ op: 'register', camp }) },
        ],
      });
      return;
    }
    if (npc.action === 'tkQuartermaster') {
      this.ui.talk({
        name: npc.name, res: npc.res, text: line.text,
        options: [
          { label: 'Mở cửa hàng Quân Nhu Quan (mua bằng điểm tích lũy)', run: () => this.ui.toggleWindow('tkshop', true) },
          { label: 'Đổi 500 điểm tích lũy (+50.000 EXP)', run: () => this.actions.tkAction({ op: 'exchangeExp', amount: 500 }) },
          { label: 'Đổi 1.000 điểm tích lũy (+100.000 EXP)', run: () => this.actions.tkAction({ op: 'exchangeExp', amount: 1000 }) },
          { label: 'Đổi 5.000 điểm tích lũy (+500.000 EXP)', run: () => this.actions.tkAction({ op: 'exchangeExp', amount: 5000 }) },
          { label: 'Đổi tất cả điểm tích lũy', run: () => this.actions.tkAction({ op: 'exchangeExp', amount: 0 }) },
        ],
      });
      return;
    }
    if (npc.action === 'tkScout') {
      this.ui.talk({
        name: npc.name, res: npc.res, text: line.text,
        options: [{ label: line.option, run: () => this.actions.tkAction({ op: 'scout' }) }],
      });
      return;
    }
    if (npc.action === 'tkGate') {
      this.ui.talk({
        name: npc.name, res: npc.res, text: line.text,
        options: [{ label: line.option, run: () => this.actions.tkAction({ op: 'exitGate' }) }],
      });
      return;
    }
    const winId = NPC_WINDOWS[npc.action];
    if (!winId) return;
    const open = () => this.ui.toggleWindow(winId, true);
    this.ui.talk({ name: npc.name, res: npc.res, text: line.text, options: [{ label: line.option, run: open }] });
  }

  /** Client-side hint only; the server decides with the same canAttack rules. */
  private isHostile(view: ActorView): boolean {
    if (view.state.hp <= 0 || !this.self || combatPairRules(this.meta, this.self.state, view.state).safe || view.state.kind === 'npc') return false;
    const me = this.self.state;
    if (me.battleCamp || view.state.battleCamp) {
      return !!me.battleCamp && !!view.state.battleCamp && me.battleCamp !== view.state.battleCamp;
    }
    if (view.state.kind === 'monster') return true;
    return !!me && combatPairRules(this.meta, me, view.state).pvp && view.state.kind === 'player' && pvpAllowed(
      { pk: me.pk, camp: (me.camp || 'new') as Camp, team: me.team ?? '' },
      { camp: (view.state.camp || 'new') as Camp, team: view.state.team ?? '' });
  }

  // ======================= frame =======================

  update(_time: number, deltaMs: number): void {
    if (!this.ready) return;
    const dt = deltaMs / 1000;
    for (const view of this.views.values()) { view.setPeaceful(combatRulesAt(this.meta, view.state).safe); view.update(dt); }
    for (const n of this.npcs) n.view.update(dt);
    this.effects.update();
    this.auto?.update(this.time.now, settings.get());
    this.mapView?.update(this.cameras.main.worldView);
    const self = this.self;
    if (self) {
      let players = 0;
      for (const v of this.views.values()) if (v.state.kind === 'player') players++;
      audio.listener = { x: self.x, y: self.y };
      this.ui.update(self.state, players);
      this.ui.drawMinimap(this.views.values(), this.room.sessionId, this.cameras.main.worldView);
      this.ui.drawBigMap(this.views.values(), this.room.sessionId, this.npcs.map(n => ({ x: n.view.x, y: n.view.y, name: n.npc.name })));
    }
  }

  private teardown(): void {
    for (const fn of this.cleanups) { try { fn(); } catch { /* listener already gone */ } }
    this.cleanups = [];
    this.effects?.destroy();
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    for (const n of this.npcs) n.view.destroy();
    for (const g of this.ground.values()) g.destroy();
    this.ground.clear();
    this.npcs = [];
    this.portalLabels = [];
    this.mapView?.destroy();
    this.mapView = null;
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.ready = false;
  }
}
