import fs from 'node:fs';
import path from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { BOT_FILE_RE, BOT_IDENTITIES, BOT_TONGKIM_TACTIC_IDS, normalizeBotScenario, type BotTongKimTactic, type TkCamp } from '@vltk/shared';

export interface RunningBot { username:string; scenario:string; title:string; phase:'preparing'|'queued'|'online'|'reconnecting'|'stopping'; runId:string }
export interface LiveTkTactics { all: BotTongKimTactic | null; tong: BotTongKimTactic | null; kim: BotTongKimTactic | null }
interface Run { child:ChildProcess; bots:Map<string,RunningBot>; log:string; title:string; scenario:string; tongkim:boolean; }
/** Owns only children launched by this tools app. Game restarts do not restart this manager or its children. */
export class RunManager {
  private runs = new Map<string,Run>();
  private starting = new Map<string,number>();
  private errors: { message:string; at:number }[] = [];
  private assignments: Record<string,string> = {};
  private liveTkTactics: LiveTkTactics = { all: null, tong: null, kim: null };
  constructor(private here:string, private dataDir:string) {
    const file=path.join(dataDir,'.assignments.json');
    if(fs.existsSync(file)) {
      const saved=JSON.parse(fs.readFileSync(file,'utf8'));
      for(const [user,scenario] of Object.entries(saved)) if(BOT_IDENTITIES.has(user)&&typeof scenario==='string'&&BOT_FILE_RE.test(scenario)) this.assignments[user]=scenario;
    }
  }
  private saveAssignments():void {
    fs.mkdirSync(this.dataDir,{recursive:true});
    const file=path.join(this.dataDir,'.assignments.json'), temp=file+'.tmp';
    fs.writeFileSync(temp,JSON.stringify(this.assignments,null,2)+'\n');fs.renameSync(temp,file);
  }
  async replace(scenario:unknown,users:unknown,server:unknown):Promise<void> {
    if(typeof scenario!=='string'||!BOT_FILE_RE.test(scenario)||!fs.existsSync(path.join(this.dataDir,scenario+'.json'))) throw Error('Chọn một kịch bản đã lưu.');
    if(!Array.isArray(users)||!users.length||users.length>200||users.some(id=>typeof id!=='string'||!BOT_IDENTITIES.has(id))) throw Error('Chọn nhân vật hợp lệ.');
    if(typeof server!=='string'||!/^https?:\/\/[^\s]+$/.test(server)) throw Error('Địa chỉ máy chủ không hợp lệ.');
    normalizeBotScenario(JSON.parse(fs.readFileSync(path.join(this.dataDir,scenario+'.json'),'utf8')));
    const readOnline=async()=>{
      const response=await fetch(`${server.replace(/\/$/,'')}/api/dev/bots`,{signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw Error('Không đọc được trạng thái bot.');
      return await response.json() as {username:string;online:boolean}[];
    };
    const existing=await readOnline();
    if(existing.some(bot=>bot.online&&users.includes(bot.username)&&!this.status().bots.some(active=>active.username===bot.username))) throw Error('Có bot online ngoài quyền quản lý công cụ. Hãy dừng lượt chạy bên ngoài trước.');
    this.stop(users);
    const deadline=Date.now()+15000;
    while(this.status().bots.some(bot=>users.includes(bot.username))||(await readOnline()).some(bot=>bot.online&&users.includes(bot.username))) {
      if(Date.now()>deadline)throw Error('Bot chưa dừng xong. Hãy thử chạy lại sau.');
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    await this.start(scenario,users,server);
  }
  async resume(users:unknown,server:unknown):Promise<void> {
    if(!Array.isArray(users)||!users.length||users.some(id=>typeof id!=='string'||!BOT_IDENTITIES.has(id))) throw Error('Chọn bot đã có kịch bản.');
    const groups=new Map<string,string[]>();
    for(const user of new Set(users as string[])) {
      const scenario=this.assignments[user];
      if(!scenario||!fs.existsSync(path.join(this.dataDir,scenario+'.json'))) throw Error('Có bot chưa có kịch bản hoặc kịch bản đã bị xóa.');
      if(this.status().bots.some(bot=>bot.username===user)) continue;
      groups.set(scenario,[...(groups.get(scenario)??[]),user]);
    }
    for(const [scenario,ids] of groups) await this.start(scenario,ids,server);
  }
  async toggleScenario(scenario:unknown,server:unknown):Promise<void> {
    if(typeof scenario!=='string'||!BOT_FILE_RE.test(scenario)) throw Error('Kịch bản không hợp lệ.');
    const active=this.status().bots.filter(bot=>bot.scenario===scenario);
    if(active.length) {this.stop(active.map(bot=>bot.username));return;}
    const users=Object.keys(this.assignments).filter(user=>this.assignments[user]===scenario);
    await this.resume(users,server);
  }
  status(): { assignments:Record<string,string>; bots:RunningBot[]; errors:{message:string;at:number}[]; tkTactics:LiveTkTactics; tkRunning:boolean } {
    return {
      assignments:{...this.assignments},
      bots:[...this.runs.values()].flatMap(run=>[...run.bots.values()]),
      errors:this.errors.slice(-5),
      tkTactics:{...this.liveTkTactics},
      tkRunning:[...this.runs.values()].some(run=>run.tongkim&&run.bots.size>0),
    };
  }
  setTkTactic(tactic:unknown, camp?:unknown): void {
    const val: BotTongKimTactic | null = tactic === null || tactic === '' || tactic === 'default'
      ? null
      : (BOT_TONGKIM_TACTIC_IDS as readonly string[]).includes(String(tactic))
        ? (String(tactic) as BotTongKimTactic)
        : (() => { throw Error('Chiến thuật Tống Kim không hợp lệ.'); })();
    const scope = camp === undefined || camp === '' || camp === 'all'
      ? 'all'
      : camp === 'tong' || camp === 'kim'
        ? camp
        : (() => { throw Error('Phe áp dụng chiến thuật không hợp lệ.'); })();
    if (scope === 'all') {
      this.liveTkTactics.all = val;
      if (val === null) { this.liveTkTactics.tong = null; this.liveTkTactics.kim = null; }
    } else {
      this.liveTkTactics[scope] = val;
    }
    const ipcCamp: TkCamp | undefined = scope === 'all' ? undefined : scope;
    for (const run of this.runs.values()) {
      if (run.child.connected) run.child.send({ type: 'tk-tactic', tactic: val, camp: ipcCamp });
    }
  }
  usesScenario(name:string):boolean {return this.starting.has(name)||[...this.runs.values()].some(run=>run.scenario===name);}
  async start(scenario:unknown, users:unknown, server:unknown): Promise<void> {
    if (typeof scenario!=='string'||!BOT_FILE_RE.test(scenario)) throw Error('Chọn một kịch bản đã lưu.');
    if (!Array.isArray(users)||!users.length||users.length>200||users.some(id=>typeof id!=='string'||!BOT_IDENTITIES.has(id))) throw Error('Tích chọn nhân vật trong danh sách cố định.');
    if (typeof server!=='string'||!/^https?:\/\/[^\s]+$/.test(server)) throw Error('Địa chỉ máy chủ không hợp lệ.');
    const file=path.join(this.dataDir,`${scenario}.json`);if(!fs.existsSync(file)) throw Error('Kịch bản không tồn tại.');
    const config=normalizeBotScenario(JSON.parse(fs.readFileSync(file,'utf8')));
    const ids=[...new Set(users)] as string[];
    if(this.status().bots.some(bot=>ids.includes(bot.username))) throw Error('Có nhân vật đang chạy hoặc chờ vào; hãy bỏ chọn hoặc dừng nhân vật đó trước.');
    this.starting.set(scenario,(this.starting.get(scenario)??0)+1);
    try {
    const response=await fetch(`${server.replace(/\/$/,'')}/api/dev/bots`,{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Không đọc được trạng thái bot từ máy chủ game.');
    const existing=await response.json() as {username:string;online:boolean}[];
    if(existing.some(bot=>bot.online&&ids.includes(bot.username))||this.status().bots.some(bot=>ids.includes(bot.username)))throw Error('Có nhân vật đã online hoặc đang chạy.');
    const previous={...this.assignments};
    ids.forEach(user=>{this.assignments[user]=scenario;});
    try {this.saveAssignments();} catch(error) {this.assignments=previous;throw error;}
    const id=randomUUID(), title=config.title||scenario, tongkim=!!config.activities.tongkim||(config.behaviors.tongkim??0)>0;
    const child=fork(path.join(this.here,'run.ts'),[scenario,'--server',server,'--users',JSON.stringify(ids)],{cwd:path.resolve(this.here,'../..'),execArgv:['--import','tsx'],env:{...process.env,BOTS_DIR:this.dataDir},stdio:['ignore','pipe','pipe','ipc']});
    const bots=new Map(ids.map(username=>[username,{username,scenario,title,phase:'preparing' as const,runId:id}]));
    const run:Run={child,bots,log:'',title,scenario,tongkim}; this.runs.set(id,run);
    if(tongkim&&child.connected){
      if(this.liveTkTactics.all) child.send({type:'tk-tactic',tactic:this.liveTkTactics.all});
      if(this.liveTkTactics.tong) child.send({type:'tk-tactic',tactic:this.liveTkTactics.tong,camp:'tong'});
      if(this.liveTkTactics.kim) child.send({type:'tk-tactic',tactic:this.liveTkTactics.kim,camp:'kim'});
    }
    const append=(data:Buffer)=>{run.log=(run.log+data.toString()).slice(-4000);}; child.stdout?.on('data',append);child.stderr?.on('data',append);
    child.on('message',(msg:{type?:string;usernames?:string[];bots?:{username:string;online:boolean;stopped:boolean;started:boolean}[]})=>{
      if(msg?.type==='stopped'&&Array.isArray(msg.usernames)){msg.usernames.forEach(id=>run.bots.delete(id));return;}
      if(msg?.type!=='status'||!Array.isArray(msg.bots))return;
      for(const state of msg.bots){const bot=run.bots.get(state.username);if(!bot)continue;if(state.stopped)run.bots.delete(state.username);else if(bot.phase==='stopping'){if(run.child.connected)run.child.send({type:'stop',usernames:[state.username]});}else bot.phase=state.online?'online':state.started?'reconnecting':'queued';}
    });
    child.on('error',error=>{this.errors.push({message:error.message,at:Date.now()});this.runs.delete(id);});
    child.on('exit',code=>{if(code&&run.bots.size)this.errors.push({message:`${title}: ${run.log.slice(-1000)}`,at:Date.now()});this.runs.delete(id);});
    } finally {
      const count=(this.starting.get(scenario)??1)-1;
      if(count) this.starting.set(scenario,count); else this.starting.delete(scenario);
    }
  }
  stop(users:unknown): void {
    if(!Array.isArray(users)||!users.length)throw Error('Tích chọn nhân vật cần dừng.');
    for(const run of this.runs.values()){
      const ids=users.filter((id):id is string=>typeof id==='string'&&run.bots.has(id));if(!ids.length)continue;
      ids.forEach(id=>{run.bots.get(id)!.phase='stopping';});
      if(run.child.connected)run.child.send({type:'stop',usernames:ids});
    }
  }
  close(): void {for(const run of this.runs.values()){run.child.kill('SIGTERM');setTimeout(()=>{if(run.child.exitCode===null)run.child.kill('SIGKILL');},5000).unref();}}
}
