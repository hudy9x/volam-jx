import { DEFAULT_AUTO, normalizeAuto, type CharacterAuto, type TradePostMsg } from '@vltk/shared';
import { buyKnb, marketOnline, marketOffline, marketPost, marketBuy } from '../world/market.js';
import fs from 'node:fs';
import path from 'node:path';
import { Room, ServerError, type Client } from 'colyseus';
import { bestTrainingMap, trainingMaps, type TrainingMap, type TrainMsg, type TeamOrderMsg, type SuggestMsg, type TokenMsg,
  C2S, MAPS, PROGRESS_VERSION, S2C, expToNext, TICK_MS, TOWN_MAP_ID, getGrid,
  type BagMoveMsg, type BuyMsg, type CastMsg, type DevMoneyMsg, type DiscardMsg, type EquipMsg, type ForgeMsg, type InventoryMsg, type MountMsg, type AuraMsg, type ChatMsg, type ChatMoreMsg, type ChatReactMsg, type MoveMsg,
  type AddPotentialMsg, type DevLevelMsg, type PickupMsg, type JoinFactionMsg, type Potential, type RaiseSkillMsg, type StatsMsg, type LogMsg, type NoticeMsg, type OnlineMsg, type PkMsg, type SellMsg, type SkillLevelMsg, type SkillsMsg, type TeleportMsg, type TransferMsg,
  type UnequipMsg, type UseMsg,
} from '@vltk/shared';
import { verifyToken } from '../account/auth.js';
import { db } from '../account/db.js';
import { commandCast, commandMove, setMounted, setPk, setSkillLevel, setSlotAura } from '../world/commands.js';
import type { Sim } from '../world/entity.js';
import {
  addMoney, buyItem, discardItem, equipItem, forgeItem, moveBagItem, sellItem, unequipItem, useItem,
} from '../world/inventory.js';
import { useToken } from '../world/token.js';
import { teamOffline, teamOnline, teamOrder } from '../world/teams.js';
import { chatHistoryFor, chatOffline, chatOlder, chatOnline, onlineCount, chatReact, chatRoomOpen, chatSay } from '../world/chat.js';
import { addPlayer, revive } from '../world/players.js';
import { applyBotSetup } from '../world/botSetup.js';
import { applySuggestion, addPotential, expNext, gainExp, joinFaction, raiseSkill } from '../world/progress.js';
import { pickup } from '../world/systems/drops.js';
import { World } from '../world/World.js';
import { MapState } from './schema.js';
import { MAPS_DIR, PERF, devTools } from '../env.js';

interface JoinOptions { mapId: number; token: string; charId: string }
interface AuthData { username: string; charId: string }


/** charId -> roomId for every character currently in the world (one session per character). */
const online = new Map<string, string>();
/** Bãi luyện công (maps/training.ts) of the maps this machine has (map art + grid), computed once. */
let trainingCache: TrainingMap[] | null = null;
export const trainingList = (): TrainingMap[] => trainingCache ??= trainingMaps(id => fs.existsSync(path.join(MAPS_DIR, String(id), 'nav.json')));

/** Whether a character is in the game on some map (bot dev API: reset / delete only offline bots). */
export const isOnline = (charId: string): boolean => online.has(charId);

/** Live maps (dev tool: reload spawns after saving them). */
export const LIVE_WORLDS = new Map<number, World>();

/**
 * One room instance per map (`filterBy(['mapId'])`). The room only checks messages and wires the network to the
 * World; all gameplay lives in ../world/ (World.ts runs the tick).
 */
export class MapRoom extends Room<{ state: MapState }> {
  maxClients = 200;
  maxMessagesPerSecond = 30;
  private world!: World;
  private saveTimer = 0;
  private closeChat?: () => void;

