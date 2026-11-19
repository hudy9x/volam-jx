const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const {transformSync}=require(process.cwd()+'/node_modules/esbuild');
function load(path,name,globals){let code=transformSync(fs.readFileSync(path,'utf8'),{loader:'ts',format:'esm'}).code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'');return vm.runInNewContext(code+`;${name}`,globals);}
function object(){return new Proxy({text:'',style:{},scaleX:1,visible:true,destroyed:false},{get(o,k,receiver){if(k in o)return o[k];return (...args)=>{if(k==='setVisible')o.visible=args[0];if(k==='setText')o.text=args[0];if(k==='setColor')o.style.color=args[0];if(k==='destroy')o.destroyed=true;return receiver;};}});}
let sprites=[];
class Sprite{height=80;intersects(){return this.inView!==false}framesOf(){return 10}render(x,y,d,key,dir,frame){this.frame=frame(10);this.action=key;this.dir=dir;this.visible=true;return true}hide(){this.visible=false}destroy(){this.destroyed=true}constructor(){sprites.push(this)}}
const visualSource=fs.readFileSync('apps/client/src/game/fx/controlEffects.ts','utf8');
const visuals=vm.runInNewContext(transformSync(visualSource,{loader:'ts',format:'cjs'}).code+';module.exports',{module:{exports:{}},exports:{}});
const ActorView=load('apps/client/src/game/actors/ActorView.ts','ActorView',{makeLook:()=>({}),lookKey:()=> 'look',hasNpc:()=>true,JxSprite:Sprite,StateDecor:class{update(){}destroy(){}},ui:x=>x,uiPx:x=>x,textResolution:()=>2,zoomPlate:()=>({textScale:1,gapY:2,barBossW:40,barW:30,barH:3,zoom:1}),coldMovement:require('../packages/shared/src/formulas/effects/cold.ts').coldMovement,controlAppearance:visuals.controlAppearance,CAMP_COLORS:{new:'#fff'},resolveSpeed:()=>({cycleMs:800}),trackBasePercent:require('../packages/shared/src/formulas/speed.ts').trackBasePercent,getActiveSpeedConfig:require('../packages/shared/src/formulas/speed.ts').getActiveSpeedConfig,SPEED:{basePercent:100},FRAME_MS:1000/18,isElement:()=>false,ensureElementBadgeTexture:()=>null,console});

for(const [kind,boss] of [['player',0],['monster',0],['monster',1],['monster',2]]){
 test(`${kind}/${boss}: control colours, exact frozen frame, thaw and death`,()=>{
  const scene={time:{now:0},add:{zone:object,text:object,graphics:object}};
  const state={kind,boss,hp:100,maxHp:100,anim:'cast',animSeq:1,actionMs:1000,dir:0,x:0,y:0,name:'test',level:1,sprite:'npc',ctl:0};
  const view=new ActorView(scene,'test',state,false,false);
  const tick=t=>{scene.time.now=t;view.update(.05);};
  tick(0);tick(200);assert.equal(view.jx.frame,2);
  state.ctl=1;tick(200);state.dir=4;tick(1400);
  assert.equal(view.jx.frame,2);assert.equal(view.jx.dir,0);
  state.ctl=0;tick(1400);assert.equal(view.jx.frame,2,'resume without skipping paused time');
  tick(1500);assert.equal(view.jx.frame,3);
  state.anim='hurt';state.animSeq++;state.actionMs=200;tick(1500);
  assert.equal(view.jx.action,'wound','hurt replaces unfinished attack');tick(1600);assert.equal(view.jx.frame,5);
  state.ctl=2;tick(1600);assert.equal(view.jx.tint,0xffdf55);
  state.ctl=6;tick(1600);assert.equal(view.jx.tint,0x70ff70);
  state.ctl=0;tick(1600);assert.equal(view.jx.tint,0xffffff);
  state.ctl=1;tick(1600);state.hp=0;state.anim='die';state.animSeq++;tick(1600);tick(1900);
  assert.equal(view.jx.frame,5,'death plays despite stun');assert.equal(view.jx.tint,0xffffff);
 });
 test(`${kind}/${boss}: cold keeps idle slowdown and runs one fixed cycle without an extra half-rate`,()=>{
  const scene={time:{now:0},add:{zone:object,text:object,graphics:object}};
  const state={kind,boss,hp:100,maxHp:100,anim:'idle',animSeq:0,dir:0,x:0,y:0,name:'test',level:1,sprite:'npc',ctl:0,moveScale:1};
  const view=new ActorView(scene,'test',state,false,false);
  function interval(t,ctl,anim,scale=1){state.ctl=ctl;state.anim=anim;state.moveScale=scale;view.loopKey=null;scene.time.now=t;view.update(0);scene.time.now=t+200;view.update(.2);return view.loopFrame;}
  assert.equal(interval(0,0,'idle'),2*interval(300,2,'idle'));
  for (const scale of [.1,.5,1,3]) {
    state.mounted = scale > 1;
    assert.equal(interval(900,2,'run',scale),.1, '200ms is exactly one tenth of a cold gait cycle');
  }
 });
}

