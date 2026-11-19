import Phaser from 'phaser';
import {
  skillActionMs, SPEED, HORSE_IDS, PLAYER_SPEED, resolveSpeed, stepToward, trackBasePercent, type SpeedConfiguration,
  FACTIONS, FACTION_IDS, ITEM_LIST, SKILL_CATEGORY_NAMES, SkillEngine, getSkill, isCastable, learnTiers, lookOfOutfit,
  JUMP, SkillStyle, isExternal, TRIGGER_NAMES, castRange, direction8, isoDistance, maxLevelOf, skillCategory, skillRange, starterEquipment, stateDurationMs, stateLines,
  jumpMs, tierOf, triggersOf, weaponName,
  type Combatant, type EnginePort, type FxEvent, type Outfit, type SkillDef,
 monsterCombat,} from '@vltk/shared';
import { ActorView, type ActorState } from '../../game/actors/ActorView';
import { Effects } from '../../game/fx/Effects';
import { DPR, uiPx } from '../../game/display';
import { SkillLabPanel } from './SkillLabPanel';
import { readSpeedSample, type GameSpeedSample } from './speedSample';

interface LabActor { state: ActorState; c: Combatant; view: ActorView; states: Map<number, number> }

/** Weapon item (level 1) for a skill's EqtLimit, so the caster holds what the skill needs. */
function weaponItem(type: number | undefined): string | undefined {
  if (type === undefined || type === -2) return undefined;
  if (type === -1) return '';
  const id = type >= 100 ? `range-${type - 100}-1` : `melee-${type}-1`;
  return ITEM_LIST.some(i => i.id === id) ? id : undefined;
}

/**
 * Dev-only skill lab (`?skills`): runs the shared SkillEngine in the browser against training dummies, with
 * the same effect renderer as the world. Left panel: click a faction / skill. Keys: ↑/↓ faction · ←/→ skill ·
 * +/− level · Space cast at the dummy · click on the ground: cast at that point · A: auto-cast.
 */
export class SkillLabScene extends Phaser.Scene {
  private engine!: SkillEngine;
  private effects!: Effects;
  private views = new Map<string, ActorView>();
  private actors: LabActor[] = [];
  private caster!: LabActor;
  private faction = 0;
  private skillIndex = 0;
  private level = 10;
  private auto = false;
  private autoRun = false;
  private speedSample: GameSpeedSample | null = readSpeedSample(location.search);
  private useSampleSpeeds = true;
  private attackPercent: number = trackBasePercent('attack', SPEED);
  private runPercent: number = trackBasePercent('run', SPEED);
  private speedConfig: SpeedConfiguration = structuredClone(SPEED);
  private runDirection = 1;
  private castCount = 0;
  private info!: Phaser.GameObjects.Text;
  private panel!: SkillLabPanel;
  private poseUntil = 0;
  private home = { x: 0, y: 0 };

  constructor() { super('skills'); }