  onCreate(options: JoinOptions): void {
    const mapId = Number(options.mapId);
    if (!MAPS[mapId]) throw new ServerError(400, `Unknown map ${options.mapId}`);
    this.state = new MapState();
    this.state.mapId = mapId;
    this.world = new World(mapId, this.state.actors, {
      transfer: (sim, toMap, x, y) => this.transfer(sim, toMap, x, y),
      notify: (sim, text) => this.notify(sim, text),
      log: (sim, kind, text) => this.clientOf(sim)?.send(S2C.log, { kind, text } satisfies LogMsg),
      announce: text => this.broadcast(S2C.notice, { text } satisfies NoticeMsg),
      progress: sim => { const c = this.clientOf(sim); if (c) this.sendStats(c, sim); },
      skills: sim => { const c = this.clientOf(sim); if (c) this.sendSkills(c, sim); },
      inventory: sim => { const c = this.clientOf(sim); if (c) { this.sendInventory(c, sim); this.saveCharacter(sim); } },
    });
    this.world.groundSync = this.state.ground;
    LIVE_WORLDS.set(mapId, this.world);

    this.onMessage(C2S.move, (client, msg: MoveMsg) => {
      const sim = this.simOf(client);
      if (sim) commandMove(this.world, sim, Number(msg?.x), Number(msg?.y));
    });
    this.onMessage(C2S.cast, (client, msg: CastMsg) => {
      const sim = this.simOf(client);
      if (!sim || !Number.isInteger(msg?.skill)) return;
      const target = typeof msg.targetId === 'string' ? msg.targetId : undefined;
      const reach = Number(msg.reach);
      commandCast(this.world, sim, msg.skill, target, Number(msg.x), Number(msg.y), msg.lock === true, Number.isFinite(reach) && reach > 0 ? reach : undefined);
    });
    // Dev (DEV_TOOLS, skill panel): set a learned skill's level.
    this.onMessage(C2S.skillLevel, (client, msg: SkillLevelMsg) => {
      if (!devTools()) return;
      const sim = this.simOf(client);
      if (!sim || !setSkillLevel(sim, Number(msg?.skill), Number(msg?.level))) return;
      this.sendSkills(client, sim);
      this.saveCharacter(sim);
    });
    this.onMessage(C2S.pk, (client, msg: PkMsg) => {
      const sim = this.simOf(client);
      if (sim) setPk(this.world, sim, Number(msg?.mode) || 0);
    });
    // Kênh chat Thế giới (world/chat.ts): every map room relays every line.
    this.closeChat = chatRoomOpen((type, msg) => this.broadcast(type, msg));
    this.onMessage(C2S.autoConfig, (client, msg: CharacterAuto) => {
      const sim = this.simOf(client); if (!sim?.charId) return;
      const auto: CharacterAuto = { enabled: msg?.enabled === true, settings: normalizeAuto(msg?.settings), revision: Date.now() };
      db.updateCharacter(sim.charId, { auto });
      client.send(S2C.autoConfig, auto);
    });
    this.onMessage(C2S.tradePost, (client, msg: TradePostMsg) => {
      const sim = this.simOf(client); if (!sim) return;
      const err = marketPost(sim, msg); client.send(S2C.tradePost, err ? { error: err } : {}); if (err) this.notify(sim, err);
    });
    this.onMessage(C2S.tradeBuy, (client, msg: { id: number }) => {
      const sim = this.simOf(client); if (!sim) return;
      const err = marketBuy(sim, Number(msg?.id)); client.send(S2C.tradeBuy, err ? { error: err } : {}); this.notify(sim, err ?? 'Mua vật phẩm thành công.');
    });
    this.onMessage(C2S.buyKnb, (client, msg: { count: number }) => {
      const sim = this.simOf(client); if (!sim) return;
      const err = buyKnb(sim, msg?.count, this.world.rules.safe);
      client.send(S2C.buyKnb, err ? { error: err } : {});
      if (err) this.notify(sim, err); else { this.sendInventory(client, sim); this.saveCharacter(sim); this.notify(sim, 'Đã mua Kim nguyên bảo.'); }
    });
    this.onMessage(C2S.chat, (client, msg: ChatMsg) => {
      const sim = this.simOf(client);
      if (!sim?.charId) return;
      const err = chatSay(sim.charId, sim.a.name, msg?.text, Date.now(), msg?.ch === 'trade' ? 'trade' : 'world');
      if (err) this.notify(sim, err);
    });
    this.onMessage(C2S.chatMore, (client, msg: ChatMoreMsg) => {
      const sim = this.simOf(client);
      const owner = sim?.charId ? db.getCharacter(sim.charId)?.owner : undefined;
      if (owner) client.send(S2C.chatOlder, chatOlder(owner, msg?.before));
    });
    this.onMessage(C2S.chatReact, (client, msg: ChatReactMsg) => {
      const sim = this.simOf(client);
      if (sim?.charId) chatReact(sim.charId, sim.a.name, msg?.id, msg?.emoji);
    });
    this.onMessage(C2S.aura, (client, msg: AuraMsg) => {
      const sim = this.simOf(client);
      if (sim) setSlotAura(this.world, sim, Number(msg?.skill) || 0);
    });
    this.onMessage(C2S.mount, (client, msg: MountMsg) => {
      const sim = this.simOf(client);
      if (!sim) return;
      setMounted(this.world, sim, !!msg?.on);
      this.saveCharacter(sim);
    });
    // Orders on the sender's Sim. inventoryOp: send inventory and any recalculated stats, then save;
    // progressOp: save (world/progress.ts sends its own messages).
    const inventoryOp = <M>(type: string, op: (sim: Sim, msg: M) => boolean) => this.onMessage(type, (client, msg: M) => {
      const sim = this.simOf(client);
      if (!sim) return;
      const previousStats = sim.stats;
      if (!op(sim, msg)) return;
      this.sendInventory(client, sim);
      if (sim.stats !== previousStats) this.sendStats(client, sim);
      this.saveCharacter(sim);
    });
    const progressOp = <M>(type: string, op: (sim: Sim, msg: M) => boolean) => this.onMessage(type, (client, msg: M) => {
      const sim = this.simOf(client);
      if (sim && op(sim, msg)) this.saveCharacter(sim);
    });

    // ---- hành trang / trang bị (world/inventory.ts) ----
    inventoryOp<EquipMsg>(C2S.equip, (sim, msg) =>
      equipItem(this.world, sim, Number(msg?.index), typeof msg?.slot === 'string' ? msg.slot : undefined));
    inventoryOp<UnequipMsg>(C2S.unequip, (sim, msg) => unequipItem(this.world, sim, String(msg?.slot)));
    inventoryOp<BuyMsg>(C2S.buy, (sim, msg) => buyItem(this.world, sim, String(msg?.item), Number(msg?.count ?? 1)));
    inventoryOp<SellMsg>(C2S.sell, (sim, msg) => sellItem(this.world, sim, Number(msg?.index)));
    inventoryOp<UseMsg>(C2S.use, (sim, msg) => useItem(this.world, sim, Number(msg?.index)));
    inventoryOp<DiscardMsg>(C2S.discard, (sim, msg) => discardItem(this.world, sim, Number(msg?.index)));
    inventoryOp<ForgeMsg>(C2S.forge, (sim, msg) => forgeItem(this.world, sim, String(msg?.item), Number(msg?.series),
      Array.isArray(msg?.lines) ? msg.lines.map(l => (Array.isArray(l) ? [String(l[0]), Number(l[1])] as [string, number] : null)) : [], msg?.token === true));
    inventoryOp<BagMoveMsg>(C2S.bagMove, (sim, msg) => moveBagItem(sim, Number(msg?.from), Number(msg?.to)));
    inventoryOp<PickupMsg>(C2S.pickup, (sim, msg) => pickup(this.world, sim, String(msg?.id)));

    // ---- progression: potential points (F3), faction at level 10, skill points, suggestions (world/progress.ts) ----
    progressOp<AddPotentialMsg>(C2S.addPotential, (sim, msg) => addPotential(this.world, sim, msg?.stat as Potential, Number(msg?.n)));
    progressOp<JoinFactionMsg>(C2S.joinFaction, (sim, msg) => joinFaction(this.world, sim, String(msg?.faction)));
    progressOp<RaiseSkillMsg>(C2S.raiseSkill, (sim, msg) => raiseSkill(this.world, sim, Number(msg?.skill)));
    progressOp<SuggestMsg>(C2S.suggest, (sim, msg) => (msg?.kind === 'skills' || msg?.kind === 'potential')
      && applySuggestion(this.world, sim, msg.kind, typeof msg.route === 'string' ? msg.route : undefined));

    // Tổ đội (world/teams.ts): across maps.
    this.onMessage(C2S.team, (client, msg: TeamOrderMsg) => {
      const sim = this.simOf(client);
      if (sim?.charId && typeof msg?.op === 'string') teamOrder(sim.charId, msg.op, typeof msg.name === 'string' ? msg.name.slice(0, 32) : '');
    });
    // Lệnh bài (world/token.ts). Changing sex rebuilds the character on the clients: rejoin the same map.
    this.onMessage(C2S.token, (client, msg: TokenMsg) => {
      const sim = this.simOf(client);
      if (!sim || typeof msg?.op !== 'string') return;
      const gender = sim.a.gender;
      const changed = useToken(this.world, sim, msg.op, Number(msg.suite), typeof msg.faction === 'string' ? msg.faction : undefined);
      if (changed) this.sendInventory(client, sim);
      this.saveCharacter(sim);
      if (sim.a.gender !== gender) this.transfer(sim, this.state.mapId, sim.a.x, sim.a.y);
    });
    // Dev (DEV_TOOLS): levels, to try factions / skill points quickly; money.
    this.onMessage(C2S.devLevel, (client, msg: DevLevelMsg) => {
      if (!devTools()) return;
      const sim = this.simOf(client);
      if (!sim?.progress) return;
      for (let i = 0; i < Math.min(50, Math.max(1, Math.floor(Number(msg?.levels) || 1))); i++) {
        const p = sim.progress.prog;
        gainExp(this.world, sim, expToNext(p.level) - p.exp);
      }
      this.saveCharacter(sim);
    });
    inventoryOp<DevMoneyMsg>(C2S.devMoney, (sim, msg) => devTools() && addMoney(sim, Math.min(10_000_000, Number(msg?.amount))));

    // ---- map travel (Xa phu / "Bản đồ" button) ----
    this.onMessage(C2S.teleport, (client, msg: TeleportMsg) => {
      const sim = this.simOf(client);
      const mapId = Number(msg?.mapId);
      if (!sim || !MAPS[mapId] || mapId === this.state.mapId) return;
      if (sim.dead) { this.notify(sim, 'Đang trọng thương, không thể đi xa.'); return; }
      // Map art + grid are generated per machine (npm run gen:maps); refuse maps that are not there yet.
      try { getGrid(mapId); } catch { this.notify(sim, `Bản đồ ${MAPS[mapId].name} chưa được tạo trên máy chủ.`); return; }
      const entry = MAPS[mapId].raw.entry;
      this.transfer(sim, mapId, entry.x, entry.y);
    });

    // Auto-play: the bãi luyện công of the character's level (shared maps/training.ts, monster levels of the spawn files).
    this.onMessage(C2S.train, (client, msg: TrainMsg) => {
      const sim = this.simOf(client);
      if (!sim || sim.dead || !sim.progress) return;
      const best = bestTrainingMap(trainingList(), sim.progress.prog.level);
      if (!best) { this.notify(sim, 'Không tìm thấy bãi luyện công.'); return; }
      if (best.mapId === this.state.mapId) { if (!msg?.quiet) this.notify(sim, `Đang ở bãi luyện công phù hợp: ${best.name} (quái cấp ${best.lo}–${best.hi}).`); return; }
      this.notify(sim, `Đổi bãi luyện công: ${best.name} (quái cấp ${best.lo}–${best.hi}).`);
      const entry = MAPS[best.mapId].raw.entry;
      this.transfer(sim, best.mapId, entry.x, entry.y);
    });

    this.onMessage(C2S.respawn, client => {
      const sim = this.simOf(client);
      if (!sim?.dead) return;
      const town = MAPS[TOWN_MAP_ID].raw.entry;
      if (this.state.mapId === TOWN_MAP_ID) revive(this.world, sim, town.x, town.y);
      else this.transfer(sim, TOWN_MAP_ID, town.x, town.y);
    });

    this.setSimulationInterval(dt => this.tick(dt), TICK_MS);
    this.setPatchRate(TICK_MS);
  }

