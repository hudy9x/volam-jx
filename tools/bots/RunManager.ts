import fs from 'node:fs';
import path from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { BOT_FILE_RE, BOT_IDENTITIES, normalizeBotScenario } from '@vltk/shared';

export interface RunningBot { username:string; scenario:string; title:string; phase:'preparing'|'queued'|'online'|'reconnecting'|'stopping'; runId:string }
interface Run { child:ChildProcess; bots:Map<string,RunningBot>; log:string; title:string; scenario:string; }
/** Owns only children launched by this tools app. Game restarts do not restart this manager or its children. */
export class RunManager {
  private runs = new Map<string,Run>();
  private errors: { message:string; at:number }[] = [];
  constructor(private here:string, private dataDir:string) {}
  status(): { bots:RunningBot[]; errors:{message:string;at:number}[] } {
    return { bots:[...this.runs.values()].flatMap(run=>[...run.bots.values()]),errors:this.errors.slice(-5) };
  }
  async start(scenario:unknown, users:unknown, server:unknown): Promise<void> {
    if (typeof scenario!=='string'||!BOT_FILE_RE.test(scenario)) throw Error('Chọn một kịch bản đã lưu.');
    if (!Array.isArray(users)||!users.length||users.length>200||users.some(id=>typeof id!=='string'||!BOT_IDENTITIES.has(id))) throw Error('Tích chọn nhân vật trong danh sách cố định.');
    if (typeof server!=='string'||!/^https?:\/\/[^\s]+$/.test(server)) throw Error('Địa chỉ máy chủ không hợp lệ.');
    const file=path.join(this.dataDir,`${scenario}.json`);if(!fs.existsSync(file)) throw Error('Kịch bản không tồn tại.');
    const config=normalizeBotScenario(JSON.parse(fs.readFileSync(file,'utf8')));
    const ids=[...new Set(users)] as string[];
    if(this.status().bots.some(bot=>ids.includes(bot.username))) throw Error('Có nhân vật đang chạy hoặc chờ vào; hãy bỏ chọn hoặc dừng nhân vật đó trước.');
    const response=await fetch(`${server.replace(/\/$/,'')}/api/dev/bots`,{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Không đọc được trạng thái bot từ máy chủ game.');
    const existing=await response.json() as {username:string;online:boolean}[];
    if(existing.some(bot=>bot.online&&ids.includes(bot.username))||this.status().bots.some(bot=>ids.includes(bot.username)))throw Error('Có nhân vật đã online hoặc đang chạy.');
    const id=randomUUID(), title=config.title||scenario;
    const child=fork(path.join(this.here,'run.ts'),[scenario,'--server',server,'--users',JSON.stringify(ids)],{cwd:path.resolve(this.here,'../..'),execArgv:['--import','tsx'],env:{...process.env,BOTS_DIR:this.dataDir},stdio:['ignore','pipe','pipe','ipc']});
    const bots=new Map(ids.map(username=>[username,{username,scenario,title,phase:'preparing' as const,runId:id}]));
    const run:Run={child,bots,log:'',title,scenario}; this.runs.set(id,run);
    const append=(data:Buffer)=>{run.log=(run.log+data.toString()).slice(-4000);}; child.stdout?.on('data',append);child.stderr?.on('data',append);
    child.on('message',(msg:{type?:string;usernames?:string[];bots?:{username:string;online:boolean;stopped:boolean;started:boolean}[]})=>{
      if(msg?.type==='stopped'&&Array.isArray(msg.usernames)){msg.usernames.forEach(id=>run.bots.delete(id));return;}
      if(msg?.type!=='status'||!Array.isArray(msg.bots))return;
      for(const state of msg.bots){const bot=run.bots.get(state.username);if(!bot)continue;if(state.stopped)run.bots.delete(state.username);else if(bot.phase==='stopping'){if(run.child.connected)run.child.send({type:'stop',usernames:[state.username]});}else bot.phase=state.online?'online':state.started?'reconnecting':'queued';}
    });
    child.on('error',error=>{this.errors.push({message:error.message,at:Date.now()});this.runs.delete(id);});
    child.on('exit',code=>{if(code&&run.bots.size)this.errors.push({message:`${title}: ${run.log.slice(-1000)}`,at:Date.now()});this.runs.delete(id);});
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