  create(): void {
    document.title = 'VTLK - SKILL Test';
    this.cameras.main.setBackgroundColor('#2f3a2a');
    this.cameras.main.roundPixels = true;
    const W = this.scale.width, H = this.scale.height, compact = W / DPR < 650;
    const cx = Math.round(Math.max(350, W * 0.42)), cy = Math.round(H * 0.58);
    this.caster = this.addActor('caster', 'player', cx, cy);
    this.home = { x: cx, y: cy };
    if (compact) this.cameras.main.startFollow(this.caster.view.anchor, false, 1, 1, W * 0.22, 0);
    const spots = [[300, 0], [380, -50], [380, 50], [470, 0], [300, -100], [300, 100], [560, -60], [560, 60]];
    spots.forEach(([dx, dy], i) => this.addActor(`dummy${i}`, 'monster', cx + dx, cy + dy));

    const port: EnginePort = {
      now: () => this.time.now,
      random: Math.random,
      combatants: () => this.actors.map(a => a.c),
      get: id => this.actors.find(a => a.c.id === id)?.c,
      hostile: (a, b) => a.kind !== b.kind && !b.dead,
      friendly: (a, b) => a.kind === b.kind && !b.dead,
      // Lab fighters: level-10 curve stats (formulas/combat.ts); the caster's weapon damage comes from baseDamage.
      stats: c => ({ ...monsterCombat(10, c.element, 0, 0, {}), kind: c.kind, physMin: c.baseDamage[0], physMax: c.baseDamage[1], weaponType: c.weaponType }),
      damage: (_a, b, hit) => {
        const t = this.actors.find(x => x.c === b)!;
        t.state.hp = Math.max(1, t.state.hp - hit.dmg);
        this.effects.handle([{ t: 'hit', id: b.id, dmg: hit.dmg, crit: hit.crit || undefined }]);
        t.state.anim = 'hurt';
        t.state.animSeq++;
        this.time.delayedCall(300, () => { if (t.state.anim === 'hurt') t.state.anim = 'idle'; });
      },
      heal: (_a, b, v) => this.effects.handle([{ t: 'heal', id: b.id, v }]),
      addState: (b, st) => {
        const t = this.actors.find(x => x.c === b)!;
        const fresh = !t.states.has(st.skill);
        t.states.set(st.skill, st.ms > 0 ? this.time.now + st.ms : Infinity);
        if (fresh) this.effects.handle([{ t: 'st', id: b.id, skill: st.skill, kind: st.kind }]);
      },
      removeState: (b, skill) => { this.actors.find(x => x.c === b)?.states.delete(skill); },
      blink: (a, x, y) => { a.a.x = this.caster.state.x = Math.round(x); a.a.y = this.caster.state.y = Math.round(y); },
      jump: (a, x, y) => { // Khinh công: fly there (no map here, nothing blocks)
        const d = isoDistance(a.a.x, a.a.y, x, y);
        if (d < JUMP.minRange) return 0;
        const ms = jumpMs(d);
        this.caster.state.jumpMs = ms;
        this.tweens.add({ targets: [a.a, this.caster.state], x: Math.round(x), y: Math.round(y), duration: ms });
        return ms;
      },
      dash: (a, b) => {
        const d = isoDistance(a.a.x, a.a.y, b.a.x, b.a.y), k = Math.max(0, (d - 40) / d);
        a.a.x = this.caster.state.x = Math.round(a.a.x + (b.a.x - a.a.x) * k);
        a.a.y = this.caster.state.y = Math.round(a.a.y + (b.a.y - a.a.y) * k);
      },
      emit: (e: FxEvent) => this.effects.handle([e]),
    };
    this.engine = new SkillEngine(port);
    this.effects = new Effects(this, this.views, 'caster', () => undefined);

    const style = { fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: uiPx(13), color: '#f1e6cf', stroke: '#000', strokeThickness: 3 };
    this.info = this.add.text(12, 10, '', { ...style, fontSize: uiPx(14), color: '#e8c879' }).setDepth(2e6).setScrollFactor(0);
    if (compact) this.info.setVisible(false);
    this.panel = new SkillLabPanel({
      faction: i => this.selectFaction(i),
      skill: i => this.selectSkill(i),
      level: d => { this.level += d; this.refresh(); },
      cast: () => this.castAt(this.actors[1]),
      auto: () => { this.auto = !this.auto; this.refresh(); },
      speed: (kind, percent) => { this.useSampleSpeeds = false; if (kind === 'attack') this.attackPercent = percent; else this.runPercent = percent; this.refresh(); },
      mode: mode => { this.auto = mode === 'attack' || mode === 'both'; this.autoRun = mode === 'run' || mode === 'both'; this.refresh(); },
      mounted: on => { this.caster.c.a.mounted = this.caster.state.mounted = on; this.caster.state.horse = on ? HORSE_IDS[0] : ''; this.refresh(); },
      configuration: config => { this.speedConfig = config; this.refresh(); },
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.panel.destroy());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.panel.destroy());

    const k = this.input.keyboard!;
    k.on('keydown', (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,select,textarea,button')) return;
      const n = FACTION_IDS.length, m = Math.max(1, this.skills().length);
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this.selectFaction((this.faction + (e.key === 'ArrowUp' ? n - 1 : 1)) % n); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.selectSkill((this.skillIndex + (e.key === 'ArrowLeft' ? m - 1 : 1)) % m);
      else if (e.key === '+' || e.key === '=') { this.level++; this.refresh(); }
      else if (e.key === '-') { this.level--; this.refresh(); }
      else if (e.key === ' ') { e.preventDefault(); this.castAt(this.actors[1]); }
      else if (e.key.toLowerCase() === 'a') { this.auto = !this.auto; this.refresh(); }
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const hit = this.actors.slice(1).find(a => a.view.contains(p.worldX, p.worldY));
      if (hit) this.castAt(hit);
      else this.castAt(undefined, { x: p.worldX, y: p.worldY });
    });
    const sample = this.speedSample;
    if (sample) {
      const factionIndex = FACTION_IDS.indexOf(sample.faction as typeof FACTION_IDS[number]);
      if (factionIndex >= 0) this.faction = factionIndex;
      const skillIndex = this.skills().findIndex(s => s.id === sample.skill);
      if (skillIndex >= 0) this.skillIndex = skillIndex;
      this.level = sample.level;
      this.caster.c.a.mounted = this.caster.state.mounted = sample.mounted;
      this.caster.state.horse = sample.horse;
      this.panel.switchTab('speed');
    }
    this.refresh();
  }

