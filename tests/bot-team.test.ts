import assert from 'node:assert/strict';
import test from 'node:test';
import { C2S, S2C, MAX_TEAM, normalizeBotScenario, type TeamMsg } from '../packages/shared/src/index.js';
import { TeamInviter, BOT_TEAM_INVITE, type TeamCandidate } from '../tools/bots/runner/TeamInviter.js';
import { BotClient, type RunStats } from '../tools/bots/runner/BotClient.js';
const actor = (id:string, changes:Partial<TeamCandidate> = {}):TeamCandidate => ({id,kind:'player',name:id,hp:100,team:'',x:0,y:0,...changes});
const self=actor('leader');
const team=(leader='leader', count=2):TeamMsg=>({id:'t',leader,members:Array.from({length:count},(_,i)=>({name:i?'member'+i:'leader',online:true,level:1,faction:'',camp:'',mapId:37,hp:100,maxHp:100}))});
test('radio modes migrate legacy scenarios, invite wins conflicting saved booleans, off remains off',()=>{
  assert.deepEqual([normalizeBotScenario({}).activities.autoInviteTeam,normalizeBotScenario({}).activities.autoAcceptTeam],[false,true]);
  for(const [invite,accept,expected] of [[true,true,[true,false]],[true,false,[true,false]],[false,true,[false,true]],[false,false,[false,false]]] as const){
    const a=normalizeBotScenario({activities:{autoInviteTeam:invite,autoAcceptTeam:accept}}).activities;
    assert.deepEqual([a.autoInviteTeam,a.autoAcceptTeam],expected);
  }
});
test('invite picks nearest living unteamed player, excludes self/NPC/monster/teamed/dead and waits for team snapshot',()=>{
  const invite=new TeamInviter();const actors=[self,actor('dead',{hp:0}),actor('monster',{kind:'monster'}),actor('npc',{kind:'npc'}),actor('teamed',{team:'t'}),actor('far',{x:1000}),actor('near',{x:100})];
  assert.equal(invite.next(0,self,actors,undefined),null);
  assert.equal(invite.next(0,self,actors,null),'near');
  assert.equal(invite.next(1,self,actors,null),null);
  assert.equal(invite.next(BOT_TEAM_INVITE.gapMs,self,actors,null),'far');
  assert.equal(invite.next(10000,self,actors,null),null);
  assert.equal(invite.next(BOT_TEAM_INVITE.targetGapMs,self,actors,null),'near');
});
test('non-leader/full/dead cannot invite, pending invitations reserve available slots',()=>{
  for(const [a,t] of [[{...self,hp:0},null],[{...self,team:'t'},team('other')],[{...self,team:'t'},team('leader',MAX_TEAM)],[{...self,team:'t'},null]] as const)
    assert.equal(new TeamInviter().next(0,a,[actor('target')],t),null);
  const invite=new TeamInviter();const actors=Array.from({length:MAX_TEAM+1},(_,i)=>actor('target'+i,{x:i}));
  for(let i=0;i<MAX_TEAM-1;i++)assert.ok(invite.next(i*5000,self,actors,null));
  assert.equal(invite.next(40000,self,actors,null),null);
  assert.ok(new TeamInviter().next(0,{...self,team:'t'},actors,team()));
});
test('BotClient connects modes to real protocol handlers and team invitations work with chat/sell off',async()=>{
  for(const mode of ['invite','accept','off','no-grind'] as const){
    const sc=normalizeBotScenario({activities:{grind:mode!=='no-grind',chat:false,sell:false,autoInviteTeam:mode==='invite'||mode==='no-grind',autoAcceptTeam:mode==='accept'}});
    const run:RunStats={orders:0,dropped:0,deaths:0,rejoins:0,transfers:0,errors:0,lastError:''};
    const bot=new BotClient({username:'test',token:'test',charId:'test',mapId:37},sc,()=>0,run);
    const handlers=new Map<string,(msg:any)=>void>();const sent:{type:string;msg:any}[]=[];
    const room={sessionId:'leader',state:{actors:new Map([['leader',self],['near',actor('near')]])},onMessage:(t:string,f:(m:any)=>void)=>handlers.set(t,f),onLeave:()=>{},onError:()=>{},leave:async()=>{},send:()=>{}};
    (bot as any).client={joinOrCreate:async()=>room};bot.behavior={kind:'grind',onMap:()=>{},update:()=>{}};
    bot.send=(type,msg)=>{sent.push({type,msg});};await bot.connect();
    handlers.get(S2C.team)!(null);handlers.get(S2C.teamInvite)!({from:'other'});bot.updateSocial(0);
    if(mode==='invite')assert.deepEqual(sent,[{type:C2S.team,msg:{op:'invite',name:'near'}}]);
    else if(mode==='accept')assert.deepEqual(sent,[{type:C2S.team,msg:{op:'accept',name:'other'}}]);
    else assert.equal(sent.length,0);
    bot.stopped=true;handlers.get(S2C.teamInvite)!({from:'other'});bot.updateSocial(60000);
    assert.equal(sent.length,mode==='invite'||mode==='accept'?1:0);
  }
});
