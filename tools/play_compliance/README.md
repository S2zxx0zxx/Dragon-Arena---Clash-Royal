# Release evidence tools (POL-10/11/12)
Run from repository root. No private inputs, generated audit reports or approved private configuration should be committed.
 
- python -m unittest discover -s tools/play_compliance -p 'test_*.py' -v
- python tools/play_compliance/audit_release.py bundle --bundle <production.aab> --bundletool <verified.jar> --gradle-report <resolved-release-dependencies.txt> --package <confirmed-production-id> --output <private-report.json>
- python tools/play_compliance/audit_release.py inventory --project <private-Unity-root> --approvals <private-approvals.json> --output <private-inventory.json>
- Each asset approval row: path, sha256, origin, license, proof_ref, reviewer, decision=approved. All per-file hashes exact, no wildcard. No coverage means not cleared; manual legal review remains mandatory.
- Copy policy_site.config.example.json to a private location. Insert approved final text for privacy, terms, deletion and support; supply verified store developer name, working public contact, real HTTPS base URL, approved effective date and approval evidence. Set approved only after final review. python tools/play_compliance/build_policy_site.py --config <approved.json> --output <new-directory>
- Deploy output to authorized static HTTPS host only after approval. Confirm actual four URLs publicly accessible and in-game/Console links correct. No JavaScript, cookies, analytics or embedded third-party services in the generated site. No draft pages deployed.
- Bundle inspection is an inventory, not a complete security audit: does not verify signing, ELF/ZIP alignment, SDK behavior, app access, permissions necessity or declarations. Manually reconcile exact signed AAB and installed delivered APKs. Do not infer absence of SDK from keyword scan.