test('stun glow preloads, animates at the head and disappears immediately on expiry/death',()=>{
 const key='stun';let readyCalls=0;const draws=[];
 const StateDecor=load('apps/client/src/game/fx/StateDecor.ts','StateDecor',{
  CONTROL_VISUALS:visuals.CONTROL_VISUALS,CONTROL_FX:{stun:{key}},SKILL_FX:{stun:[129,111,-61,-137,10,1,10,0,50,1]},JX_TICK_MS:1000/18,
  fxReady:()=>{readyCalls++;return true;},showFx:(img,k,row,col,x,y)=>draws.push({k,col,x,y}),getSkill:()=>null,stateFxOf:()=>null,
 });
 const scene={time:{now:0},add:{image:object}};const decor=new StateDecor(scene);assert.equal(readyCalls,1);
 decor.update([],200,300,80,1);const image=decor.stun.fx;assert.equal(draws.at(-1).col,0);
 scene.time.now=150;decor.update([],220,300,80,1);assert.equal(draws.at(-1).col,3);assert.equal(decor.stun.fx,image);
 decor.update([],220,300,80,0);assert.equal(image.destroyed,true);assert.equal(decor.stun,null);
 decor.update([],220,300,80,1);const next=decor.stun.fx;decor.destroy();assert.equal(next.destroyed,true);
});

test('culled actor advances virtual pose, freezes current frame and returns without replay',()=>{
 const scene={time:{now:0},cameras:{main:{worldView:{}}},add:{zone:object,text:object,graphics:object}};
 const state={kind:'monster',hp:100,maxHp:100,anim:'cast',animSeq:1,actionMs:1000,dir:0,x:0,y:0,name:'test',level:1,sprite:'npc',ctl:0};
 const view=new ActorView(scene,'test',state,false,false);
 const tick=t=>{scene.time.now=t;view.update(.05)};
 tick(0);view.jx.inView=false;tick(400);
 assert.equal(view.jx.visible,false);assert.equal(view.label.visible,false);assert.equal(view.bar.visible,false);
 assert.equal(view.jx.frame,4);
 state.ctl=1;tick(400);tick(1400);view.jx.inView=true;tick(1400);
 assert.equal(view.jx.frame,4);assert.equal(view.jx.visible,true);assert.equal(view.bar.visible,true);
 state.ctl=0;tick(1500);tick(1700);assert.equal(view.jx.frame,6);
 view.jx.inView=false;tick(2200);assert.equal(view.oneShot,null);
 view.jx.inView=true;tick(2300);assert.equal(view.jx.action,'stand');
 state.hp=0;state.anim='die';state.animSeq++;view.jx.inView=false;tick(2400);tick(4500);
 view.jx.inView=true;tick(4600);assert.equal(view.jx.visible,false,'expired corpse stays hidden');
});

test('culled decoration keeps its animation clock and handles expiry without loading',()=>{
 let requests=0;const frames=[];
 const StateDecor=load('apps/client/src/game/fx/StateDecor.ts','StateDecor',{
  CONTROL_VISUALS:visuals.CONTROL_VISUALS,CONTROL_FX:{stun:{key:'stun'}},SKILL_FX:{stun:[129,111,-61,-137,10,1,10,0,50,1]},JX_TICK_MS:1000/18,
  fxReady:()=>{requests++;return true},showFx:(img,k,row,col)=>frames.push(col),getSkill:()=>null,stateFxOf:()=>null,
 });
 const scene={time:{now:0},add:{image:object}},decor=new StateDecor(scene);
 decor.update([],0,0,80,1);const img=decor.stun.fx,before=requests;
 scene.time.now=100;decor.update([],0,0,80,1,false);assert.equal(img.visible,false);assert.equal(requests,before);
 scene.time.now=200;decor.update([],0,0,80,1);assert.equal(img.visible,true);assert.equal(frames.at(-1),4);
 decor.update([],0,0,80,0,false);assert.equal(img.destroyed,true);assert.equal(decor.stun,null);
});
