"""No dependency beyond Python stdlib. Validate artifact references and game-kit integrity."""
from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,subprocess,sys,re
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app'
DOCS=ROOT/'docs'
class HTMLAudit(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.actions=[]
    def handle_starttag(self,t,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if 'data-action' in d:self.actions.append(d['data-action'])

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def validate():
    specs=json.loads((DOCS/'SCREEN_LOCK.json').read_text())
    assert len(specs['screens'])==10
    assert specs['primarySource']=='PRIMARY_v2'
    for v in specs['sourceImages'].values():
        p=ROOT/v['path'];assert p.is_file() and sha(p)==v['sha256'],p
    for s in specs['screens']:
        crop=ROOT/s['sourcePrimaryPosterPanel']['crop']
        assert crop.exists() and sha(crop)==s['sourcePrimaryPosterPanel']['sha256'],crop
        x0,y0,x1,y1=s['sourcePrimaryPosterPanel']['rectPixels']
        assert 0<=x0<x1<=1536 and 0<=y0<y1<=1024
        for label,rect in s['targetAnchorRectNormalized'].items():
            x,y,w,h=rect;assert all(0<=v<=1 for v in rect) and x+w<=1.000001 and y+h<=1.000001,(label,rect)
    kit=json.loads((APP/'manifest/game_assets.json').read_text());assert len(kit['characters'])==24
    assert kit['runtime']['maximumPhysicalSegments']==220
    for c in kit['characters']:
        for part in ('head','body','tail','preview_10_parts'):
            p=APP/'assets/characters'/c['rarity']/c['id']/'3d'/f'{part}.glb'
            assert p.is_file() and p.stat().st_size>500,p
            assert p.read_bytes()[:4]==b'glTF',p
        for path in (APP/'assets/death_effects/3d'/f"{c['id']}_peak_burst.glb",APP/'assets/death_effects/configs'/f"{c['id']}.json",APP/'assets/death_effects/2d'/f"{c['id']}_8frames_192.png"):
            assert path.exists(),path
    assert len(list((APP/'assets/food/3d').glob('*.glb')))==10
    assert len(list((APP/'assets/trails/3d').glob('*.glb')))==6
    h=HTMLAudit();h.feed((APP/'index.html').read_text())
    assert len(h.ids)==len(set(h.ids)),'duplicate HTML ids'
    assert all(i in h.ids for i in ('scene3d','home','arena','revive','result','shop','creatures','secondary'))
    js=(APP/'src/main.js').read_text()
    for a in set(h.actions):
        assert f"'{a}'" in js or f'"{a}"' in js or f"{a}:[" in js,a
    assert 'new CrystalRenderer' in js and 'new CrystalArena' in js
    for f in list((APP/'src').glob('*.js'))+list((APP/'engine').glob('*.mjs')):
        cp=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
        assert cp.returncode==0,(f,cp.stderr)
    print(f'PASS: {len(specs["screens"])} reference-locked screens; 24 characters; 24 death GLBs + atlases + configs; 10 food GLBs; 6 trail GLBs; unique UI IDs; source hashes; JS syntax')
if __name__=='__main__':
    try:validate()
    except Exception as e:
        print('FAIL:',e,file=sys.stderr);raise