  private addActor(id: string, kind: 'player' | 'monster', x: number, y: number): LabActor {
    const state: ActorState = {
      kind, name: kind === 'player' ? '' : 'Cọc gỗ', sprite: kind === 'monster' ? 'enemy178' : '', faction: '', series: kind === 'monster' ? 'kim' : '', gender: 'male',
      level: 1, x, y, dir: kind === 'player' ? 6 : 2, anim: 'idle', animSeq: 0, jumpMs: 0, hp: 1e6, maxHp: 1e6, mp: 0, maxMp: 0,
      pk: 0, camp: '', team: '', boss: false, scale: 1, protectedUntil: 0, horse: '', mounted: false, helm: 18, armor: 18, weapon: 0,
    };
    const c: Combatant = {
      id, kind, a: { x, y, dir: state.dir, mounted: false, maxHp: 1e6 }, hp: 1e6, dead: false, element: 'kim', mp: 1e9,
      baseDamage: [60, 100], weaponType: -1, skills: new Map(), cooldowns: new Map(),
    };
    const view = new ActorView(this, id, state, false, false);
    this.views.set(id, view);
    const a = { state, c, view, states: new Map<number, number>() };
    this.actors.push(a);
    return a;
  }

  private selectFaction(i: number): void {
    if (i !== this.faction) { this.faction = i; this.skillIndex = 0; }
    this.goHome();
    this.refresh();
  }

  private selectSkill(i: number): void {
    this.skillIndex = i;
    this.goHome();
    this.refresh();
  }

  /** Back to the start spot (new skill / faction). */
  goHome(): void {
    this.engine.cancel(this.caster.c.id);
    this.poseUntil = this.time.now;
    this.caster.state.anim = 'idle';
    this.caster.state.animSeq++;
    this.caster.c.a.x = this.caster.state.x = this.home.x;
    this.caster.c.a.y = this.caster.state.y = this.home.y;
  }

  /** Skills of the current faction in tier order: everything castable plus the passives (120 ones included). */
  private skills(): SkillDef[] {
    const skills = learnTiers(FACTION_IDS[this.faction]).flatMap(t => t.skills).map(id => getSkill(id)!)
      .filter(s => s && (isCastable(s) || skillCategory(s) === 'passive'));
    const sampled = this.speedSample && getSkill(this.speedSample.skill);
    if (sampled && isCastable(sampled) && !skills.some(s => s.id === sampled.id)) skills.unshift(sampled);
    return skills;
  }

  /** Passive shown as "always on" on the caster while it is selected. */
  private passiveShown: number | null = null;

  private current(): SkillDef | undefined {
    return this.skills()[this.skillIndex];
  }