  onAuth(_client: Client, options: JoinOptions): AuthData {
    const username = verifyToken(options?.token);
    if (!username) throw new ServerError(401, 'Phiên đăng nhập không hợp lệ');
    const char = db.getCharacter(String(options.charId));
    if (!char || char.owner !== username) throw new ServerError(403, 'Không tìm thấy nhân vật');
    if (char.mapId !== this.state.mapId) throw new ServerError(409, 'Nhân vật không ở bản đồ này');
    if (online.has(char.id)) throw new ServerError(409, 'Nhân vật đang ở trong game');
    return { username, charId: char.id };
  }

  onJoin(client: Client, _options: JoinOptions, auth: AuthData): void {
    const char = db.getCharacter(auth.charId)!;
    online.set(char.id, this.roomId);
    const sim = addPlayer(this.world, client.sessionId, char);
    // Bot made / reset by the dev API (dev/botAdmin.ts): its template is applied on its first entry.
    if (char.bot?.pending) {
      applyBotSetup(this.world, sim, char.bot.setup, char.bot.level, char.bot.faction);
      char.bot.pending = false;
      this.saveCharacter(sim);
    }
    marketOnline(sim, () => { this.sendInventory(client, sim); this.saveCharacter(sim); });
    client.send(S2C.autoConfig, char.auto ?? { enabled: false, settings: { ...DEFAULT_AUTO }, revision: 0 });
    this.sendInventory(client, sim);
    this.sendSkills(client, sim);
    this.sendStats(client, sim);
    if (!char.equip) this.saveCharacter(sim); // persist the starter outfit
    chatOnline(char.owner);
    client.send(S2C.online, { n: onlineCount() } satisfies OnlineMsg); // the broadcast may miss a client still joining
    client.send(S2C.chat, chatHistoryFor(char.owner));
    teamOnline(char.id, {
      sim, mapId: this.state.mapId, send: (type, msg) => client.send(type, msg), notify: text => this.notify(sim, text),
    });
  }

