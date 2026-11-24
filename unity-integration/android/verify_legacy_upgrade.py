"""Check the APK identity needed for an in-place v3 save-export update."""

import argparse
import json
import re
from pathlib import Path

from verify_android_artifact import run, sha


def identity(path, aapt, apksigner):
    badging = run(aapt, 'dump', 'badging', path)
    package = re.search(r"^package: name='([^']+)' versionCode='(\d+)'", badging, re.MULTILINE)
    if package is None:
        raise ValueError(f'APK package or version code missing in {path.name}')

    signature = run(apksigner, 'verify', '--print-certs', path)
    certs = re.findall(r'^Signer #\d+ certificate SHA-256 digest:\s*([\da-f]{64})$', signature, re.IGNORECASE | re.MULTILINE)
    if len(certs) != 1:
        raise ValueError(f'Exactly one verified signer required for {path.name}')

    return {
        'package': package[1],
        'version_code': int(package[2]),
        'certificate_sha256': certs[0].lower(),
        'artifact_sha256': sha(path),
    }


def compare_legacy_upgrades(installed, exporter):
    package = 'io.dragonarena.preview'
    if installed['package'] != package or exporter['package'] != package:
        return 'PACKAGE_MISMATCH'
    if exporter['certificate_sha256'] != installed['certificate_sha256']:
        return 'SIGNER_MISMATCH'
    if exporter['version_code'] <= installed['version_code']:
        return 'VERSION_NOT_INCREASED'
    return 'IDENTITY_MATCH'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('installed_apk', type=Path, help='APK matching the app currently installed on the device')
    parser.add_argument('exporter_apk', type=Path)
    parser.add_argument('--aapt', required=True)
    parser.add_argument('--apksigner', required=True)
    args = parser.parse_args()

    installed = identity(args.installed_apk, args.aapt, args.apksigner)
    exporter = identity(args.exporter_apk, args.aapt, args.apksigner)
    status = compare_legacy_upgrades(installed, exporter)
    print(json.dumps({
        'installed': installed,
        'candidate': exporter,
        'status': status,
        'device_install_and_save_export': 'NOT_RUN',
    }, indent=2))
    return 0 if status == 'IDENTITY_MATCH' else 1


if __name__ == '__main__':
    raise SystemExit(main())
