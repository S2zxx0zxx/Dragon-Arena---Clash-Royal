"""Create transport-safe, individually hashed Git object payloads.
Temporary *_push_payload_NN.md files stay outside project; Git only receives original blobs.
"""
from pathlib import Path
import tarfile,io,hashlib,json,base64,math,os
root=Path(__file__).resolve().parents[1]
packDir=root/'packs';packDir.mkdir(exist_ok=True)
parts=sorted(p for d in ['app/assets','app/references','app/icons'] for p in (root/d).rglob('*') if p.is_file())
out=io.BytesIO()
with tarfile.open(fileobj=out,mode='w:gz',compresslevel=8) as tar:
 for p in parts:
  tar.add(p,arcname=p.relative_to(root),recursive=False)
data=out.getvalue();step=770_000
manifest={'tar_sha256':hashlib.sha256(data).hexdigest(),'parts':[],'original_file_count':len(parts),'original_unpacked_bytes':sum(p.stat().st_size for p in parts)}
for i in range(0,len(data),step):
 chunk=data[i:i+step];name=f'asset_bundle.part{i//step:02d}';(packDir/name).write_bytes(chunk)
 manifest['parts'].append({'name':name,'bytes':len(chunk),'sha256':hashlib.sha256(chunk).hexdigest()})
(packDir/'integrity.json').write_text(json.dumps(manifest,indent=2))
source=[p for p in root.rglob('*') if p.is_file() and p.parts[-2] not in ('__pycache__',) and 'packs' not in p.relative_to(root).parts and all(x not in p.relative_to(root).parts for x in ('assets','references','icons')) and not p.name.endswith('.pyc') and (not '.git' in p.relative_to(root).parts)]
source=[p for p in source if p.suffix not in ('.zip','.gz','.png','.glb','.gif','.woff','.jpg','.webp')]
source=sorted(source)
payload=[]
for p in source:
 rel=p.relative_to(root).as_posix()
 try:s=p.read_text('utf-8')
 except Exception:continue
 payload.append({'path':rel,'content':s,'encoding':'utf8'})
print(json.dumps({'package_original_files':len(parts),'compressed_bytes':len(data),'asset_chunks':len(manifest['parts']),'repo_source_text_files':len(payload),'text_bytes':sum(len(x['content']) for x in payload)},indent=2))
# GitHub script import source payload; separate JSON entries into 3 files <110KB for Files.read.
cap=80000;groups=[];current=[];size=0
for elem in payload:
 row=json.dumps(elem,ensure_ascii=False)
 if current and size+len(row)>cap:groups.append(current);current=[];size=0
 current.append(elem);size+=len(row)
if current:groups.append(current)
for i,g in enumerate(groups):
 p=Path(f'/mnt/data/dragon_source_stage_{i:02d}.md');p.write_text(json.dumps(g,ensure_ascii=False),encoding='utf8')
 print('SOURCE_STAGE',p.name,p.stat().st_size)
for i,c in enumerate(manifest['parts']):
 p=Path(f'/mnt/data/dragon_asset_stage_{i:02d}.md');p.write_text(json.dumps({'path':'packs/'+c['name'],'base64':base64.b64encode((packDir/c['name']).read_bytes()).decode()},separators=(',',':')))
 print('ASSET_STAGE',p.name,p.stat().st_size)