  /** Dress the caster for the faction and the weapon the current skill needs. */
  private refresh(): void {
    const sample = this.speedSample, current = this.current();
    if (sample && this.useSampleSpeeds) {
      this.attackPercent = current && isExternal(current, this.level) ? sample.attack : sample.cast;
      this.runPercent = sample.run;
    }
    const run = resolveSpeed('run', this.runPercent, this.speedConfig);
    this.caster.state.moveScale = run.multiplier;
    this.caster.state.runMs = run.cycleMs;
    if (!this.autoRun && this.time.now >= this.poseUntil) this.caster.state.anim = 'idle';
    const fid = FACTION_IDS[this.faction];
    const faction = FACTIONS[fid];
    const s = this.current();
    if (s) this.level = Math.max(1, Math.min(maxLevelOf(s), this.level));
    const gender = this.speedSample?.gender === 'female' ? 'female' : this.speedSample?.gender === 'male' ? 'male' : faction.gender ?? 'male';
    const equip: Outfit = { ...starterEquipment(fid, gender) };
    const w = weaponItem(s?.weapon);
    if (w === '') delete equip.weapon;
    else if (w) equip.weapon = w;
    const look = lookOfOutfit(equip);
    Object.assign(this.caster.state, { gender, faction: fid, name: faction.name, helm: look.helm, armor: look.armor, weapon: look.weapon });
    if (s) {
      this.caster.c.skills = new Map([[s.id, this.level]]);
      this.caster.c.weaponType = s.weapon ?? -1;
    }
    // A selected passive is always on: show it as a state on the caster (recorded only, like in the game).
    const passive = s && skillCategory(s) === 'passive' ? s.id : null;
    if (passive !== this.passiveShown) {
      if (this.passiveShown !== null) this.caster.states.delete(this.passiveShown);
      if (passive !== null) this.caster.states.set(passive, Infinity);
      this.passiveShown = passive;
    }

    this.panel.render({
      faction: this.faction, skillIndex: this.skillIndex, skills: this.skills(), level: this.level,
      maxLevel: s ? maxLevelOf(s) : 0, auto: this.auto,
      autoRun: this.autoRun, mounted: this.caster.state.mounted,
      attackPercent: this.attackPercent, runPercent: this.runPercent, config: this.speedConfig,
      source: sample && this.useSampleSpeeds ? `Từ ${sample.name}: game đánh +${sample.attackBonus}/+${sample.castBonus}%, chạy ${sample.runPoints} điểm. Đã tính ngựa/bùa/chậm vào tổng %; chọn chiêu để dùng tốc ngoại/nội tương ứng.` : 'Game hiển thị % cộng thêm và điểm chạy. Trang này nhập tổng %: ví dụ đánh +125% → nhập 225.',
    });
    if (!s) { this.info.setText(`${faction.name}: không có chiêu chủ động`); return; }
    const cat = skillCategory(s);
    const triggers = triggersOf(s, this.level).map(t => `${TRIGGER_NAMES[t.kind].toLowerCase()} ${t.chance}% → ${getSkill(t.skill)?.name}`);
    const dmg = cat === 'passive'
      ? [...stateLines(s, this.level), ...triggers.map(t => `tự kích hoạt ${t}`),
        triggers.length ? 'Space / Đánh: xem chiêu kích hoạt' : 'luôn có hiệu lực'].join(' · ')
      : cat === 'attack' ? 'sát thương theo công thức (docs/formulas/damage.md)'
      : [...stateLines(s, this.level), ...(s.events?.start ? stateLines(getSkill(s.events.start)!, this.level) : [])].join(' · ')
        + (cat === 'buff' || cat === 'debuff' ? ` · ${Math.round(stateDurationMs(s, this.level) / 1000)} giây` : '');
    this.info.setText([
      `${faction.name} · ${s.name} [${s.id}] · ${tierOf(fid, s.id)?.label ?? ''} · cấp ${this.level}/${maxLevelOf(s)} · ${SKILL_CATEGORY_NAMES[skillCategory(s)]}${s.aura ? ' (hào quang: đánh lần nữa để tắt)' : ''}` +
        `${s.weapon !== undefined ? ` · ${weaponName(s.weapon)}` : ''} ${skillRange(s, this.level) > 0 ? ` · tầm ${skillRange(s, this.level)}` : ''}${this.auto ? ' · TỰ ĐỘNG' : ''}`,
      dmg,
      'Click phái / chiêu ở bảng trái (hoặc ↑/↓ ←/→) · +/− cấp · Space: đánh cọc gỗ · Click mặt đất: đánh vào điểm · A: tự đánh',
    ].join('\n'));
  }

