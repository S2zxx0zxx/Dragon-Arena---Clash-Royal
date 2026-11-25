import unittest,struct,tempfile,zipfile
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch
from verify_android_artifact import check_elf, inspect_zip, main, sha, verify_migration_launcher

def elf(align=16384,offset=0,vaddr=0):
 b=bytearray(256);b[:6]=b'\x7fELF\x02\x01';struct.pack_into('<Q',b,32,64);struct.pack_into('<HH',b,54,56,1);struct.pack_into('<IIQQQQQQ',b,64,1,5,offset,vaddr,0,100,100,align);return bytes(b)
class Check(unittest.TestCase):
 def test_16k(self):self.assertEqual(check_elf(elf()),1)
 def test_4k(self):
  with self.assertRaises(ValueError):check_elf(elf(4096))
 def test_offset(self):
  with self.assertRaises(ValueError):check_elf(elf(vaddr=1))
 def test_bad_header(self):
  with self.assertRaises(ValueError):check_elf(b'x'*128)
 def test_abis(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'test.apk'
   with zipfile.ZipFile(p,'w') as z:
    for abi in ('arm64-v8a','armeabi-v7a'):
     for lib in ('libunity.so','libil2cpp.so'):z.writestr(f'lib/{abi}/{lib}',elf())
   self.assertEqual(inspect_zip(p,True)['libraries'],4)
 def test_missing_abi(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'test.apk'
   with zipfile.ZipFile(p,'w') as z:z.writestr('lib/arm64-v8a/libunity.so',elf())
   with self.assertRaises(ValueError):inspect_zip(p)

class LauncherTests(unittest.TestCase):
    def test_requires_only_migration_launcher(self):
        migration = "launchable-activity: name='io.dragonarena.platform.MigrationActivity'\n"
        unity = "launchable-activity: name='com.unity3d.player.UnityPlayerActivity'\n"
        verify_migration_launcher(migration)
        for badging in ('', unity, migration + unity):
            with self.subTest(badging=badging), self.assertRaisesRegex(ValueError, 'sole launcher'):
                verify_migration_launcher(badging)


class ReleaseOutputTests(unittest.TestCase):
    def setUp(self):
        workspace = tempfile.TemporaryDirectory()
        self.addCleanup(workspace.cleanup)
        root = Path(workspace.name)
        self.bundle = root / 'release.aab'
        self.bundle.write_bytes(b'bundle fixture')
        self.output = root / 'release.apk'
        self.report = root / 'verification.json'
        self.args = [
            'verify_android_artifact', str(self.bundle), '--track', 'release',
            '--package', 'io.dragonarena.game', '--code', '16',
            '--aapt', 'aapt', '--apksigner', 'apksigner', '--zipalign', 'zipalign',
            '--bundletool', 'bundletool.jar', '--cert', 'a' * 64,
            '--report', str(self.report), '--apk-output', str(self.output),
        ]
        self.enterContext(patch.object(sys, 'argv', self.args))
        self.enterContext(patch.dict(os.environ, {
            'DRAGON_ARENA_KEYSTORE': 'test.keystore',
            'DRAGON_ARENA_KEY_ALIAS': 'test',
            'DRAGON_ARENA_KEYSTORE_PASS': 'test',
            'DRAGON_ARENA_KEY_PASS': 'test',
        }))
        self.enterContext(patch('verify_android_artifact.inspect_zip', return_value={}))
        self.enterContext(patch('verify_android_artifact.run', side_effect=self.run_tool))
        self.enterContext(patch('builtins.print'))

    def run_tool(self, *args):
        if 'build-apks' in args:
            output = next(arg.split('=', 1)[1] for arg in args if str(arg).startswith('--output='))
            with zipfile.ZipFile(output, 'w') as archive:
                archive.writestr('universal.apk', b'apk fixture')
            return ''
        if args[0] == 'jarsigner':
            return 'jar verified.'
        if args[0] == 'keytool':
            return 'SHA256: ' + 'a' * 64
        return 'PAGE_ALIGNMENT_16K'

    def test_retains_exact_verified_apk(self):
        with patch('verify_android_artifact.verify_apk', side_effect=lambda path, *args: {'sha256': sha(path)}):
            main()
        report = json.loads(self.report.read_text())
        self.assertEqual(report['apk']['sha256'], sha(self.output))
        self.assertEqual(report['aab_sha256'], sha(self.bundle))
        self.assertEqual(report['apk_output'], self.output.name)
        self.assertEqual(report['device_qa'], 'NOT_RUN')

    def test_rejected_apk_is_not_retained(self):
        with patch('verify_android_artifact.verify_apk', side_effect=ValueError('bad signature')):
            with self.assertRaisesRegex(ValueError, 'bad signature'):
                main()
        self.assertFalse(self.output.exists())
        self.assertFalse(self.report.exists())

    def test_bundle_change_is_rejected(self):
        def verify_and_mutate(path, *args):
            self.bundle.write_bytes(b'changed bundle')
            return {'sha256': sha(path)}

        with patch('verify_android_artifact.verify_apk', side_effect=verify_and_mutate):
            with self.assertRaisesRegex(ValueError, 'AAB changed'):
                main()
        self.assertFalse(self.output.exists())
        self.assertFalse(self.report.exists())

    def test_preserves_existing_apk(self):
        self.output.write_bytes(b'previous APK')
        with self.assertRaisesRegex(SystemExit, 'fresh .apk'):
            main()
        self.assertEqual(self.output.read_bytes(), b'previous APK')

if __name__=='__main__':unittest.main()
