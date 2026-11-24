from pathlib import Path
import json, re, subprocess
root = Path(__file__).resolve().parents[1]
app = root / 'app'
for f in sorted(app.rglob('*.js')):
    subprocess.run(['node','--check',str(f)],check=True)
    for rel in re.findall(r'''(?:from\s+|import\s*)['"](\.[^'"]+)['"]''',f.read_text(encoding='utf-8')):
        assert (f.parent / rel).is_file(), (f,rel)
manifest = json.loads((app/'manifest.webmanifest').read_text(encoding='utf-8'))
for icon in manifest['icons']:
    assert (app/icon['src']).is_file(),icon
sw = (app/'sw.js').read_text(encoding='utf-8')
for rel in re.findall(r"'\./([^']*)'",sw.split('];',1)[0]):
    assert (app/rel).exists(),rel
assert (app/'index.html').is_file()
print('AAA runtime: JavaScript syntax, static imports, icon and cache targets verified')
