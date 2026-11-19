const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
const generated = fs.readFileSync('apps/client/src/art/jx/data.gen.ts', 'utf8');
const sheets = JSON.parse(generated.split('\n').find(l => l.startsWith('export const JX_SHEETS:')).split(' = ')[1].replace(/;$/, ''));
// Header anchors verified against the original SHXT SPR files, not inferred from image dimensions.
const poses = { stand: ['st',14,67,15], run: ['wlk',23,66,15], wound: ['bat',24,67,6], die: ['die',62,67,15], attack1: ['at',36,89,27], magic: ['at',36,89,27], idle: ['st',14,67,15] };
const code = transformSync(fs.readFileSync('apps/client/src/game/actors/PaperDoll.ts','utf8'), {loader:'ts',format:'esm'}).code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'');
function image() { return {texture:{},frame:{}, setOrigin(){return this}, setTexture(key,name){this.texture.key=key;this.frame.name=name;return this},setPosition(x,y){this.x=x;this.y=y;return this},setDepth(){return this},setVisible(){return this},setAlpha(){return this},setTint(){return this}}; }
const JxSprite = vm.runInNewContext(code+';JxSprite', {FOOT_X:160,FOOT_Y:202,npcPose:(_,action)=>{const key=`npc/enemy157/enemy157_${poses[action][0]}`,body={part:5,key,meta:sheets[key]};return {body,layers:[body]};},sheetReady:()=>true,requestSheets:()=>{},jxTextureKey:k=>k,spriteRow:(d,n)=>Math.round(d*n/8)%n});
for (const [action,[suffix,cx,cy,count]] of Object.entries(poses)) {
 test(`${action}: original anchor, height and frame selection across all 8 directions / ${count} frames`,()=>{
  const scene={time:{now:0},add:{image}},sprite=new JxSprite(scene,{kind:'npc',res:'enemy157'});
  for(let dir=0;dir<8;dir++)for(let frame=0;frame<count;frame++){
   assert.equal(sprite.render(500,400,400,action,dir,()=>frame),true);
   const img=sprite.images[0];
   assert.equal(img.x,500-cx);assert.equal(img.y,400-cy);
   assert.equal(img.frame.name,`${dir}_${frame}`);
   assert.equal(sprite.height,cy);
   // ActorView's plate top is height + 8 above feet: always above the sprite canvas.
   assert.ok(400-sprite.height-8 < img.y);
  }
 });
}
const actorCode=transformSync(fs.readFileSync('apps/client/src/game/actors/ActorView.ts','utf8'),{loader:'ts',format:'esm'}).code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm,'').replace(/export\s*\{[\s\S]*?\};?\s*$/,'');
let plate;
const ActorView=vm.runInNewContext(actorCode+';ActorView',{zoomPlate:()=>plate,ui:x=>Math.round(x),isElement:()=>false,CAMP_COLORS:{}});
test('real ActorView plate stays above body for every pose, direction, frame and zoom; death hides it',()=>{
 for(const zoom of [1,1.5,2]){
  plate={zoom,textScale:1/zoom,gapY:7/zoom,barW:44/zoom,barBossW:70/zoom,barH:4/zoom};
  const sprite=new JxSprite({time:{now:0},add:{image}},{kind:'npc',res:'enemy157'});
  const label={style:{},setVisible(v){this.visible=v},setText(t){this.text=t},setColor(c){this.style.color=c},setScale(v){this.scaleX=v},setPosition(x,y){this.x=x;this.y=y}};
  const bar={rects:[],clear(){this.rects=[]},fillStyle(){return this},fillRect(...args){this.rects.push(args);return this}};
  const flag={clear(){return this},setVisible(){return this}};
  const view=Object.assign(Object.create(ActorView.prototype),{state:{kind:'monster',name:'Đường Phong',hp:100,maxHp:100,boss:2,level:150},x:500,y:400,lift:0,shown:true,jx:sprite,label,bar,leaderFlag:flag,decor:{update(){}},lastBarKey:''});
  for(const [action,[,,,count]] of Object.entries(poses))for(let dir=0;dir<8;dir++)for(let frame=0;frame<count;frame++){
   sprite.render(500,400,400,action,dir,()=>frame);view.drawPlate();
   assert.equal(label.visible,true);assert.equal(label.x,500);
   const [bx,by,w,h]=bar.rects[1];
   assert.ok(Math.abs(bx+w/2-500)<=0.5);assert.ok(by+h < sprite.images[0].y);
   assert.ok(label.y <= by);assert.equal(view.headY,sprite.images[0].y-8);
  }
  view.state.hp=0;view.drawPlate();assert.equal(label.visible,false);assert.equal(bar.rects.length,0);
 }
});
