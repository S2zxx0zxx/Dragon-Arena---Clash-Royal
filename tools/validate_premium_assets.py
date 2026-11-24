"""Static 3D asset quality and correct hierarchy assertions. No rendered fidelity claims."""
from pathlib import Path
import json,math,sys
import numpy as np
import trimesh
root=Path(__file__).resolve().parents[1];assets=root/'app/assets'
manifest=json.loads((root/'app/manifest/game_assets.json').read_text())
checks=0;faces_total=0
for c in manifest['characters']:
    for part in ('head','body','tail'):
        f=root/'app'/c['3d'][part]
        scene=trimesh.load(f,force='scene')
        assert len(scene.geometry)>=7,(c['id'],part,len(scene.geometry))
        assert scene.is_empty is False
        bounds=scene.bounds;assert np.all(np.isfinite(bounds)),f
        faces=sum(len(g.faces) for g in scene.geometry.values());faces_total+=faces
        if part=='head': assert faces>=1700,(f,faces)
        checks+=1
    f=root/'app'/c['3dPreview'];s=trimesh.load(f,force='scene')
    assert len(s.geometry)>=70,(c['id'],'preview')
    checks+=1
    f=assets/'death_effects/3d'/f'{c["id"]}_peak_burst.glb'
    assert f.exists() and f.stat().st_size>500
    checks+=1
for food in (assets/'food/3d').glob('*.glb'):
    mesh=trimesh.load(food,force='scene');assert mesh.is_empty is False;checks+=1
scene=trimesh.load(assets/'scene/lobby_stage.glb',force='scene');assert len(scene.geometry)>100
checks+=1
assert len(manifest['characters'])==24
print(json.dumps({'passed':True,'checked_assets':checks,'model_triangles_across_head_body_tail':faces_total,'premium_stage_mesh_count':len(scene.geometry)},indent=2))
