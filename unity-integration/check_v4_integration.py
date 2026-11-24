#!/usr/bin/env python3
"""Public-only V4 integration audit; never substitutes for Unity/device evidence."""
import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath

HEX64 = re.compile(r'[0-9a-f]{64}\Z')
HEX40 = re.compile(r'[0-9a-f]{40}\Z')


def unique_pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key: ' + key)
        result[key] = value
    return result


def load(path):
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_pairs)


def blob_sha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def audit(root):
    root = Path(root)
    lock = load(root / 'P10_INTEGRATION_LOCK.json')
    names = [f'P{i:02}_OVERLAY_MANIFEST.json' for i in range(2, 10)]
    if set(lock['manifests']) != set(names):
        raise ValueError('Incomplete or unexpected overlay phase set')
    if not HEX40.fullmatch(lock['legacy_main_sha']) or not HEX64.fullmatch(lock['private_p09_sha256']):
        raise ValueError('Invalid baseline identity')
    last = {}
    count = 0
    for name in names:
        path = root / name
        if blob_sha(path.read_bytes()) != lock['manifests'][name]:
            raise ValueError('Manifest drift: ' + name)
        records = load(path)
        if not isinstance(records, dict) or not records:
            raise ValueError('Empty overlay: ' + name)
        for target, record in records.items():
            p = PurePosixPath(target)
            if p.is_absolute() or not p.parts or p.parts[0] not in ('Assets', 'ProjectSettings') or '..' in p.parts or '\\' in target or ':' in target or p.as_posix() != target:
                raise ValueError('Unsafe overlay target: ' + target)
            if set(record) != {'before', 'after'} or not HEX64.fullmatch(record['after']) or (record['before'] is not None and not HEX64.fullmatch(record['before'])):
                raise ValueError('Invalid hash record: ' + target)
            if target in last and last[target] != record['before']:
                raise ValueError('Broken overlay chain: ' + target)
            if record['before'] == record['after']:
                raise ValueError('No-op overlay: ' + target)
            last[target] = record['after']
            count += 1
    if count != lock['overlay_records'] or len(last) != lock['unique_targets']:
        raise ValueError('Unexpected overlay record totals')
    status = load(root / 'P09_QA_STATUS.json')
    matrix = status['acceptance_matrix']
    if matrix['total'] != matrix['pass'] + matrix['blocked'] + matrix['not_run'] or matrix != lock['p09_acceptance']:
        raise ValueError('P09 acceptance status drift')
    if status['private_archive_sha256'] != lock['private_p09_sha256']:
        raise ValueError('Private archive identity drift')
    return {'overlay_phases': len(names), 'records': count, 'unique_targets': len(last), 'p09': matrix, 'release_gate': 'BLOCKED', 'native_status': status['native_status']}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parent)
    p.add_argument('--require-release', action='store_true')
    a = p.parse_args()
    print(json.dumps(audit(a.root), indent=2))
    if a.require_release:
        raise SystemExit('BLOCKED: native build, actual device acceptance and private source delivery are not verified. Replace this hold only with reviewed, exact-source release evidence.')
