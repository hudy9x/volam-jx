import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { RunManager } from '../tools/bots/RunManager.js';
import { ConfigStore } from '../tools/bots/ConfigStore.js';
import { BOT_ROSTER } from '../packages/shared/src/index.js';

const until=async(check:()=>boolean)=>{const end=Date.now()+5000;while(!check()){assert.ok(Date.now()<end,'IPC timed out');await new Promise(r=>setTimeout(r,30));}};
test('real runner IPC: stop retains assignment, reload restores, resume groups, overwrite and card toggle respect ownership',async()=>{
  const dir=fs.mkdtempSync(path.resolve('tools/.assignment-test-'));
  const store=new ConfigStore(dir);store.save('scenarios','one',{title:'Một'});store.save('scenarios','two',{title:'Hai'});
  fs.writeFileSync(path.join(dir,'run.ts'),`const users=JSON.parse(process.argv[process.argv.indexOf('--users')+1]);process.send({type:'status',bots:users.map(username=>({username,online:true,stopped:false,started:true}))});process.on('message',msg=>{if(msg.type==='stop')process.send({type:'stopped',usernames:msg.usernames});});setInterval(()=>{},1000);`);
  const server=http.createServer((_req,res)=>{res.setHeader('Content-Type','application/json');res.end('[]');});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const url=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  const manager=new RunManager(dir,dir), users=BOT_ROSTER.slice(0,2).map(b=>b.id);
  try {
    await manager.start('one',users,url);await until(()=>manager.status().bots.every(b=>b.phase==='online'));
    manager.stop([users[0]]);await until(()=>manager.status().bots.length===1);
    assert.equal(manager.status().assignments[users[0]],'one');
    assert.equal(new RunManager(dir,dir).status().assignments[users[0]],'one');
    await manager.resume([users[0]],url);await until(()=>manager.status().bots.length===2);
    await manager.replace('two',[users[0]],url);
    assert.equal(manager.status().assignments[users[0]],'two');assert.equal(manager.status().assignments[users[1]],'one');
    await manager.toggleScenario('two',url);await until(()=>!manager.status().bots.some(b=>b.username===users[0]));
    assert.equal(manager.status().bots[0].username,users[1]);
    await manager.toggleScenario('two',url);assert.ok(manager.status().bots.some(b=>b.username===users[0]));
    manager.stop(users);await until(()=>manager.status().bots.length===0);
    await manager.resume(users,url);assert.deepEqual(manager.status().bots.map(b=>b.scenario).sort(),['one','two']);
    await assert.rejects(manager.start('one',[users[0]],url),/đang chạy/);
    await assert.rejects(manager.resume([BOT_ROSTER[2].id],url),/chưa có/);
    assert.deepEqual(store.list().scenarios,['one','two'],'assignments never appear as a scenario');
  } finally {manager.close();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(dir,{recursive:true,force:true});}
});