  private castAt(target: LabActor | undefined, point?: { x: number; y: number }): void {
    const s = this.current();
    if (!s || this.time.now < this.poseUntil) return;
    if (skillCategory(s) !== 'passive') { this.castSkill(s, this.level, target, point); return; }
    // Passive: fire what it triggers (in the game it fires by itself on hit / when hit, with its chance).
    const triggers = triggersOf(s, this.level);
    if (!triggers.length) { this.effects.handle([{ t: 'st', id: 'caster', skill: s.id, kind: 'buff' }]); return; }
    for (const tr of triggers) {
      const sub = getSkill(tr.skill)!;
      this.caster.c.skills.set(sub.id, tr.level);
      this.castSkill(sub, tr.level, this.actors[1], undefined);
    }
  }

  private castSkill(s: SkillDef, level: number, target: LabActor | undefined, point?: { x: number; y: number }): void {
    const c = this.caster.c;
    const cat = skillCategory(s);
    // Heals, bùa lợi, auras: on yourself. Jumps (Khinh công, Mê Ảnh Tung) go towards the dummy.
    const selfCast = s.style === SkillStyle.State || cat === 'support' || cat === 'buff';
    if (selfCast && !(s.style === SkillStyle.Melee && !s.child)) { target = this.caster; point = undefined; }
    const aim = target ? { x: target.c.a.x, y: target.c.a.y } : point!;
    // Like the server: close in to the skill's range first (the lab just steps there).
    const range = castRange(s, level);
    const dist = isoDistance(c.a.x, c.a.y, aim.x, aim.y);
    if (target && target !== this.caster && dist > range) {
      const k = (range * 0.85) / dist;
      c.a.x = this.caster.state.x = Math.round(aim.x - (aim.x - c.a.x) * k);
      c.a.y = this.caster.state.y = Math.round(aim.y - (aim.y - c.a.y) * k);
    }
    const dx = aim.x - c.a.x, dy = aim.y - c.a.y;
    c.a.dir = this.caster.state.dir = direction8(dx, dy);
    if (!this.engine.ready(c, s.id)) return;
    const duration = skillActionMs(s, resolveSpeed('attack', this.attackPercent, this.speedConfig).cycleMs, !!((this.caster.state.ctl ?? 0) & 2));
    const pose = this.engine.cast(c, s.id, target === this.caster ? undefined : target?.c, aim, duration);
    if (pose.rejected) { this.caster.state.name = pose.note ?? 'Không thể thi triển'; return; }
    this.caster.state.hp = c.hp;
    this.castCount++;
    this.poseUntil = this.time.now + pose.ms;
    this.caster.state.actionMs = pose.ms;
    this.caster.state.anim = pose.anim;
    this.caster.state.animSeq++;

  }

  update(time: number, delta: number): void {
    this.engine.update();
    let turn = !this.autoRun;
    if (time >= this.poseUntil) {
      this.caster.state.anim = 'idle';
      if (this.autoRun) {
        const mounted = !!this.caster.state.mounted;
        const run = resolveSpeed('run', this.runPercent, this.speedConfig, mounted);
        const start = this.home.x - 20, end = this.home.x + 220;
        const target = { x: this.runDirection > 0 ? end : start, y: this.home.y + 140 };
        const state = this.caster.state;
        const speed = run.velocity ?? (PLAYER_SPEED * this.speedConfig.run.distanceScale * run.multiplier);
        const [x, y, arrived] = stepToward(state.x, state.y, target.x, target.y,
          speed * delta / 1000);
        state.dir = this.caster.c.a.dir = direction8(x - state.x, y - state.y);
        this.caster.c.a.x = state.x = x; this.caster.c.a.y = state.y = y;
        state.anim = 'run';
        if (arrived) { this.runDirection *= -1; turn = true; }
      }
      if (this.auto && turn) this.castAt(this.actors[1]);
    }
    for (const a of this.actors) {
      if (a.c.kind === 'monster' && a.state.hp < 9e5) a.state.hp = 1e6;
      for (const [id, until] of a.states) if (until <= time) a.states.delete(id);
      a.state.states = [...a.states.keys()];
      a.view.update(delta / 1000);
    }
    this.effects.update();
  }
}
