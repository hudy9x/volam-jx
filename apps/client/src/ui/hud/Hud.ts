import { characterAuto, setCharacterAutoEnabled } from '../../state/characterAuto';
import type { FactionDef, MapMeta } from '@vltk/shared';
import type { MapActor, MapLabel, NpcTalk, ViewRect, WindowId, WorldActions, WorldUi } from '../../game/ports';
import type { ActorState } from '../../state/actor';
import { FACTIONS, isoDistance } from '@vltk/shared';
import { keyLabel } from '../../input/keymap';
import { progress } from '../../state/progress';
import { skillbar } from '../../state/skillbar';
import { addSyslog, syslogFor, syslogReady } from '../../state/syslog';
import { dialogs } from '../kit/dialog';
import { mount } from '../kit/dom';
import { tooltip } from '../kit/tooltip';
import type { LoadingScreen } from '../screens/loading';
import { AutoWindow } from '../windows/auto';
import { BigMap } from '../windows/bigmap';
import { CharacterWindow } from '../windows/character';
import { DeathWindow } from '../windows/death';
import { ForgeWindow } from '../windows/forge';
import { HorseShopWindow } from '../windows/horseShop';
import { InventoryWindow } from '../windows/inventory';
import { TokenWindow } from '../windows/token';
import { TeamWindow } from '../windows/team';
import { SuggestWindow } from '../windows/suggest';
import { NpcTalkWindow } from '../windows/npcTalk';
import { SettingsWindow } from '../windows/settings';
import { ShopWindow } from '../windows/shop';
import { SkillsWindow } from '../windows/skills';
import { StashWindow } from '../windows/stash';
import { SystemWindow } from '../windows/system';
import { TradeConfirm } from '../windows/tradeConfirm';
import { TravelWindow } from '../windows/travel';
import type { HudContext, NearbyPlayer } from './context';
import { MinimapPanel } from './minimap';
import { Notices } from './notices';
import { ChatBox } from './chat';
import { ChatReactsWindow } from '../windows/chatReacts';
import { Quickbar } from './quickbar';
import { StatusIcons } from './status';
import { Vitals } from './vitals';
import './hud.css';
import { bindHudViewport } from '../kit/viewport';

/** Hệ thống menu actions that leave the world (app/App.ts). */
export interface AppActions {
  switchCharacter: () => void;
  quit: () => void;
}

interface Shown { hp: number; mp: number; maxHp: number; maxMp: number; pk: number | null; dead: boolean | null; pos: string; players: number; horse: string | null; mounted: boolean | null }
const FRESH: Shown = { hp: -1, mp: -1, maxHp: -1, maxMp: -1, pk: null, dead: null, pos: '', players: -1, horse: null, mounted: null };

/**
 * The in-game interface (desktop layout): builds the HUD parts (hud/) and windows (windows/) and implements the
 * world scene's contract (game/ports.ts WorldUi). It holds no game logic: it shows what the scene / state give it and
 * passes the player's orders on through WorldActions.
 */
export class Hud implements WorldUi {
  readonly root: HTMLElement;
  readonly bigmap: BigMap;
  private readonly vitals: Vitals;
  private readonly status: StatusIcons;
  private readonly minimap: MinimapPanel;
  private readonly quickbar: Quickbar;
  private readonly notices: Notices;
  private readonly bag: InventoryWindow;
  private readonly stash: StashWindow;
  private readonly team: TeamWindow;
  private suggestWin?: SuggestWindow;
  private readonly shop: ShopWindow;
  private readonly character: CharacterWindow;
  private readonly horseShop: HorseShopWindow;
  private readonly travel: TravelWindow;
  private readonly skills: SkillsWindow;
  private readonly npcTalk: NpcTalkWindow;
  private readonly system: SystemWindow;
  private readonly settings: SettingsWindow;
  private readonly autoWin: AutoWindow;
  private readonly death: DeathWindow;
  private actions: WorldActions | null = null;
  private app: AppActions | null = null;
  /** Last values written to the DOM; `null` / -1 forces the next update to write. */
  private last: Shown = { ...FRESH };
  private self: ActorState | null = null;
  /** Level · faction · hệ last shown in the corner. */
  private charKey = '';
  /** Tự động đánh (this session only; its options live in settings). */
  private autoOn = false;
  onAuto: ((on: boolean) => void) | null = null;

