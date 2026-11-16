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

const checks=await p.evaluate(async()=>{
 const g=window.__vltk.game(),s=g.scene.getScene('world'),v=[...s.views.values()].find(v=>v.state.kind==='monster');
 const original={x:v.state.x,y:v.state.y};const cam=s.cameras.main;const frame=()=>new Promise(r=>g.events.once('postrender',r));
 cam.centerOn(5280,9600);await frame();await frame();
 const off=[...s.views.values()].filter(v=>!v.inView);if(!off.length)throw Error('No offscreen actors');
 if(off.some(v=>v.label.visible||v.bar.visible||v.jx.images.some(i=>i.visible)))throw Error('Offscreen sprite/plate still visible');
 const hiddenRegions=[...s.mapView.regions.values()].filter(r=>r.image&&!r.image.visible).length;if(!hiddenRegions)throw Error('No hidden retained ground');
 const outside=off[0];cam.centerOn(outside.x,outside.y);await frame();await frame();if(!outside.inView||!outside.label.visible)throw Error('Actor did not reappear');
 cam.setZoom(4);await frame();await frame();cam.setZoom(2);cam.centerOn(5280,9600);await frame();await frame();
 const {settings}=await import('/src/state/settings.ts');settings.set({viewport:'1280x800'});await frame();await frame();
 if(g.renderer.gl.drawingBufferWidth!==2560||g.renderer.gl.drawingBufferHeight!==1600)throw Error('Viewport buffer changed');
 return {offscreenActors:off.length,hiddenRegions,reentry:true,zoom:true,preset800:true,buffer:[g.renderer.gl.drawingBufferWidth,g.renderer.gl.drawingBufferHeight]};
});console.log('CHECKS',checks);await p.screenshot({path:'/tmp/jx-culling/checks.png'});await fs.writeFile('/tmp/jx-culling/checks.json',JSON.stringify({checks,errors},null,2));
await p.evaluate(()=>{const g=window.__vltk.game(),gl=g.renderer.gl;window.__draws=[];let n=0;for(const name of ['drawArrays','drawElements']){const fn=gl[name].bind(gl);gl[name]=(...args)=>{n++;return fn(...args)}}g.events.on('postrender',()=>{window.__draws.push(n);n=0})});
const presentation=[];const cdp=await c.newCDPSession(p);
for(const enabled of [false,true]){
 await p.evaluate(on=>{const s=window.__vltk.game().scene.getScene('world');for(const v of s.views.values())v.cullingEnabled=on;s.mapView.cullingEnabled=on;s.mapView.lastCull.x=NaN},enabled);
 await p.evaluate(()=>window.__draws=[]);const events=[];cdp.on('Tracing.dataCollected',collect);function collect(e){events.push(...e.value)};
 await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline.frame',transferMode:'ReportEvents'});
 await p.waitForTimeout(10000);const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;cdp.off('Tracing.dataCollected',collect);
 const times=events.filter(e=>e.name==='AnimationFrame::Presentation').map(e=>e.ts).sort((a,b)=>a-b);
 presentation.push({enabled,times,drawCalls:await p.evaluate(()=>window.__draws)});
}
await fs.writeFile('/tmp/jx-culling/presentation.json',JSON.stringify(presentation));
}finally{await browser?.close();await server?.close()}
