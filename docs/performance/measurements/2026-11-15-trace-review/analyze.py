"""Read Chrome traces without executing their content; usage: python3 analyze.py TRACE..."""
import collections
import hashlib
import json
import math
import statistics
import sys
from pathlib import Path


def stats(values):
    values = sorted(values)
    if not values:
        return None
    return dict(n=len(values), total_ms=round(sum(values) / 1000, 3),
                median_ms=round(statistics.median(values) / 1000, 3),
                p95_ms=round(values[math.ceil(.95 * len(values)) - 1] / 1000, 3),
                max_ms=round(max(values) / 1000, 3))


def analyze(path):
    raw = Path(path).read_bytes()
    data = json.loads(raw)
    events = data['traceEvents']
    window = data['metadata']['modifications']['initialBreadcrumb']['window']
    pid = next(e['args']['data']['frames'][0]['processId'] for e in events
               if e['name'] == 'TracingStartedInBrowser')
    tid = next(e['tid'] for e in events if e['name'] == 'thread_name'
               and e['pid'] == pid and e['args']['name'] == 'CrRendererMain')
    events = [e for e in events if window['min'] <= e['ts'] <= window['max']]
    main = [e for e in events if e['pid'] == pid and e['tid'] == tid]
    def duration(name, source=main):
        return stats([e['dur'] for e in source if e['name'] == name and 'dur' in e])
    frames = {}
    for name in ['FireAnimationFrame', 'DrawFrame', 'BeginFrame', 'AnimationFrame::Presentation']:
        times = sorted(e['ts'] for e in events if e['pid'] == pid and e['name'] == name)
        intervals = [b - a for a, b in zip(times, times[1:])]
        frames[name] = dict(count=len(times), interval=stats(intervals),
                            cadence_fps=round((len(times)-1)*1e6/(times[-1]-times[0]), 3) if len(times)>1 else None,
                            intervals_over_33_334_ms=sum(v > 33334 for v in intervals),
                            intervals_over_50_ms=sum(v > 50000 for v in intervals))
    raf = [e['dur'] for e in main if e['name'] == 'FireAnimationFrame' and 'dur' in e]
    layouts = {}
    for name in ['Layout', 'UpdateLayoutTree']:
        groups = collections.defaultdict(list)
        for e in main:
            if e['name'] != name or 'dur' not in e:
                continue
            stack = e.get('args', {}).get('beginData', {}).get('stackTrace', [])
            key = '(no JS stack)'
            if stack:
                key = stack[0]['url'].split('/src/')[-1] + ':' + stack[0].get('functionName', '')
            groups[key].append(e['dur'])
        layouts[name] = {k: stats(v) for k, v in groups.items()}
    gpu = [e for e in events if e['name'] == 'GPUTask' and 'dur' in e
           and e.get('args', {}).get('data', {}).get('renderer_pid') == pid]
    counters = [e['args']['data'] for e in main if e['name'] == 'UpdateCounters']
    return dict(file=Path(path).name, sha256=hashlib.sha256(raw).hexdigest(),
                window_us=window, duration_s=(window['max']-window['min'])/1e6,
                renderer_pid=pid, main_tid=tid, frames=frames,
                raf_callback=stats(raf), raf_callback_under_50_ms=stats([v for v in raf if v < 50000]),
                main_run_task=duration('RunTask'),
                main_long_tasks=[dict(duration_ms=e['dur']/1000, offset_s=(e['ts']-window['min'])/1e6)
                                 for e in main if e['name']=='RunTask' and e.get('dur', 0)>50000],
                profiler_start=duration('CpuProfiler::StartProfiling'),
                gc={n: duration(n) for n in ['MinorGC', 'MajorGC']},
                main_durations={n: duration(n) for n in ['Layout', 'UpdateLayoutTree', 'Paint', 'V8Console::Log']},
                layouts_by_first_stack_frame=layouts,
                gpu_task_wall=stats([e['dur'] for e in gpu]),
                gpu_thread_cpu_ms=round(sum(e.get('tdur', 0) for e in gpu)/1000, 3),
                gpu_reported_used_bytes_first_last=[e['args']['data']['used_bytes'] for e in [gpu[0],gpu[-1]]] if gpu else [],
                counters_first_last=[counters[0], counters[-1]] if counters else [],
                viewport=[e['args']['data'] for e in events if e['name']=='PaintTimingVisualizer::Viewport'],
                requests=[e['args']['data'].get('url') for e in main if e['name']=='ResourceSendRequest'],
                negative_profile_deltas=sum(dt<0 for e in events if e['name']=='ProfileChunk'
                                            for dt in e['args']['data'].get('timeDeltas', [])))


if __name__ == '__main__':
    print(json.dumps([analyze(path) for path in sys.argv[1:]], indent=2, ensure_ascii=False))
