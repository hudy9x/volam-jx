import json,statistics,math
from pathlib import Path
root=Path('/tmp/jx-culling');d=json.loads((root/'results.json').read_text());out=[]
def p95(a):return sorted(a)[math.ceil(.95*len(a))-1]
for scene in ['stand','pan','combat']:
 for enabled in [False,True]:
  rows=[r for r in d['results']if r['scenario']==scene and r['enabled']==enabled]
  out.append(dict(scene=scene,enabled=enabled,reps=len(rows),fps=statistics.median((len(r['times'])-1)*1000/(r['times'][-1]-r['times'][0])for r in rows),frame_p95_ms=statistics.median(p95([b-a for a,b in zip(r['times'],r['times'][1:])])for r in rows),main_wall_median_ms=statistics.median(statistics.median(r['cpu'])for r in rows),gpu_median_ms=statistics.median(statistics.median(r['gpu'])for r in rows),disjoints=sum(r['disjoints']for r in rows),frames=sum(len(r['times'])for r in rows),last_counts=rows[-1]['counts'][-1]))
summary=dict(results=out,errors=d['errors'],renderer=d['results'][0]['renderer'],buffer=d['results'][0]['buffer'],samples=d['results'][0]['samples'])
(root/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
