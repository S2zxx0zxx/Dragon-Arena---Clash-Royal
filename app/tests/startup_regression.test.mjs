import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('startup renderStats iterates an array of matching elements, never a single Element',()=>{
 const code=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(code,/syncEnergy\(saved\);\$\$\('\[data-coins\]'\)\.forEach/);
 assert.doesNotMatch(code,/syncEnergy\(saved\);\$\('\[data-coins\]'\)\.forEach/);
});
