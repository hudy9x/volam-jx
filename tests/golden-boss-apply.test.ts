import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GOLDEN_BOSS_CONFIG, monsterAt } from '../packages/shared/src/index.js';
import { goldenBossFromEntry } from '../packages/shared/src/monsters/monsters.js';

test('apply verifies effective HP/cycle; old or mismatched game cannot report success', async () => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jx-boss-apply-'));
  let mode='old';
  const game=http.createServer(async(req,res)=>{
    const chunks=[];for await(const c of req)chunks.push(c);
    const cfg=JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader('Content-Type','application/json');
    if(mode==='old'){res.end(JSON.stringify({ok:true}));return;}
    const appliedBosses=cfg.bosses.map((b:typeof GOLDEN_BOSS_CONFIG.bosses[number])=>{
      const def=goldenBossFromEntry(b);
      return {id:b.id,name:b.name,hp:monsterAt(def,b.level,2).hp,damagePercent:def.damagePercent,controlReduction:{hurt:def.hitRecover??0,cold:def.controlReduction?.cold??0,stun:def.controlReduction?.stun??0,poison:def.controlReduction?.poison??0},attackCycleMs:def.attackCycleMs,leash:def.leash,skills:monsterAt(def,b.level,2).skills,skillLevelsFixed:!def.skillScale};
    });
    if(mode==='wrongControl')appliedBosses[0].controlReduction.cold=0;
    if(mode==='wrongDamage')appliedBosses[0].damagePercent=100;
    if(mode==='wrong')appliedBosses[0].hp=1;
    if(mode==='wrongSkills')appliedBosses[0].skills=[[1,1]];
    res.end(JSON.stringify({ok:true,combatTuningVersion:1,appliedBosses}));
  });
  await new Promise<void>(r=>game.listen(0,'127.0.0.1',r));
  const env={BOSS_CONFIG_DIR:process.env.BOSS_CONFIG_DIR,DROP_CONFIG_PATH:process.env.DROP_CONFIG_PATH,GAME_SERVER_URL:process.env.GAME_SERVER_URL};
  process.env.BOSS_CONFIG_DIR=dir;process.env.DROP_CONFIG_PATH=path.join(dir,'drop.json');
  process.env.GAME_SERVER_URL=`http://127.0.0.1:${(game.address() as import('node:net').AddressInfo).port}`;
  const cfg=structuredClone(GOLDEN_BOSS_CONFIG);Object.assign(cfg.bosses[0],{hp:500000,damagePercent:150,controlReduction:{hurt:70,cold:50,stun:50,poison:50},attackCooldown:0.2,skills:[[1055,20]],skillLevelsFixed:true});
  await fs.writeFile(path.join(dir,'config.json'),JSON.stringify(cfg));
  const {handleBossRequest}=await import('../tools/boss/server.js');
  const tool=http.createServer(handleBossRequest);
  await new Promise<void>(r=>tool.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${(tool.address() as import('node:net').AddressInfo).port}/api/apply`;
  try{
    let r=await fetch(url,{method:'POST'});assert.equal(r.status,502);assert.match((await r.json()).error,/khởi động lại/);
    mode='new';r=await fetch(url,{method:'POST'});assert.equal(r.status,200);
    const body=await r.json();assert.equal(body.appliedBosses[0].hp,500000);assert.equal(body.appliedBosses[0].attackCycleMs,200);
    mode='wrongControl';r=await fetch(url,{method:'POST'});assert.equal(r.status,502);
    mode='wrongDamage';r=await fetch(url,{method:'POST'});assert.equal(r.status,502);
    mode='wrongSkills';r=await fetch(url,{method:'POST'});assert.equal(r.status,502);assert.match((await r.json()).error,/xác nhận thông số/);
    mode='wrong';r=await fetch(url,{method:'POST'});assert.equal(r.status,502);assert.match((await r.json()).error,/xác nhận thông số/);
  }finally{
    await Promise.all([new Promise<void>(r=>tool.close(()=>r())),new Promise<void>(r=>game.close(()=>r()))]);
    for(const [key,value]of Object.entries(env))if(value===undefined)delete process.env[key];else process.env[key]=value;
    await fs.rm(dir,{recursive:true,force:true});
  }
});
