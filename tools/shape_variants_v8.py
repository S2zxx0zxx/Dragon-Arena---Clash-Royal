"""Generate unique real 3D geometry per existing character's shapeFamily.
Source models remain genuine glTF 2.0 GLB, never screenshots or static images.
Must run after tools/unpack_assets.py; deterministic and idempotent.
"""
import math, json
from pathlib import Path
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

root=Path(__file__).resolve().parents[1]/'app'
manifest=json.loads((root/'manifest/game_assets.json').read_text())
marker=root/'assets/scene/shape_variants_v8.done'

def apply_mat(mesh,color):
 mesh.visual=TextureVisuals(material=PBRMaterial(baseColorFactor=trimesh.visual.color.hex_to_rgba(color),metallicFactor=.48,roughnessFactor=.16,doubleSided=True))
 return mesh
def gem(start,end,r=.15):
 a,b=np.asarray(start,float),np.asarray(end,float);v=b-a
 mesh=trimesh.creation.cone(radius=r,height=float(np.linalg.norm(v)),sections=6)
 mesh.apply_transform(trimesh.geometry.align_vectors([0,0,1],v/np.linalg.norm(v)))
 mesh.apply_translation((a+b)*.5);return mesh
def oval(center,scale):
 mesh=trimesh.creation.icosphere(subdivisions=1,radius=1)
 mesh.apply_scale(scale);mesh.apply_translation(center);return mesh
def add(scene,name,mesh,color):scene.add_geometry(apply_mat(mesh,color),geom_name=name)
def sculpt(scene,part,ch,index):
 f=ch['shapeFamily'];a=ch['primaryColor'];b=ch['secondaryColor']
 tier=['common','uncommon','rare','epic','legendary','mythic'].index(ch['rarity'])
 if part=='head':
  if f in ('fox','bunny','cub','pup','round'):
   for side in (-1,1):
    if f=='bunny':
     add(scene,'long_ear_'+str(side),oval([.19,.72,side*.41],[.15,.52,.15]),b)
    elif f=='fox':
     add(scene,'fox_ear_'+str(side),gem([.12,.3,side*.39],[.16,1.09,side*.52],.24),b)
    elif f=='pup':
     add(scene,'soft_ear_'+str(side),oval([.25,.49,side*.61],[.22,.34,.14]),b)
    elif f=='cub':
     add(scene,'round_ear_'+str(side),oval([.22,.57,side*.50],[.23,.24,.18]),b)
    else:add(scene,'cheek_'+str(side),oval([-.4,.0,side*.4],[.24,.23,.18]),a)
  elif f in ('leaf','flame','spike','rock'):
   for side in (-1,1):
    for j in range(3):
     x=.1+j*.25;z=side*(.40+j*.06)
     if f=='leaf':mesh=oval([x,.67,z],[.11,.38,.14])
     elif f=='rock':
      mesh=trimesh.creation.box(extents=[.3,.34,.28]);mesh.apply_translation([x,.55,z])
     else:mesh=gem([x,.34,z],[x+.13,1.15+j*.14,z+side*.11],.12 if f=='spike' else .16)
     add(scene,f+'_crest_'+str(side)+'_'+str(j),mesh,b)
  else:
   for side in (-1,1):
    if f=='kirin':
     add(scene,'antler_'+str(side),gem([-.22,.33,side*.35],[-.32,1.5,side*.58],.16),b)
     for j in range(3):add(scene,'branch_'+str(side)+'_'+str(j),gem([-.3,.74+j*.21,side*.53],[-.58,1.0+j*.23,side*.69],.085),b)
    elif f=='phoenix':
     for j in range(5):add(scene,'feather_'+str(side)+'_'+str(j),gem([j*.16,.25,side*.43],[.1+j*.19,1.11+j*.11,side*(.75+j*.08)],.13),b)
    elif f=='leviathan':
     for j in range(4):add(scene,'gill_'+str(side)+'_'+str(j),oval([-.25+j*.21,.1,side*(.6+j*.08)],[.20,.14,.3]),b)
    elif f=='dragon':
     add(scene,'horn_'+str(side),gem([-.25,.4,side*.32],[-.70,1.20+.06*tier,side*.53],.18),b)
     for j in range(5):add(scene,'crown_'+str(side)+'_'+str(j),gem([j*.17,.28,side*.37],[j*.20,1.07+j*.06,side*.60],.11),b)
    else:add(scene,'serpent_crest_'+str(side),gem([-.16,.40,side*.27],[-.35,1.0,side*.38],.16),b)
  for j in range(index%4):
   add(scene,'unique_sigil_'+str(j),gem([.08+j*.16,.43,.0],[.05+j*.16,.70+.014*index,.0],.08),b)
 elif part=='body':
  if f in ('leaf','phoenix','leviathan'):
   for side in (-1,1):
    for j in range(3):add(scene,'wing_'+str(side)+'_'+str(j),gem([j*.12,.22,side*.28],[j*.14,.68,side*(.44+j*.12)],.14),b)
  elif f in ('rock','spike','dragon','serpent'):
   for side in (-1,1):add(scene,'armor_'+str(side),oval([0,.17,side*.34],[.36,.17,.18]),a)
  elif f in ('bunny','fox','cub','pup','round'):add(scene,'soft_spine',oval([0,.35,0],[.24,.22,.30]),b)
 else:
  if f=='phoenix':
   for j in range(7):add(scene,'plume_'+str(j),gem([.4,.1,0],[1.36+j*.06,.26,(j-3)*.17],.12),b)
  elif f=='bunny':add(scene,'cotton_tail',oval([.84,.13,0],[.3,.34,.33]),b)
  elif f=='leaf':add(scene,'leaf_tail',oval([.85,.1,0],[.52,.13,.31]),b)
  else:
   for j in range(3+index%3):add(scene,'ray_'+str(j),gem([.40,.12,0],[1.2,.26,(j-2)*.17],.10),b)
def preview(folder):
 scene=trimesh.Scene();parts={n:trimesh.load(folder/(n+'.glb'),force='scene') for n in ['head','body','tail']}
 for i in range(10):
  part='head' if i==0 else 'tail' if i==9 else 'body'
  for name,model in parts[part].geometry.items():
   mesh=model.copy();mesh.apply_scale(1 if i==0 else .83 if i<8 else .61)
   mesh.apply_translation([i*.64,.08*math.sin(i*.55),.15*math.cos(i*.4)])
   scene.add_geometry(mesh,geom_name=str(i)+'_'+name)
 return scene
def main():
 if marker.exists():print('Unique silhouettes already present');return
 for i,ch in enumerate(manifest['characters']):
  folder=root/'assets/characters'/ch['rarity']/ch['id']/'3d'
  for part in ['head','body','tail']:
   path=folder/(part+'.glb');scene=trimesh.load(path,force='scene')
   sculpt(scene,part,ch,i);path.write_bytes(scene.export(file_type='glb'))
  (folder/'preview_10_parts.glb').write_bytes(preview(folder).export(file_type='glb'))
  print(str(i+1)+'/24 '+ch['id']+' '+ch['shapeFamily'])
 marker.write_text('24 shapes generated after verified source restoration\n')
if __name__=='__main__':main()
