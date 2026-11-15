import {createServer} from '/Users/hudy/ws/jx-system-online/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';import fs from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('/Users/hudy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const login=JSON.parse(await fs.readFile('/tmp/jx-perf-ab/login.json','utf8'));let server,browser;
try {
server=await createServer({root:'/Users/hudy/ws/jx-system-online/apps/client',server:{port:5174,strictPort:true,host:'127.0.0.1'}});await server.listen();
browser=await chromium.launch({headless:false,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const c=await browser.newContext({viewport:{width:1500,height:1001},deviceScaleFactor:2});
await c.addInitScript(l=>{localStorage.setItem('vltk.token',l.token);localStorage.setItem('vltk.lastCharacter',l.id);localStorage.setItem('vltk.settings',JSON.stringify({mute:true,zoom:100,viewport:'1280x720'}));},login);
const p=await c.newPage();p.on('console',m=>console.log('CONSOLE',m.text().slice(0,200)));p.on('pageerror',e=>console.log('ERROR',e.message));const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5174/?server=http://127.0.0.1:2568');
await p.waitForTimeout(3000);console.log('PAGE',await p.locator('body').innerText());await p.waitForFunction(()=>window.__vltk?.game()?.scene.getScene('world')?.ready);
await p.evaluate(()=>{const s=window.__vltk.game().scene.getScene('world');s.cameras.main.stopFollow();window.__center={x:5280,y:9600};s.cameras.main.centerOn(5280,9600)});
for(let i=0;i<24;i++){await p.evaluate(i=>{const s=window.__vltk.game().scene.getScene('world');s.cameras.main.centerOn(5280+Math.sin(i/24*Math.PI*2)*1000,9600)},i);await p.waitForTimeout(150)}
await p.waitForFunction(()=>{const s=window.__vltk.game().scene.getScene('world');return !s.load.isLoading()&&s.mapView.pending===0&&s.mapView.queue.length===0});await p.waitForTimeout(2000);
const results=[];
for(const scenario of ['stand','pan','combat'])for(let rep=0;rep<3;rep++)for(const enabled of (rep%2?[true,false]:[false,true])) {
await p.evaluate(enabled=>{const s=window.__vltk.game().scene.getScene('world');s.mapView.cullingEnabled=enabled;s.mapView.lastCull.x=NaN;for(const v of s.views.values())v.cullingEnabled=enabled;s.cameras.main.centerOn(5280,9600)},enabled);await p.waitForTimeout(700);
const result=await p.evaluate(async scenario=>{
const g=window.__vltk.game(),s=g.scene.getScene('world'),gl=g.renderer.gl,dbg=gl.getExtension('WEBGL_debug_renderer_info');
const times=[],cpu=[],gpu=[],counts=[];const ext=gl.getExtension('EXT_disjoint_timer_query');let q=null,qs=[],begin=performance.now(),cpuStart,lastHit=0,disjoints=0;
function poll(){if(!ext)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoints++;qs.forEach(x=>ext.deleteQueryEXT(x));qs=[];return;}while(qs.length&&ext.getQueryObjectEXT(qs[0],ext.QUERY_RESULT_AVAILABLE_EXT)){const x=qs.shift();gpu.push(ext.getQueryObjectEXT(x,ext.QUERY_RESULT_EXT)/1e6);ext.deleteQueryEXT(x)}}
return await new Promise(resolve=>{
function pre(){cpuStart=performance.now();times.push(cpuStart);const t=(cpuStart-begin)/1000;
if(scenario==='pan')s.cameras.main.centerOn(5280+Math.sin(t*Math.PI/5)*1000,9600);
if(scenario==='combat'&&t-lastHit>.3){lastHit=t;const vs=[...s.views.values()].filter(v=>v.state.kind==='monster');for(const v of vs){v.state.anim='attack';v.state.animSeq++;v.state.actionMs=280;}s.effects.handle(vs.slice(0,12).map(v=>({t:'hit',id:v.id,dmg:123})));}
poll();if(ext&&times.length%8===0){q=ext.createQueryEXT();ext.beginQueryEXT(ext.TIME_ELAPSED_EXT,q)}
}
function post(){cpu.push(performance.now()-cpuStart);if(q){ext.endQueryEXT(ext.TIME_ELAPSED_EXT);qs.push(q);q=null;}if(times.length%60===0)counts.push({actors:s.views.size,visibleActors:[...s.views.values()].filter(v=>v.inView).length,ground:s.mapView.regions.size,visibleGround:[...s.mapView.regions.values()].filter(r=>r.image?.visible).length,renderList:s.cameras.main.renderList.length});
if(performance.now()-begin>=30000){g.events.off('prestep',pre);g.events.off('postrender',post);setTimeout(()=>{poll();qs.forEach(x=>ext.deleteQueryEXT(x));resolve({times,cpu,gpu,counts,disjoints,renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),samples:gl.getParameter(gl.SAMPLES),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]})},300)}}
g.events.on('prestep',pre);g.events.on('postrender',post);
});
},scenario);
results.push({scenario,rep,enabled,...result});await fs.writeFile('/tmp/jx-culling/results.json',JSON.stringify({results,errors},null,2));console.log(scenario,rep,enabled,(result.times.length-1)*1000/(result.times.at(-1)-result.times[0]),result.counts.at(-1));
}
await p.screenshot({path:'/tmp/jx-culling/final.png'});
}finally{await browser?.close();await server?.close()}
