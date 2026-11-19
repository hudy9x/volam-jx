const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {transformSync}=require('esbuild');
function object(){return new Proxy({visible:true,destroyed:false,text:'',style:{},scaleX:1},{get(o,k,r){if(k in o)return o[k];return (...args)=>{if(k==='setVisible')o.visible=args[0];if(k==='destroy')o.destroyed=true;if(k==='setText')o.text=args[0];return r;}}});}
const code=transformSync(fs.readFileSync('apps/client/src/game/actors/ActorView.ts','utf8'),{loader:'ts',format:'esm'}).code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'');
const ActorView=vm.runInNewContext(code+';ActorView',{
  makeLook:()=>({}),lookKey:()=>'look',hasNpc:()=>true,JxSprite:class{height=80;framesOf(){return 8}intersects(){return true}render(){return true}hide(){}destroy(){}},
  StateDecor:class{update(){}destroy(){}},ui:x=>x,uiPx:x=>x,textResolution:()=>2,zoomPlate:()=>({textScale:1,gapY:2,barW:30,barBossW:40,barH:3,zoom:1}),
  controlAppearance:()=>({loopRate:1,tint:0xffffff}),CAMP_COLORS:{new:'#fff'},resolveSpeed:()=>({cycleMs:800}),trackBasePercent:()=>100,getActiveSpeedConfig:()=>({}),SPEED:{basePercent:100},FRAME_MS:1000/18,
  isElement:()=>false,ensureElementBadgeTexture:()=>null,
});
test('flag follows captain state and head, hides on death/culling, and is destroyed with actor',()=>{
 const scene={time:{now:0},cameras:{main:{worldView:{}}},add:{zone:object,text:object,graphics:object}};
 const state={kind:'player',hp:100,maxHp:100,anim:'idle',animSeq:0,x:20,y:200,dir:0,name:'Captain',team:'a',teamLeader:true};
 const view=new ActorView(scene,'a',state,false,false);view.update(.05);assert.equal(view.leaderFlag.visible,true);
 state.teamLeader=false;view.update(.05);assert.equal(view.leaderFlag.visible,false);
 state.teamLeader=true;state.hp=0;view.update(.05);assert.equal(view.leaderFlag.visible,false);
 state.hp=100;view.update(.05);assert.equal(view.leaderFlag.visible,true);
 view.jx.intersects=()=>false;view.update(.05);assert.equal(view.leaderFlag.visible,false);
 view.destroy();assert.equal(view.leaderFlag.destroyed,true);
});
