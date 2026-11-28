import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import verify_r4_baseline as v


class BaselineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.project, self.repro, self.apk = root / "project", root / "repro", root / "game.apk"
        for project in (self.project, self.repro):
            (project / "Assets").mkdir(parents=True)
            (project / "ProjectSettings").mkdir()
            (project / "ProjectSettings/ProjectVersion.txt").write_text("m_EditorVersion: 6000.6.10f1\n")
            (project / "Assets/Bot.cs").write_bytes(b"known bot")
            (project / "Assets/SkinItem.prefab").write_bytes(b"known skin")
        self.apk.write_bytes(b"fixture APK")
        for key, value in {
            "ANCHORS": {"Assets/Bot.cs": v.digest(self.project / "Assets/Bot.cs")},
            "PREFAB_SHA": v.digest(self.project / "Assets/SkinItem.prefab"),
            "ASSET_COUNT": 2, "APK_SIZE": self.apk.stat().st_size,
            "APK_SHA": v.digest(self.apk),
        }.items():
            p = patch.object(v, key, value)
            p.start()
            self.addCleanup(p.stop)

    def verify(self):
        return v.verify(self.project, self.repro, self.apk)

    def test_equal(self):
        self.assertEqual(self.verify()["status"], "R4_HASH_CHECKS_PASS")

    def test_mismatch(self):
        (self.repro / "Assets/Bot.cs").write_bytes(b"wrong")
        r = self.verify()
        self.assertEqual(r["status"], "BLOCKED_BASELINE_MISMATCH")
        self.assertEqual(r["differing_paths"], ["Assets/Bot.cs"])

    def test_matching_but_wrong_anchor(self):
        for p in (self.project, self.repro):
            (p / "Assets/Bot.cs").write_bytes(b"wrong")
        self.assertFalse(self.verify()["checks"]["critical_anchors"])

    def test_missing_extra(self):
        (self.repro / "Assets/Bot.cs").unlink()
        (self.repro / "Assets/Other.cs").write_bytes(b"wrong")
        r = self.verify()
        self.assertTrue(r["checks"]["asset_count"])
        self.assertFalse(r["checks"]["asset_tree_equal"])

    def test_bad_apk_same_size(self):
        self.apk.write_bytes(b"x" * self.apk.stat().st_size)
        self.assertFalse(self.verify()["checks"]["apk_sha256"])

    def test_wrong_version(self):
        (self.repro / "ProjectSettings/ProjectVersion.txt").write_text("m_EditorVersion: 2021.3.8f1\n")
        self.assertFalse(self.verify()["checks"]["reproduction_version"])

    def test_same_root_rejected(self):
        with self.assertRaises(ValueError):
            v.verify(self.project, self.project, self.apk)


if __name__ == "__main__":
    unittest.main()
