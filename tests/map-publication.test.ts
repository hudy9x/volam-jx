import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { ProjectStore } from '../tools/map-creator/Store.js';
import { PublicationStore } from '../tools/map-creator/PublicationStore.js';
import { MAPS, applyMapRegistry, isMapEnabled, mapAssetSuffix, validateMapRegistry } from '../packages/shared/src/maps/index.js';
import source from '../packages/shared/src/maps/custom-maps.json';
async function fixture() {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'jx-publish-')), store=new ProjectStore(path.join(root,'projects'));
  const p=await store.create(91001,'Map thử');
  p.ground=await store.upload(p.id,await sharp({create:{width:128,height:64,channels:4,background:'#587c35'}}).png().toBuffer(),'ground.png');
  p.width=128;p.height=64;p.entry={x:64,y:32};const saved=await store.save(p.id,p);
  let manifests=0;const registry=path.join(root,'registry.json'), mapsDir=path.join(root,'maps');
  return{root,store,p:saved,registry,mapsDir,pub:new PublicationStore(store,registry,mapsDir,()=>{manifests++;}),get manifests(){return manifests;},cleanup:()=>fs.rm(root,{recursive:true,force:true})};
}
test('enable publishes immutable build and metadata, disable preserves source/assets; stale and re-enable are safe',async()=>{
 const f=await fixture();try{
  const before=await f.store.read(f.p.id), initial=await f.pub.status(f.p.id);
  const enabled=await f.pub.set(f.p.id,true,f.p.revision,initial.revision,'Field');assert.equal(enabled.map!.enabled,true);assert.equal(f.manifests,1);
  const first=enabled.map!.build;await fs.access(path.join(f.mapsDir,String(f.p.id),first,'nav.json'));
  applyMapRegistry({version:1,maps:{[f.p.id]:enabled.map}});assert.equal(isMapEnabled(f.p.id),true);assert.equal(mapAssetSuffix(f.p.id),`${f.p.id}/${first}`);
  await assert.rejects(f.pub.set(f.p.id,false,f.p.revision,initial.revision),/tab khác/);
  const disabled=await f.pub.set(f.p.id,false,f.p.revision,enabled.revision);assert.equal(disabled.map!.build,first);assert.equal(disabled.map!.enabled,false);
  applyMapRegistry({version:1,maps:{[f.p.id]:disabled.map}});assert.equal(isMapEnabled(f.p.id),false);assert.ok(MAPS[f.p.id],'disabled map stays available to admin metadata');
  await fs.access(path.join(f.mapsDir,String(f.p.id),first,'ground','0_0.webp'));assert.deepEqual(await f.store.read(f.p.id),before);
  const again=await f.pub.set(f.p.id,true,f.p.revision,disabled.revision,'City');assert.equal(again.map!.build,first,'unchanged project reuses its immutable build');assert.equal(again.map!.type,'City');
  const off=await f.pub.set(f.p.id,false,f.p.revision,again.revision);
  const edited=await f.store.save(f.p.id,{...f.p,name:'Map đã sửa'});
  const updated=await f.pub.set(f.p.id,true,edited.revision,off.revision,'City');assert.notEqual(updated.map!.build,first);assert.equal(updated.map!.projectRevision,edited.revision);
  applyMapRegistry({version:1,maps:{}});assert.equal(MAPS[f.p.id],undefined);
 }finally{applyMapRegistry(source);await f.cleanup();}
});
test('bad revision, original IDs, invalid type and unusable entry never enable a map',async()=>{
 const f=await fixture();try{
  const initial=await f.pub.status(f.p.id);
  await assert.rejects(f.pub.set(37,true,1,initial.revision),/không hợp lệ/);
  await assert.rejects(f.pub.set(f.p.id,true,0,initial.revision),/Project đã thay đổi/);
  await assert.rejects(f.pub.set(f.p.id,true,f.p.revision,initial.revision,'../bad' as never),/không hợp lệ/);
  f.p.entry={x:0,y:0};const p=await f.store.save(f.p.id,f.p);
  await assert.rejects(f.pub.set(p.id,true,p.revision,initial.revision),/Điểm vào/);assert.equal((await f.pub.status(p.id)).map,null);
  assert.throws(()=>validateMapRegistry({version:1,maps:{'37':{id:37}}},new Set([37])));
 }finally{await f.cleanup();}
});
