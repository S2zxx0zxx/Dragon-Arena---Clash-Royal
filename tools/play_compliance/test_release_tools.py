import tempfile
import unittest
from pathlib import Path
import json
import hashlib
from audit_release import inventory, manifest_report
from build_policy_site import build, validate

class ReleaseToolsTest(unittest.TestCase):
    def config(self):
        return {"approved":True,"developer":"Fixture Developer","support_email":"help@fixture-domain.dev",
            "base_url":"https://fixture-domain.dev/legal","effective_date":"2026-11-28",
            "approval_evidence":"fixture-approval",
            "pages":{k:"A synthetic test body for layout checks only. Contact support for the synthetic test procedure. <script>alert(1)</script>"
                     for k in ("privacy","terms","delete-data","support")}}
    def test_site_fails_closed(self):
        c=self.config()
        c["approved"]=False
        with self.assertRaises(ValueError): validate(c)
        c=self.config()
        c["pages"]["privacy"]="TBD"
        with self.assertRaises(ValueError): validate(c)
    def test_site_output_and_escaping(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/"site"
            urls=build(self.config(),out)
            self.assertEqual(4,len(urls))
            page=(out/"privacy/index.html").read_text()
            self.assertIn("&lt;script&gt;",page)
            self.assertNotIn("<script>",page)
            self.assertIn('href="mailto:help@fixture-domain.dev"',page)
            self.assertIn('href="https://fixture-domain.dev/legal/privacy/"',page)
            with self.assertRaises(FileExistsError): build(self.config(),out)
    def test_inventory_exact_coverage(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            (root/"Assets").mkdir()
            (root/"Packages").mkdir()
            p=root/"Assets/a.txt"
            p.write_bytes(b"fixture")
            self.assertEqual(0,inventory(root,None)["covered"])
            a=root/"approvals.json"
            a.write_text(json.dumps([{"path":"Assets/a.txt","sha256":hashlib.sha256(b"fixture").hexdigest(),
                "decision":"approved","origin":"fixture","license":"fixture","proof_ref":"fixture","reviewer":"fixture"}]))
            self.assertEqual(1,inventory(root,a)["covered"])
            p.write_bytes(b"changed")
            self.assertEqual(0,inventory(root,a)["covered"])
    def test_manifest_permission_review(self):
        xml='<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="io.test"><uses-sdk android:targetSdkVersion="36"/><uses-permission android:name="android.permission.CAMERA"/><application android:debuggable="false"/></manifest>'
        r=manifest_report(xml)
        self.assertEqual("36",r["targetSdk"])
        self.assertEqual(["android.permission.CAMERA"],r["review_permissions"])
        self.assertEqual("false",r["debuggable"])

if __name__=="__main__":
    unittest.main()
