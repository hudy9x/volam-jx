const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const test=require('node:test');
const {transformSync}=require(process.cwd()+'/node_modules/esbuild');
function load(path,name,globals){let code=transformSync(fs.readFileSync(path,'utf8'),{loader:'ts',format:'esm'}).code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'');return vm.runInNewContext(code+`;${name}`,globals);}
function object(){return new Proxy({text:'',style:{},scaleX:1,visible:true,destroyed:false},{get(o,k,receiver){if(k in o)return o[k];return (...args)=>{if(k==='setVisible')o.visible=args[0];if(k==='setText')o.text=args[0];if(k==='setColor')o.style.color=args[0];if(k==='destroy')o.destroyed=true;return receiver;};}});}
let sprites=[];
class Sprite{height=80;framesOf(){return 10}render(x,y,d,key,dir,frame){this.frame=frame(10);this.action=key;this.dir=dir;this.visible=true;return true}hide(){this.visible=false}destroy(){this.destroyed=true}constructor(){sprites.push(this)}}
const visualSource=fs.readFileSync('apps/client/src/game/fx/controlEffects.ts','utf8');
const visuals=vm.runInNewContext(transformSync(visualSource,{loader:'ts',format:'cjs'}).code+';module.exports',{module:{exports:{}},exports:{}});
const ActorView=load('apps/client/src/game/actors/ActorView.ts','ActorView',{makeLook:()=>({}),lookKey:()=> 'look',hasNpc:()=>true,JxSprite:Sprite,StateDecor:class{update(){}destroy(){}},ui:x=>x,uiPx:x=>x,zoomPlate:()=>({textScale:1,gapY:2,barBossW:40,barW:30,barH:3,zoom:1}),controlAppearance:visuals.controlAppearance,CAMP_COLORS:{new:'#fff'},resolveSpeed:()=>({cycleMs:800}),SPEED:{basePercent:100},FRAME_MS:1000/18,console});

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
 test(`${kind}/${boss}: cold slows idle FPS and halves the already slowed running gait`,()=>{
  const scene={time:{now:0},add:{zone:object,text:object,graphics:object}};
  const state={kind,boss,hp:100,maxHp:100,anim:'idle',animSeq:0,dir:0,x:0,y:0,name:'test',level:1,sprite:'npc',ctl:0,moveScale:1};
  const view=new ActorView(scene,'test',state,false,false);
  function interval(t,ctl,anim,scale=1){state.ctl=ctl;state.anim=anim;state.moveScale=scale;view.loopKey=null;scene.time.now=t;view.update(0);scene.time.now=t+200;view.update(.2);return view.loopFrame;}
  assert.equal(interval(0,0,'idle'),2*interval(300,2,'idle'));
  assert.equal(interval(600,0,'run'),4*interval(900,2,'run',.5));
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
