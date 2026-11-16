const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const {transformSync}=require('../node_modules/esbuild');
function load(path,name,globals){const code=transformSync(fs.readFileSync(path,'utf8'),{loader:'ts',format:'esm'}).code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/, '');return vm.runInNewContext(code+`;${name}`,globals)}
const MapView=load('apps/client/src/game/map/MapView.ts','MapView',{});
const JxSprite=load('apps/client/src/game/actors/PaperDoll.ts','JxSprite',{FOOT_X:0,FOOT_Y:0});
const view={x:0,y:0,width:1280,height:720,right:1280,bottom:720};
test('ground is retained but hidden off screen; object culling stays active during ground A/B',()=>{
 const m=new MapView({}, {id:1,assets:'/maps/1'});
 const near={x:-100,y:0,width:512,height:512},far={x:2000,y:0,width:512,height:512};
 const object={x:2000,y:0,width:100,height:100};
 m.regions.set('a',{image:near});m.regions.set('b',{image:far});m.chunks.set('x',{images:[object]});
 m.cull(view,true);assert.equal(near.visible,true);assert.equal(far.visible,false);assert.equal(object.visible,false);assert.equal(m.regions.size,2);
 m.cull({...view,x:1800,right:3080},true);assert.equal(far.visible,true);assert.equal(near.visible,false);
 m.cullingEnabled=false;m.cull(view,true);assert.equal(far.visible,true);assert.equal(object.visible,false);
});
test('sprite culling includes large offset layers and fallback/shadow, independent of loaded textures',()=>{
 const pose={layers:[{meta:[3000,100,0,0]}],shadow:null};
 const s={height:100,pose:()=>pose};
 assert.equal(JxSprite.prototype.intersects.call(s,view,-2500,300,'run',0),true);
 assert.equal(JxSprite.prototype.intersects.call(s,view,-4000,300,'run',0),false);
 s.pose=k=>k==='stand'?{layers:[],shadow:{meta:[3000,100,0,0]}}:null;
 assert.equal(JxSprite.prototype.intersects.call(s,view,-2500,300,'jump',300),true);
});
