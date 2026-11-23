"""Restore checked-in compressed 3D assets from immutable, sha256-verified parts."""
from pathlib import Path
import hashlib, json, tarfile, io, sys
ROOT=Path(__file__).resolve().parents[1]
PACKS=ROOT/'packs'

def main():
    doc=json.loads((PACKS/'integrity.json').read_text())
    chunks=[]
    for p in doc['parts']:
        target=PACKS/p['name'];chunk=target.read_bytes()
        assert len(chunk)==p['bytes'],f'{target} size mismatch'
        assert hashlib.sha256(chunk).hexdigest()==p['sha256'],f'{target} hash mismatch'
        chunks.append(chunk)
    data=b''.join(chunks)
    assert hashlib.sha256(data).hexdigest()==doc['tar_sha256'],'Package checksum mismatch'
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as tar:
        for m in tar.getmembers():
            target=(ROOT/m.name).resolve()
            if not target.is_relative_to(ROOT.resolve()) or not(m.isfile() or m.isdir()):
                raise RuntimeError('Unsafe archived entry: '+m.name)
        entry_count=len(tar.getmembers())
        tar.extractall(ROOT,filter='data')
    print(f'Assets restored: {len(data):,} bytes, {entry_count} archived entries')

if __name__=='__main__': main()