  private sendInventory(client: Client, sim: Sim): void {
    client.send(S2C.inventory, { ...(sim.pickedUp ? { pickedUp: sim.pickedUp } : {}), bag: sim.bag ?? [], equip: sim.equip ?? {}, money: sim.money ?? 0, knb: sim.knb ?? 0 } satisfies InventoryMsg);
    sim.pickedUp = undefined;
    this.sendSkills(client, sim); // worn pieces change skill levels (allskill_v)
  }

  private sendSkills(client: Client, sim: Sim): void {
    client.send(S2C.skills, {
      levels: Object.fromEntries(sim.skills), exp: Object.fromEntries(sim.progress?.skillExp ?? []),
      bonus: Object.fromEntries(sim.skillBonus ?? []),
    } satisfies SkillsMsg);
  }

  private sendStats(client: Client, sim: Sim): void {
    if (!sim.progress || !sim.stats) return;
    client.send(S2C.stats, {
      series: sim.progress.series, faction: sim.a.faction, progress: sim.progress.prog, expNext: expNext(sim), stats: sim.stats,
      combat: sim.combat,
    } satisfies StatsMsg);
  }

  private clientOf(sim: Sim): Client | undefined {
    return this.clients.find(c => c.sessionId === sim.sessionId);
  }

  onLeave(client: Client): void {
    const sim = this.world.sims.get(client.sessionId);
    if (!sim) return; // already transferred
    marketOffline(sim);
    this.saveCharacter(sim);
    this.world.removeSim(client.sessionId);
    teamOffline(sim.charId!, sim);
    const owner = db.getCharacter(sim.charId!)?.owner;
    if (owner) chatOffline(owner);
    if (online.get(sim.charId!) === this.roomId) online.delete(sim.charId!);
  }

