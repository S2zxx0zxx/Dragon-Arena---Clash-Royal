import gzip, io, pathlib, tarfile, tempfile, unittest
from import_private_template import restore

G = 'a' * 32

class RestoreTests(unittest.TestCase):
    def make(self, root, path='Assets/Test.txt', meta=G, extra=None):
        buf = io.BytesIO()
        entries = {G+'/pathname': (path+'\n00').encode(), G+'/asset': b'actual payload', G+'/asset.meta': ('guid: '+meta+'\n').encode(), '.icon.png': b'preview'}
        entries.update(extra or {})
        with tarfile.open(fileobj=buf, mode='w') as t:
            for name, data in entries.items():
                info = tarfile.TarInfo(name); info.size = len(data); t.addfile(info, io.BytesIO(data))
        src = root/'test.unitypackage'; src.write_bytes(gzip.compress(buf.getvalue())); return src

    def test_restore_and_preserve_guid(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d); project=p/'project'; report=restore(self.make(p),project)
            self.assertEqual((project/'Assets/Test.txt').read_bytes(),b'actual payload')
            self.assertEqual((project/'Assets/Test.txt.meta').read_text(),'guid: '+G+'\n')
            self.assertEqual(len(report['members']),4)
            self.assertEqual(len(report['written']),2)

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)
            with self.assertRaises(ValueError): restore(self.make(p,'Assets/../../escape'),p/'project')
            self.assertFalse((p/'escape').exists())

    def test_existing_project_not_overwritten(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d); project=p/'project'; project.mkdir(); keep=project/'keep'; keep.write_text('original')
            with self.assertRaises(ValueError): restore(self.make(p),project)
            self.assertEqual(keep.read_text(),'original')

    def test_guid_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)
            with self.assertRaises(ValueError): restore(self.make(p,meta='b'*32),p/'project')

    def test_orphan_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)
            with self.assertRaises(ValueError): restore(self.make(p,extra={'b'*32+'/asset':b'orphan'}),p/'project')

if __name__ == '__main__': unittest.main()
