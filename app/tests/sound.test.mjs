import test from 'node:test';import assert from 'node:assert/strict';import {makeAudio} from '../src/sound.mjs';
test('audio respects saved sound preference with no AudioContext',()=>{const a=makeAudio(()=>false);assert.equal(a.play('tap'),false);assert.equal(a.play('reward'),false);a.close();});
test('unsupported AudioContext is safely skipped in headless runtimes',()=>{const a=makeAudio(()=>true);if(typeof globalThis.AudioContext==='undefined'&&typeof globalThis.webkitAudioContext==='undefined')assert.equal(a.play('tap'),false);a.close();});