  onDispose(): void {
    for (const sim of this.world.sims.values()) if (sim.charId) marketOffline(sim);
    this.closeChat?.();
    if (LIVE_WORLDS.get(this.state.mapId) === this.world) LIVE_WORLDS.delete(this.state.mapId);
    db.flush();
  }

  private tick(dt: number): void {
    const t0 = performance.now();
    this.world.update(dt);
    const events = this.world.takeEvents();
    if (events.length) this.broadcast(S2C.fx, events);
    if (PERF) this.recordPerf(performance.now() - t0, events.length);
    this.saveTimer += dt;
    if (this.saveTimer >= 10_000) {
      this.saveTimer = 0;
      for (const sim of this.world.sims.values()) if (sim.kind === 'player') this.saveCharacter(sim);
    }
  }

  // ---- PERF=1: log simulation cost every 10 s (for load tests with src/dev/bots.ts) ----
  private perf = { ticks: [] as number[], events: 0, since: Date.now() };

  private recordPerf(ms: number, events: number): void {
    const p = this.perf;
    p.ticks.push(ms);
    p.events += events;
    if (Date.now() - p.since < 10_000) return;
    const sorted = [...p.ticks].sort((a, b) => a - b);
    const pct = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(2);
    let players = 0, monsters = 0;
    for (const s of this.world.sims.values()) s.kind === 'player' ? players++ : monsters++;
    const secs = (Date.now() - p.since) / 1000;
    console.log(`[perf map ${this.state.mapId}] players=${players} monsters=${monsters} ` +
      `tick p50=${pct(0.5)}ms p99=${pct(0.99)}ms max=${sorted[sorted.length - 1].toFixed(2)}ms ` +
      `fxEvents/s=${Math.round(p.events / secs)}`);
    this.perf = { ticks: [], events: 0, since: Date.now() };
  }