  constructor(parent: HTMLElement, private loadingScreen: LoadingScreen) {
    this.root = mount(parent, '<div id="hud" class="hidden"></div>');
    bindHudViewport(this.root);
    this.root.addEventListener('viewportchange', () => tooltip.hide());
    const ctx: HudContext = {
      actions: () => this.actions, self: () => this.self, notice: text => this.notice(text), openBag: () => this.bag.toggle(true),
      toggleBag: () => this.bag.toggle(),
      nearbyPlayers: () => this.nearby,
      suggest: kind => this.suggestWin?.open(kind),
    };
    const root = this.root;
    // DOM order = paint order of the original page: HUD parts, tooltip, then the windows.
    this.vitals = new Vitals(root);
    this.status = new StatusIcons(root);
    this.minimap = new MinimapPanel(root, {
      moveTo: (x, y) => this.actions?.moveTo(x, y),
      openTravel: () => this.toggleWindow('travel'),
      toggleBigMap: () => this.bigmap.toggle(),
    });
    this.quickbar = new Quickbar(root, {
      bag: () => this.toggleWindow('bag'),
      character: () => this.toggleWindow('char'),
      auto: () => this.autoWin.open(),
      autoOptions: () => this.autoWin.open(),
      skills: open => this.skills.toggle(open),
      mount: () => this.toggleMount(),
      pk: () => this.actions?.pk(),
      shop: () => this.toggleWindow('shop'),
      system: () => this.toggleWindow('system'),
      kytran: () => this.toggleWindow('kytran'),
      team: () => this.toggleWindow('team'),
      notice: text => this.notice(text),
      useItem: defId => this.actions?.useItem(defId),
    });
    this.notices = new Notices(root);
    const chatBox = new ChatBox(root, ctx);
    const chatReacts = new ChatReactsWindow(root, () => this.self?.name);
    chatBox.onShowReacts = (id, emoji) => chatReacts.open(id, emoji);
    tooltip.mount(root);
    const trade = new TradeConfirm(root);
    this.bag = new InventoryWindow(root, ctx, trade);
    this.stash = new StashWindow(root, ctx);
    const token = new TokenWindow(root, ctx);
    this.team = new TeamWindow(root, ctx);
    this.suggestWin = new SuggestWindow(root, ctx);
    this.bag.onToken = () => token.open();
    this.character = new CharacterWindow(root, ctx);
    const forge = new ForgeWindow(root, ctx);
    this.shop = new ShopWindow(root, ctx, trade, kind => forge.open(kind));
    token.onForge = () => forge.open(undefined, true);
    this.horseShop = new HorseShopWindow(root, ctx, trade);
    this.travel = new TravelWindow(root, ctx);
    this.skills = new SkillsWindow(root, ctx);
    this.bigmap = new BigMap(root, (x, y) => { this.minimap.plant(x, y); this.actions?.moveTo(x, y); });
    this.npcTalk = new NpcTalkWindow(root);
    this.system = new SystemWindow(root, {
      openAuto: () => this.autoWin.open(),
      openSettings: () => this.settings.open(),
      switchCharacter: () => this.app?.switchCharacter(),
      quit: () => this.app?.quit(),
    });
    this.settings = new SettingsWindow(root);
    this.autoWin = new AutoWindow(root, on => this.setAuto(on));
    this.notices.onAutoToggle = () => this.setAuto(!this.autoOn);
    characterAuto.watch(value => this.setAuto(value.enabled));
    this.death = new DeathWindow(root, () => this.actions?.respawn());
    progress.watch(p => { if (p) this.vitals.setExp(p.progress.exp, p.expNext); });
    dialogs.onIdleEscape = () => dialogs.toggle('menu-dlg');
  }

  /** Callbacks of the Hệ thống menu (set once by the app). */
  setApp(app: AppActions): void {
    this.app = app;
  }

  // ======================= WorldUi (game/ports.ts) =======================

  loading(text: string | null): void {
    this.loadingScreen.set(text);
  }

  notice(text: string): void {
    this.notices.notice(text);
  }

  show(meta: MapMeta, actions: WorldActions): void {
    this.actions = actions;
    this.root.classList.remove('hidden');
    this.death.show(false);
    this.quickbar.setPkAllowed(meta.pvp);
    this.minimap.setMap(meta);
    this.bigmap.setMap(meta);
    this.bigmap.tool?.mapChanged();
    this.last = { ...FRESH };
    this.travel.setMap(meta);
    this.enteredMap = meta.name;
    this.logMap();
  }

  /**
   * Map just entered, written to the Hệ thống channel once the character (whose log it is) is known: the scene meets
   * its own actor (setCharacter) before or after show(), depending on when the room state arrives.
   */
  private enteredMap: string | null = null;
  private logMap(): void {
    if (!this.enteredMap || !syslogReady()) return;
    addSyslog({ kind: 'map', text: `Vào bản đồ ${this.enteredMap}.` });
    this.enteredMap = null;
  }

  setCharacter(actor: ActorState, faction: FactionDef | undefined): void {
    this.self = actor;
    syslogFor(actor.name);
    this.logMap();
    this.vitals.setCharacter(actor, faction, progress.get()?.series);
    this.charKey = '';
    skillbar.setCharacter(actor.name, actor.faction);
    this.shop.render();
  }

