"""Regenerate procedural crystal-dragon upgrades in glTF 2.0 GLB format.
All outputs are original geometry, do not rely on screenshots as game textures.
Produces baked vertices (loader intentionally supports minimal glTF triangle primitives).
"""
import os, json, math, copy
from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals
ROOT=Path(__file__).resolve().parents[1]/'app'
MANIFEST=json.loads((ROOT/'manifest/game_assets.json').read_text())

def mat(color,metal=0.32,rough=.22):
    rgb=np.array(trimesh.visual.color.hex_to_rgba(color),dtype=np.uint8)
    return PBRMaterial(baseColorFactor=rgb,metallicFactor=metal,roughnessFactor=rough,doubleSided=True)

def mix(c,d,t):
    a=np.array(trimesh.visual.color.hex_to_rgba(c)[:3],dtype=float);b=np.array(trimesh.visual.color.hex_to_rgba(d)[:3],dtype=float)
    v=(1-t)*a+t*b
    return '#'+''.join('%02x'%int(np.clip(x,0,255)) for x in v)

def add(scene,name,mesh,color,metal=.32,rough=.22):
    mesh.visual=TextureVisuals(material=mat(color,metal,rough));scene.add_geometry(mesh,geom_name=name)

def ico(pos,scale,sub=1):
    mesh=trimesh.creation.icosphere(subdivisions=sub,radius=1.0)
    mesh.apply_scale(scale);mesh.apply_translation(pos);return mesh

def facet(pos,scale,rot=0):
    # faceted gem spike, axis along Y
    h=trimesh.creation.cone(radius=1,height=2.1,sections=5)
    h.apply_transform(trimesh.transformations.rotation_matrix(-math.pi/2,[1,0,0]))
    h.apply_scale(scale)
    h.apply_transform(trimesh.transformations.rotation_matrix(rot,[0,1,0]))
    h.apply_translation(pos);return h

def shard(a,b,r0=.11,r1=.015,sides=5):
    a,b=np.asarray(a,dtype=float),np.asarray(b,dtype=float)
    axis=b-a; length=np.linalg.norm(axis)
    mesh=trimesh.creation.cone(radius=r0,height=length,sections=sides)
    # triangle pointing from a towards b
    mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],axis/length))
    mesh.apply_translation((a+b)/2)
    return mesh

def split_scene(scene):return list(scene.geometry.items())

def load_base(fp):
    return trimesh.load(fp,force='scene')

def head_up(src,primary,secondary,rank):
    scene=load_base(src)
    gold='#fff4ad';ice='#d1fcff'
    # facial cheek-armor with highlights; original face and eyes retained
    for side in (-1,1):
        for j in range(4):
            px=-.43+j*.19; pz=side*(.45+0.07*math.sin(j*1.1)); py=.0+.08*math.cos(j)
            add(scene,f'face_lamella_{side}_{j}',ico([px,py,pz],[.17,.125,.075],1),mix(primary,ice,(j%2)*.26+.23),.48,.16)
        # head horn fans, symmetrical, crystal spines
        for j in range(3):
            x=-.13+j*.29
            a=[x,.38,side*(.30+.05*j)];b=[x+.13,.82+j*.16,side*(.42+j*.10)]
            add(scene,f'horn_{side}_{j}',shard(a,b,.15,.003,6),mix(secondary,ice,.25+j*.17),.5,.1)
            add(scene,f'horn_core_{side}_{j}',shard([x,.43,side*.34],[x+.11,.70+j*.13,side*(.41+j*.1)],.044,.003,5),gold,.22,.12)
        # bright expression iris and sparkle (position tuned to existing eye geometry)
        add(scene,f'eye_iris_{side}',ico([-.465,.17,side*.562],[.092,.095,.025],2),'#1652c9',.4,.12)
        add(scene,f'eye_core_{side}',ico([-.489,.175,side*.585],[.048,.069,.015],2),'#040c38',.1,.2)
        add(scene,f'eye_shine_{side}',ico([-.512,.215,side*.607],[.026,.031,.012],2),'#ffffff',.05,.1)
    # crystal crest on brow with faceted prongs
    for i in range(5):
        z=(-2+i)*.10;x=-.34+abs(i-2)*.06
        add(scene,f'crown_facet_{i}',shard([x,.36,z],[x-.10,.66+(2-abs(i-2))*.095,z*.6],.075,.003,5),mix(primary,'#faacff',i/6),.5,.08)
    # high tier gets huge glowing crystalline frills
    if rank>=2:
        for side in (-1,1):
            for j in range(3+min(3,rank)):
                x=.10+j*.16; s=side
                add(scene,f'royal_frill_{side}_{j}',shard([x,.18,s*.47],[x+.2,.39+(rank*.06),s*(.65+.055*j)],.10+.008*rank,.002,5),mix(secondary,gold,j/13+.18),.55,.1)
    if rank>=4:
        add(scene,'forehead_sigil',ico([-.42,.40,0],[.12,.12,.11],1),gold,.7,.07)
    return scene