  private simOf(client: Client): Sim | undefined {
    const sim = this.world.sims.get(client.sessionId);
    return sim?.kind === 'player' ? sim : undefined;
  }

  private saveCharacter(sim: Sim, at = { mapId: this.state.mapId, x: sim.a.x, y: sim.a.y }): void {
    if (sim.charId) {
      db.updateCharacter(sim.charId, {
        ...at, gender: sim.a.gender as never, horse: sim.a.horse || null, mounted: sim.a.mounted, bag: sim.bag?.slice(),
        bagSpill: sim.bagSpill?.length ? sim.bagSpill.slice() : undefined, equip: { ...sim.equip },
        skills: Object.fromEntries(sim.skills), money: sim.money ?? 0, knb: sim.knb ?? 0,
        ...(sim.progress ? {
          faction: sim.a.faction, series: sim.progress.series, level: sim.progress.prog.level, progress: sim.progress.prog,
          progressVersion: PROGRESS_VERSION, skillExp: Object.fromEntries(sim.progress.skillExp),
        } : {}),
      });
    }
  }

  /** Move a player to another map: persist the destination, drop them here, tell the client to rejoin. */
  private transfer(sim: Sim, mapId: number, x: number, y: number): void {
    const client = this.clients.find(c => c.sessionId === sim.sessionId);
    this.saveCharacter(sim, { mapId, x, y });
    marketOffline(sim);
    this.world.removeSim(sim.id);
    teamOffline(sim.charId!, sim);
    const owner = db.getCharacter(sim.charId!)?.owner;
    if (owner) chatOffline(owner);
    online.delete(sim.charId!);
    client?.send(S2C.transfer, { mapId } satisfies TransferMsg);
  }

  private notify(sim: Sim, text: string): void {
    this.clients.find(c => c.sessionId === sim.sessionId)?.send(S2C.notice, { text } satisfies NoticeMsg);
  }
}
