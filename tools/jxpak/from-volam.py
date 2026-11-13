#!/usr/bin/env python3
"""Build generator-compatible manifests using volam-shxt's read-only PAK helpers.
Usage: python3 tools/jxpak/from-volam.py CLIENT_ROOT SCRIPTS_DIR
Only writes CLIENT_ROOT/data_extract; original archives/loose files stay untouched.
"""
import sys, re, struct, ctypes, csv, json, functools, unicodedata
from pathlib import Path
root=Path(sys.argv[1]).resolve(); sys.path.insert(0,str(Path(sys.argv[2]).resolve()))
from unpack_pak import get_decompressor, g_HashString2Id
out=root/'data_extract'; out.mkdir(exist_ok=True)
dec=get_decompressor(); archives={}; winners={}; names={}
order=re.findall(r'^\d+=(.+?)\s*$',(root/'package.ini').read_text(),re.M)
for name in order:
 p=root/'data'/name
 if name=='dxrm.pak': continue
 with p.open('rb') as f:
  h=f.read(32); assert h[:4]==b'PACK',p
  n,o=struct.unpack_from('<II',h,4);f.seek(o)
  entries=list(struct.iter_unpack('<IIII',f.read(n*16)))
 archives[p.stem]=(p,entries)
 for e in entries:winners.setdefault(e[0],p.stem)

@functools.lru_cache(maxsize=500000)
def candidate(s):
 s=s.strip(' \r\n\t"\'').replace('/','\\')
 s=re.sub(r'\\+',r'\\',s)
 if not s or any(ord(c)<32 for c in s):return
 s='\\'+s.lstrip('\\')
 if '..' in s.split('\\'):return
 try: raw=s.encode('gbk').lower()
 except UnicodeError:return
 h=g_HashString2Id(raw)
 if h in winners:names.setdefault(h,re.sub('[A-Z]',lambda m:m[0].lower(),s))

def scan(data,parent=''):
 # Preserve GBK bytes and spaces within tab-separated table cells.
 text=data.decode('gbk',errors='replace')
 for cell in re.split(r'[\r\n\t\x00"\'=,;()]',text):
  cell=cell.strip()
  if re.search(r'\.(?:txt|ini|lua|spr|wav|wor|dat|cur|bmp|jpg|tga)$',cell,re.I):
   candidate(cell)
   if parent:candidate(parent+'\\'+cell)
   for prefix in ['sound','sound\\skill','settings','settings\\npcres','settings\\item','spr','spr\\ui3','spr\\npcres','spr\\skill','script']:
    candidate(prefix+'\\'+cell)
 # Paths embedded in Lua expressions and binary region records.
 for m in re.finditer(rb'\\(?:[^\x00\r\n\t"<>|]{1,240}?)\.(?:spr|wav|txt|ini|lua|wor|cur)',data,re.I):
  try:candidate(m[0].decode('gbk'))
  except UnicodeError:pass

for base in ['settings','script']:
 for p in (root/base).rglob('*'):
  if p.is_file():
   candidate(str(p.relative_to(root)))
   try:candidate(unicodedata.normalize('NFC',str(p.relative_to(root))).encode('latin1').decode('gbk'))
   except UnicodeError:pass
   scan(p.read_bytes(),str(p.parent.relative_to(root)))
repo=Path(__file__).resolve().parents[2]
for p in (repo/'apps/client/tools').rglob('*.ts'):scan(p.read_bytes())
# Small explicit bootstrap set: all have to match a PAK hash before inclusion.
for s in ['settings/maplist.ini','settings/skills.txt','settings/missles.txt','settings/magicdesc.ini','settings/gamesetting.ini','script/global/skills_table.lua']:candidate(s)
print('archives',len(archives),'winning entries',len(winners),'initial names',len(names),flush=True)

def unpack(raw,size):
 buf=ctypes.create_string_buffer(size+65536);n=ctypes.c_uint32(size)
 r=dec(raw,len(raw),buf,ctypes.byref(n))
 if r<0 or n.value!=size:raise ValueError(f'NRV2B {r}: {n.value} != {size}')
 return buf.raw[:size]

