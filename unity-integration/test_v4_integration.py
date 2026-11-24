import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from check_v4_integration import audit, blob_sha

ROOT = Path(__file__).resolve().parent

class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for path in ROOT.glob('P*_*.json'):
            shutil.copyfile(path, self.root / path.name)

    def mutate(self, name, change, rehash=False):
        p = self.root / name
        value = json.loads(p.read_text())
        change(value)
        p.write_text(json.dumps(value))
        if rehash:
            l = self.root / 'P10_INTEGRATION_LOCK.json'
            value = json.loads(l.read_text())
            value['manifests'][name] = blob_sha(p.read_bytes())
            l.write_text(json.dumps(value))

    def test_clean(self):
        self.assertEqual(audit(self.root)['records'], 90)
        self.assertEqual(audit(self.root)['unique_targets'], 58)

    def test_tampered_manifest(self):
        p = self.root / 'P02_OVERLAY_MANIFEST.json'
        p.write_bytes(p.read_bytes() + b' ')
        with self.assertRaisesRegex(ValueError, 'Manifest drift'):
            audit(self.root)

    def test_missing_phase(self):
        self.mutate('P10_INTEGRATION_LOCK.json', lambda x: x['manifests'].pop('P09_OVERLAY_MANIFEST.json'))
        with self.assertRaisesRegex(ValueError, 'phase set'):
            audit(self.root)

    def test_chain_break_even_with_rehash(self):
        self.mutate('P04_OVERLAY_MANIFEST.json', lambda x: x['Assets/SnakeWarzIO/Classes/PlayerController.cs'].update(before='a'*64), True)
        with self.assertRaisesRegex(ValueError, 'Broken overlay chain'):
            audit(self.root)

    def test_status_drift(self):
        self.mutate('P09_QA_STATUS.json', lambda x: x.update(acceptance_matrix={'total':57,'pass':57,'blocked':0,'not_run':0}))
        with self.assertRaisesRegex(ValueError, 'acceptance status drift'):
            audit(self.root)

    def test_release_hold(self):
        r = subprocess.run([sys.executable, str(ROOT/'check_v4_integration.py'), '--root', str(self.root), '--require-release'], capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('BLOCKED:', r.stderr)

if __name__ == '__main__': unittest.main()
