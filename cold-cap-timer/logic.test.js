import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, capOnHead, summarize, nextAction } from './logic.js';

const ev = (action, cap, min) => ({ action, cap, ts: min * 60000 });

test('fmt formats mm:ss and h:mm:ss', () => {
  assert.equal(fmt(65000), '1:05');
  assert.equal(fmt(3725000), '1:02:05');
  assert.equal(fmt(-5000), '-0:05');
});

test('capOnHead tracks open poner', () => {
  assert.equal(capOnHead([]), null);
  assert.deepEqual(capOnHead([ev('poner', 1, 0)]), { cap: 1, since: 0 });
  assert.equal(capOnHead([ev('poner', 1, 0), ev('quitar', 1, 20)]), null);
});

test('summarize computes durations per use', () => {
  const [u] = summarize([
    ev('sacar', 2, 0),
    ev('poner', 2, 1),
    ev('quitar', 2, 21),
    ev('meter', 2, 22),
  ]);
  assert.equal(u.transit, 60000);
  assert.equal(u.onHead, 20 * 60000);
  assert.equal(u.backToCooler, 60000);
  assert.equal(u.outOfCooler, 22 * 60000);
});

test('summarize starts a new use after meter + sacar', () => {
  const uses = summarize([
    ev('sacar', 1, 0), ev('poner', 1, 1), ev('quitar', 1, 21), ev('meter', 1, 22),
    ev('sacar', 1, 60),
  ]);
  assert.equal(uses.length, 2);
});

test('nextAction cycles', () => {
  assert.equal(nextAction([]), 'sacar');
  assert.equal(nextAction([ev('sacar', 1, 0)]), 'poner');
  assert.equal(nextAction([ev('meter', 1, 0)]), 'sacar');
});
