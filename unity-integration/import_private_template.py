#!/usr/bin/env python3
"""Restore a locally supplied Unity package into a fresh private project."""
import argparse, gzip, hashlib, io, json, pathlib, re, tarfile, zipfile


def restore(source, project):
    source, project = pathlib.Path(source), pathlib.Path(project)
    if project.exists() and any(project.iterdir()):
        raise ValueError('Destination must be empty; refusing to overwrite existing project')
    if source.suffix.lower() == '.zip':
        with zipfile.ZipFile(source) as z:
            names = [n for n in z.namelist() if n.endswith('.unitypackage')]
            if len(names) != 1: raise ValueError('Expected exactly one .unitypackage')
            payload = z.read(names[0])
    else:
        payload = source.read_bytes()
    records, written, seen = [], [], set()
    with tarfile.open(fileobj=io.BytesIO(gzip.decompress(payload)), mode="r:") as t:
        members = t.getmembers()
        files = {m.name: m for m in members if m.isfile()}
        if len(files) != sum(m.isfile() for m in members): raise ValueError('Duplicate archive names')
        if any(not (m.isfile() or m.isdir()) for m in members): raise ValueError('Unsupported archive member')
        def read(name): return t.extractfile(files[name]).read()
        guid_paths = {}
        for name in files:
            if name == '.icon.png': continue
            if not re.fullmatch(r'[0-9a-f]{32}/(?:pathname|asset|asset.meta|preview.png)', name):
                raise ValueError('Unexpected member: ' + name)
            if name.endswith('/pathname'):
                guid = name.split('/')[0]
                p = read(name).decode('utf-8').splitlines()[0]
                path = pathlib.PurePosixPath(p)
                if not path.parts or path.is_absolute() or '..' in path.parts or '\\' in p or ':' in p or path.parts[0] not in ('Assets', 'ProjectSettings', 'Packages'):
                    raise ValueError('Unsafe path: ' + p)
                if p.casefold() in seen: raise ValueError('Duplicate path: ' + p)
                seen.add(p.casefold()); guid_paths[guid] = p
        if any(n.split('/')[0] not in guid_paths for n in files if n != '.icon.png'): raise ValueError('Orphan archive member')
        project.mkdir(parents=True, exist_ok=True)
        for guid, path in sorted(guid_paths.items(), key=lambda x: x[1]):
            dest = project / path
            asset, meta = guid+'/asset', guid+'/asset.meta'
            if asset in files:
                data = read(asset); dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(data)
                written.append({'path': path, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
            else: dest.mkdir(parents=True, exist_ok=True)
            if meta in files:
                data = read(meta)
                match = re.search(rb'^guid:\s*([0-9a-f]{32})\s*$', data, re.M)
                if not match or match.group(1).decode() != guid: raise ValueError('GUID mismatch: '+path)
                meta_dest = dest.with_name(dest.name+'.meta'); meta_dest.write_bytes(data)
                written.append({'path': path+'.meta', 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
            records.append({'guid':guid,'path':path,'asset':asset in files,'meta':meta in files,'preview':guid+'/preview.png' in files})
        archive_records = [{'name':n,'bytes':m.size,'sha256':hashlib.sha256(read(n)).hexdigest()} for n,m in sorted(files.items())]
    for r in written:
        if hashlib.sha256((project/r['path']).read_bytes()).hexdigest()!=r['sha256']: raise ValueError('Readback mismatch: '+r['path'])
    return {'package_sha256':hashlib.sha256(payload).hexdigest(),'paths':records,'members':archive_records,'written':written}

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('project');p.add_argument('--report',required=True);a=p.parse_args()
    result=restore(a.source,a.project)
    pathlib.Path(a.report).write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('Verified',len(result['paths']),'paths;',len(result['members']),'members;',len(result['written']),'written payloads and metadata')
