import { attackTiming, totalSpeedPercents, resolveSpeed, SPEED } from '@vltk/shared';
import { progress } from '../../state/progress';
let rows: unknown[] | null = null;
let start = 0;
let button: HTMLButtonElement | null = null;
/** Dev-only, opt-in capture. Download contains timing/attributes, never auth tokens. */
export function traceFrame(sample: { time: number; [key: string]: unknown }): void {
  if (!import.meta.env.DEV) return;
  if (!button) {
    button = document.createElement('button');
    button.textContent = 'Ghi frame 10 giây';
    Object.assign(button.style, {position:'fixed',right:'8px',top:'8px',zIndex:'99999',padding:'8px',background:'#20190f',color:'#ffe099',border:'1px solid #ad8b45'});
    document.body.append(button);
    button.onclick = () => { rows = []; start = performance.now(); button!.disabled = true; button!.textContent = 'Đang ghi: hãy chạy / đánh…'; };
  }
  if (!rows) return;
  const p = progress.get();
  const bag = p?.combat?.bag;
  const slow = !!(Number(sample.ctl ?? 0) & 2);
  rows.push({...sample, recordedMs:performance.now()-start,
    totals:bag ? totalSpeedPercents(bag,slow) : null,
    external:bag ? attackTiming(bag,true,slow) : null,
    internal:bag ? attackTiming(bag,false,slow) : null,
    run:bag ? resolveSpeed('run',totalSpeedPercents(bag,slow).run) : null});
  if (performance.now()-start < 10000 && rows.length < 5000) return;
  const blob = new Blob([JSON.stringify({version:1,config:SPEED,attributes:bag,frames:rows},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href=url; a.download=`speed-frames-${Date.now()}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  rows=null; button.disabled=false; button.textContent='Ghi frame 10 giây';
}
