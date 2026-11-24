"""Apply only approved private P02 files to an exact P01 baseline."""
import argparse, hashlib, json
from pathlib import Path

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def apply(project, overlay, manifest):
    project, overlay = Path(project).resolve(), Path(overlay).resolve()
    manifest = json.loads(Path(manifest).read_text())
    pending = []
    for name, record in manifest.items():
        path = Path(name)
        if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] not in ('Assets','ProjectSettings'):
            raise ValueError('Invalid path: '+name)
        src, dest = (overlay/path).resolve(), (project/path).resolve()
        if not src.is_relative_to(overlay) or not dest.is_relative_to(project): raise ValueError('Unsafe resolved path: '+name)
        if not src.is_file() or digest(src)!=record['after']: raise ValueError('Overlay hash mismatch: '+name)
        current = digest(dest) if dest.is_file() else None
        if current not in (record['before'], record['after']): raise ValueError('Baseline hash mismatch: '+name)
        if current != record['after']: pending.append((src,dest))
    for src,dest in pending:
        dest.parent.mkdir(parents=True,exist_ok=True)
        temporary=dest.with_name(dest.name+'.p02-tmp')
        temporary.write_bytes(src.read_bytes()); temporary.replace(dest)
    for name, record in manifest.items():
        if digest(project/name)!=record['after']: raise ValueError('Readback hash mismatch: '+name)
    return len(pending)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('project');p.add_argument('overlay');p.add_argument('manifest');a=p.parse_args()
    print('Applied',apply(a.project,a.overlay,a.manifest),'verified files')