def decode(raw,size,flag):
 if flag in (1,32):return unpack(raw,size)
 if flag==0:
  if len(raw)!=size:raise ValueError('stored size mismatch')
  return raw
 if flag==17:
  if raw[:4]!=b'SPR\0':raise ValueError('frame-packed non-SPR')
  nf,nc=struct.unpack_from('<HH',raw,12);t=32+nc*3;pos=t+nf*8;frames=[];table=[];offset=0
  for i in range(nf):
   packed,original=struct.unpack_from('<Ii',raw,t+i*8)
   payload=raw[pos:pos+packed];pos+=packed
   frame=unpack(payload,original) if original>0 else payload
   table.append(struct.pack('<II',offset,len(frame)));frames.append(frame);offset+=len(frame)
  result=raw[:t]+b''.join(table)+b''.join(frames)
  if len(result)!=size:raise ValueError(f'SPR size {len(result)} != {size}')
  return result
 raise ValueError(f'unsupported flag {flag}')

records={}; errors=[]
for pak,(p,entries) in archives.items():
 folder=out/pak;folder.mkdir(exist_ok=True);rows=[]
 with p.open('rb') as f:
  for hid,off,size,ci in entries:
   flag=ci>>24;packed=ci&0xffffff;winner=winners[hid];dest=f'_unnamed/dat/{hid:08x}.dat';status='overridden'
   if winner==pak:
    target=folder/dest
    try:
     if target.exists() and target.stat().st_size==size: data=target.read_bytes()
     else:
      f.seek(off);data=decode(f.read(packed),size,flag);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
     status='ok'
     if data[:4]!=b'SPR\0' and data[:4]!=b'RIFF' and len(data)<4000000 and b'\x00' not in data[:256]:
      scan(data)
    except Exception as ex:status='error';errors.append((pak,f'{hid:08x}',str(ex)))
   rows.append([f'{hid:08x}',off,size,packed,flag,status,'' if winner==pak else winner,'', '',dest])
 records[pak]=rows
 print(pak,'ok',sum(r[5]=='ok' for r in rows),'names',len(names),'errors',len(errors),flush=True)
# Recover .wor names from the original map list (not loose mod data).
for hid,name in list(names.items()):
 if name.lower()=='\\settings\\maplist.ini':
  data=(out/winners[hid]/f'_unnamed/dat/{hid:08x}.dat').read_bytes().decode('gbk',errors='replace')
  for m in re.finditer(r'^\d+=(.+)$',data,re.M):
   s=m[1].strip();candidate('maps\\'+s+'.wor');candidate('maps\\'+s+'\\'+s.split('\\')[-1]+'.wor')
# Resource filenames in NPC tables are relative to ResFilePath from the type table.
def table(game):
 candidate(game)
 hid=g_HashString2Id(('\\'+game.replace('/', '\\').lstrip('\\')).encode('gbk').lower())
 data=(out/winners[hid]/f'_unnamed/dat/{hid:08x}.dat').read_bytes()
 return [line.split('\t') for line in data.decode('gbk',errors='replace').splitlines() if line.strip()]
types=table('settings/npcres/人物类型.txt');rescol=types[0].index('ResFilePath')
folders={r[0].strip():r[rescol].strip() for r in types[1:] if len(r)>rescol}
for row in table('settings/npcres/普通npc资源.txt')[1:]:
 folder=folders.get(row[0].strip())
 if not folder:continue
 for cell in row[1:]:
  cell=cell.strip()
  if cell.lower().endswith('.spr'):
   candidate(folder+'\\'+cell)
   candidate(folder+'\\'+cell[:-4]+'b.spr')

for pak,rows in records.items():
 with (out/pak/'_manifest.tsv').open('w',newline='') as f:
  w=csv.writer(f,delimiter='\t');w.writerow(['id','offset','size','packed_size','flag','status','overridden_by','reserved','path','file'])
  for row in rows:row[8]=names.get(int(row[0],16),'');w.writerow(row)
(out/'extraction-report.json').write_text(json.dumps({'archives':len(archives),'winning':len(winners),'named':len(names),'errors':errors},indent=2))
print('DONE',len(names),'named;',len(errors),'errors',flush=True)
if errors: print(errors[:20]);sys.exit(1)
