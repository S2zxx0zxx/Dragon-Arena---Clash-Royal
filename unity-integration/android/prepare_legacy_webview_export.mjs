import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceHashes = {
  'legacy_signature.mjs': '97d5ff7eaac12f1fa59f2cfc9ee5a179805da45449023c3be7eeff50279c41dd',
  'export_v3.mjs': 'bdad5075a982176258902eb51939a44e364b8fd074263cfb13136bd8a305de70',
};

function pinnedModule(directory, name) {
  const source = readFileSync(join(directory, name));
  if (createHash('sha256').update(source).digest('hex') !== sourceHashes[name]) {
    throw new Error(`Unexpected P10 migration helper: ${name}`);
  }
  return source.toString('utf8')
    .replace(/^import .* from '\.\/legacy_signature\.mjs';\r?\n/m, '')
    .replace(/^export /gm, '');
}

export function prepareSnippet(directory) {
  const signature = pinnedModule(directory, 'legacy_signature.mjs');
  const exporter = pinnedModule(directory, 'export_v3.mjs');
  return `(async () => {
    if (location.href !== 'https://appassets.androidplatform.net/assets/index.html') {
      throw new Error('Open the original Dragon Arena v3 WebView before exporting.');
    }
    if (typeof copy !== 'function') {
      throw new Error('Run this in the Chrome DevTools Console.');
    }
    ${signature}
    ${exporter}
    const backup = await readLegacyOnOriginalOrigin();
    if (new TextEncoder().encode(backup).length > 8 * 1024 * 1024) {
      throw new Error('Backup exceeds the native import size limit.');
    }
    copy(backup);
    return 'Verified Dragon Arena v3 backup copied to your clipboard.';
  })();\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , directory, output, ...rest] = process.argv;
  if (!directory || !output || rest.length) {
    process.exitCode = 2;
    console.error('Usage: node prepare_legacy_webview_export.mjs <private P10 migration directory> <new snippet.js>');
  } else {
    writeFileSync(output, prepareSnippet(directory), { flag: 'wx', mode: 0o600 });
  }
}
