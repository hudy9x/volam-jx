import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MAPS } from '../packages/shared/src/maps/index.js';
import type { SafeZone } from '../packages/shared/src/maps/safe-zones.js';
import { SafeZoneStore } from '../tools/map-manager/SafeZoneStore.js';
const zone: SafeZone = { id: 'zone-test', name: 'Nội thành', points: [{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200}] };
test('atomic save, stale revision, map isolation, reopen and explicit reset; empty list never opens an entire city', async () => {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jx-safe-zones-'));const file=path.join(dir,'zones.json');
  try{
    const store=new SafeZoneStore(file,MAPS);const initial=await store.read(1);
    assert.equal(initial.custom,false);
    const a=await store.save(1,[zone],initial.revision);
    const b=await store.read(37);await store.save(37,[zone],b.revision);
    await assert.rejects(store.save(1,[zone],initial.revision),/tab khác/);
    await assert.rejects(store.save(1,[],a.revision),/1–32/);
    assert.deepEqual((await new SafeZoneStore(file,MAPS).read(1)).zones,[zone]);
    await store.save(1,null,a.revision);assert.equal((await store.read(1)).custom,false);
    assert.deepEqual((await store.read(37)).zones,[zone]);
    await assert.rejects(store.read(140),/thành thị/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