  update(self: ActorState, players: number): void {
    this.self = self;
    // Level ups and joining a faction: name line, portrait, the skill lists.
    const series = progress.get()?.series;
    const charKey = `${self.level}|${self.faction}|${series}`;
    if (charKey !== this.charKey) {
      this.charKey = charKey;
      this.vitals.setCharacter(self, FACTIONS[self.faction], series);
      skillbar.setFaction(self.faction);
    }
    const l = this.last;
    if (self.hp !== l.hp || self.maxHp !== l.maxHp) {
      l.hp = self.hp; l.maxHp = self.maxHp;
      this.vitals.setHp(self.hp, self.maxHp);
    }
    if (self.mp !== l.mp || self.maxMp !== l.maxMp) {
      l.mp = self.mp; l.maxMp = self.maxMp;
      this.vitals.setMp(self.mp, self.maxMp);
    }
    if (self.pk !== l.pk) {
      l.pk = self.pk;
      this.quickbar.setPk(self.pk);
    }
    const dead = self.hp <= 0;
    if (dead !== l.dead) {
      l.dead = dead;
      this.death.show(dead);
    }
    if (self.horse !== l.horse || self.mounted !== l.mounted) {
      l.horse = self.horse;
      l.mounted = self.mounted;
      this.quickbar.setHorse(self.horse, self.mounted);
    }
    const pos = `Tọa độ ${Math.round(self.x / 8)}/${Math.round(self.y / 16)}`;
    if (pos !== l.pos) { l.pos = pos; this.minimap.setPos(pos); }
    if (players !== l.players) { l.players = players; this.minimap.setPlayers(players); }

    this.quickbar.update();
    this.status.update(self);
    this.character.update(self);
  }

  /** Other players of the map, from the minimap's actor list (tổ đội window). */
  private nearby: NearbyPlayer[] = [];
  private nearbyAt = 0;

  drawMinimap(actors: Iterable<MapActor>, selfId: string, view: ViewRect): void {
    if (performance.now() - this.nearbyAt < 500) { this.minimap.draw(actors, selfId, view); return; }
    this.nearbyAt = performance.now();
    const list = [...actors];
    // Players inside the camera view (what the player sees), nearest to the centre first.
    const cx = view.x + view.width / 2, cy = view.y + view.height / 2;
    this.nearby = list.filter(a => a.state.kind === 'player' && a.id !== selfId && a.state.hp > 0
        && a.x >= view.x && a.x <= view.x + view.width && a.y >= view.y && a.y <= view.y + view.height)
      .map(a => ({ name: a.state.name ?? '', level: a.state.level ?? 0, camp: a.state.camp, faction: a.state.faction, team: a.state.team,
        dist: isoDistance(a.x, a.y, cx, cy) }))
      .sort((a, b) => a.dist - b.dist);
    actors = list;
    this.minimap.draw(actors, selfId, view);
  }

  drawBigMap(actors: Iterable<MapActor>, selfId: string, labels: MapLabel[]): void {
    this.bigmap.draw(actors, selfId, labels);
  }

  toggleWindow(id: WindowId, open?: boolean): void {
    switch (id) {
      case 'bag': this.bag.toggle(open); break;
      case 'stash': this.stash.toggle(open); break;
      case 'char': this.character.toggle(open); break;
      case 'skills': this.skills.toggle(open); break;
      case 'bigmap': this.bigmap.toggle(open); break;
      case 'travel': this.travel.toggle(open); break;
      case 'shop': this.shop.toggle('smith', open); break;
      case 'drugstore': this.shop.toggle('drug', open); break;
      case 'kytran': this.shop.toggle('kytran', open); break;
      case 'horse-shop': this.horseShop.toggle(open); break;
      case 'system': this.system.toggle(open); break;
      case 'team': this.team.toggle(open); break;
    }
  }

  /** Lên / xuống ngựa (key M). */
  toggleMount(): void {
    const self = this.self;
    if (!self || !this.actions) return;
    if (!self.horse) {
      this.notice(`Chưa có ngựa: mua ở Bán ngựa trong thành, mặc vào ô Ngựa (Trang bị, ${keyLabel('char')}) rồi bấm ${keyLabel('mount')}.`);
      return;
    }
    this.actions.mount(!self.mounted);
  }

  talk(npc: NpcTalk): void {
    this.npcTalk.talk(npc);
  }

  openAuto(): void { this.autoWin.open(); }

  get auto(): boolean {
    return this.autoOn;
  }

  /** Start / stop auto-fight (`why` = notice shown when it stops by itself). */
  setAuto(on: boolean, why?: string): void {
    if (on === this.autoOn) { this.autoWin.setChecked(on); return; }
    this.autoOn = on;
    setCharacterAutoEnabled(on);
    this.autoWin.setChecked(on);
    this.notices.setAutoBadge(on);
    this.quickbar.setAuto(on);
    this.notice(why ?? (on ? 'Bắt đầu tự động đánh quái quanh đây.' : 'Đã dừng tự động đánh.'));
    this.onAuto?.(on);
  }

  // ======================= app =======================

  /** Leaving the world: hide everything (auto-fight off without a notice). */
  hide(): void {
    if (this.autoOn) { this.autoOn = false; this.autoWin.setChecked(false); this.notices.setAutoBadge(false); this.quickbar.setAuto(false); }
    this.root.classList.add('hidden');
    dialogs.closeAll(true);
    tooltip.hide();
  }
}