def body_up(src,primary,secondary,rank):
    scene=load_base(src)
    # layered reflective scales on every segment, light on top and sides
    for j in range(11):
        az=(j/11)*math.pi*2
        x=.15*math.sin(j*2.2)
        y=.23+math.cos(az)*.36
        z=math.sin(az)*.34
        if y<-.12: continue
        add(scene,f'body_scale_{j}',ico([x,y,z],[.23,.11,.13],1),mix(primary,secondary,.15+(j%3)*.16),.52,.16)
        if rank>=3 and j%2==0:
            add(scene,f'body_fin_{j}',shard([x,y,z],[x+.1,y+.28,z+.1*math.sin(az)],.1,.003),mix(primary,'#ffffff',.3),.48,.09)
    add(scene,'luminescent_core',ico([0,.1,0],[.29,.26,.29],1),mix(primary,'#ffffff',.32),.1,.04)
    return scene

def tail_up(src,primary,secondary,rank):
    scene=load_base(src)
    for j in range(7):
        a=j*2*math.pi/7;off=[.35,.05+math.sin(a)*.12,math.cos(a)*.11]
        tip=[.93+.1*rank,.18+math.sin(a)*(.2+.06*rank),math.cos(a)*(.33+.04*rank)]
        add(scene,f'tail_bloom_{j}',shard(off,tip,.1,.003,5),mix(primary,secondary,(j%3)/4),.45,.1)
    return scene

def preview(ch,rank,folder):
    scene=trimesh.Scene()
    # all baked into world geometry, oriented to travel toward -X
    parts=[]
    for part in ('head','body','tail'):
        s=load_base(folder/f'{part}.glb')
        parts.append(s)
    count=10
    for i in range(count):
        src=parts[0 if i==0 else 2 if i==count-1 else 1]
        bend=(i/(count-1))*1.4
        dx=.64*i
        dy=.035*math.sin(i*.62)
        dz=.2*math.sin(i*.40)
        sc=1 if i==0 else (1-.04*i if i>6 else .85)
        for n,g in src.geometry.items():
            m=g.copy();m.apply_scale(sc)
            m.apply_translation([dx,dy,dz]);scene.add_geometry(m,geom_name=f'part_{i}_{n}')
    return scene

def make_stage():
    scene=trimesh.Scene()
    # ethereal 3D circular display podium, crystals, royal portal ring
    for j,(radius,high,c) in enumerate([(2.75,-1.4,'#114eac'),(2.40,-1.20,'#148aff'),(2.13,-1.10,'#cb59ff')]):
        for n in range(48):
            a=2*math.pi*n/48
            mesh=ico([radius*math.cos(a),high,radius*math.sin(a)],[.15,.08,.15],0)
            add(scene,f'podium_{j}_{n}',mesh,c,.55,.1)
    for n in range(14):
        a=2*math.pi*n/14;r=2.1+(.3 if n%3==0 else 0)
        h=.4+.25*(n%5)
        add(scene,f'cluster_{n}',shard([r*math.cos(a),-1.22,r*math.sin(a)],[r*math.cos(a),-1.22+h,r*math.sin(a)],.20,.003,6),['#15ecff','#ad4aff','#fc8bff'][n%3],.55,.12)
    for n in range(12):
        a=2*math.pi*n/12
        x=2.8*math.cos(a);z=2.8*math.sin(a)
        add(scene,f'orbit_{n}',ico([x,-.78,z],[.06,.07,.06],1),'#ffe9a7',.75,.05)
    return scene

if __name__=='__main__':
  import time
  start=time.time()
  for i,c in enumerate(MANIFEST['characters']):
    folder=ROOT/'assets/characters'/c['rarity']/c['id']/'3d'
    r=['common','uncommon','rare','epic','legendary','mythic'].index(c['rarity'])
    col=c['primaryColor'];secondary=c['secondaryColor']
    for part,fn in [('head',head_up),('body',body_up),('tail',tail_up)]:
        obj=fn(folder/f'{part}.glb',col,secondary,r)
        (folder/f'{part}.glb').write_bytes(obj.export(file_type='glb'))
    hero=preview(c,r,folder)
    (folder/'preview_10_parts.glb').write_bytes(hero.export(file_type='glb'))
    c['designStatus']='procedural premium-detail v4 mesh; high fidelity screenshot parity unverified'
    c['renderTier']='premium-procedural-v4'
    print(f'{i+1:02d}/24 {c["id"]}: {len(hero.geometry)} meshes',flush=True)
  (ROOT/'assets/scene').mkdir(exist_ok=True)
  (ROOT/'assets/scene/lobby_stage.glb').write_bytes(make_stage().export(file_type='glb'))
  (ROOT/'manifest/game_assets.json').write_text(json.dumps(MANIFEST,indent=2),encoding='utf8')
  print('Done',round(time.time()-start,2),'seconds')
