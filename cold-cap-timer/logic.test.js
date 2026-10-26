import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, capOnHead, capStates, inferCap, summarize, todo, plan, parseEntries } from './logic.js';

const MIN = 60000;
const NOW = new Date('2026-01-15T10:30:00').getTime();
const at = (min) => NOW + min * MIN; // minutes relative to NOW
const ev = (action, cap, min) => ({ action, cap, ts: at(min) });
const S = { interval: 20, numCaps: 4, pre: 0, post: 0, warn: 60, lead: 0, sound: true };
const ctx = (events = []) => ({ events, numCaps: 4, selected: 1 });

test('fmt formats mm:ss and h:mm:ss', () => {
  assert.equal(fmt(65000), '1:05');
  assert.equal(fmt(3725000), '1:02:05');
  assert.equal(fmt(-5000), '-0:05');
});

test('capOnHead tracks open poner', () => {
  assert.equal(capOnHead([]), null);
  assert.deepEqual(capOnHead([ev('poner', 1, 0)]), { cap: 1, since: at(0) });
  assert.equal(capOnHead([ev('poner', 1, 0), ev('quitar', 1, 20)]), null);
});

test('summarize computes durations per use and ignores fin', () => {
  const uses = summarize([
    ev('sacar', 2, 0), ev('poner', 2, 1), ev('quitar', 2, 21), ev('meter', 2, 22), ev('fin', 0, 30),
  ]);
  assert.equal(uses.length, 1);
  assert.equal(uses[0].transit, MIN);
  assert.equal(uses[0].onHead, 20 * MIN);
  assert.equal(uses[0].backToCooler, MIN);
  assert.equal(uses[0].outOfCooler, 22 * MIN);
});

test('summarize starts a new use after meter + sacar', () => {
  const uses = summarize([ev('sacar', 1, 0), ev('poner', 1, 1), ev('quitar', 1, 21), ev('meter', 1, 22), ev('sacar', 1, 60)]);
  assert.equal(uses.length, 2);
});

test('inferCap follows the swap flow', () => {
  assert.equal(inferCap([], 'poner', 4), 1);
  assert.equal(inferCap([ev('poner', 1, 0)], 'sacar', 4), 1); // no sacar logged yet: starts at 1
  const e = [ev('sacar', 1, 0), ev('poner', 1, 1)];
  assert.equal(inferCap(e, 'sacar', 4), 2);
  assert.equal(inferCap(e, 'quitar', 4), 1);
  const e2 = [...e, ev('sacar', 2, 19), ev('quitar', 1, 21)];
  assert.equal(inferCap(e2, 'poner', 4), 2);
  assert.equal(inferCap(e2, 'meter', 4), 1);
  assert.equal(inferCap([ev('sacar', 4, 0)], 'sacar', 4), 1); // wraps
});

test('parse: "hace 3 mins le puse un cap"', () => {
  const { entries, problems } = parseEntries('hace 3 mins le puse un cap', NOW, ctx());
  assert.deepEqual(problems, []);
  assert.deepEqual(entries, [{ action: 'poner', cap: 1, ts: NOW - 3 * MIN }]);
});

test('parse: accents, word numbers, cap number', () => {
  const r = parseEntries('Saqué el cap 3 del cooler hace un minuto', NOW, ctx());
  assert.deepEqual(r.entries, [{ action: 'sacar', cap: 3, ts: NOW - MIN }]);
  const r2 = parseEntries('hace dos minutos quité el cap', NOW, ctx([ev('poner', 2, -22)]));
  assert.deepEqual(r2.entries, [{ action: 'quitar', cap: 2, ts: NOW - 2 * MIN }]);
});

test('parse: sacar vs quitar', () => {
  assert.equal(parseEntries('saqué el cap de la cabeza', NOW, ctx([ev('poner', 1, -5)])).entries[0].action, 'quitar');
  assert.equal(parseEntries('saqué el cap del cooler', NOW, ctx()).entries[0].action, 'sacar');
});

test('parse: several actions, sorted by time, caps inferred in order', () => {
  const events = [ev('sacar', 1, -22), ev('poner', 1, -21)];
  const { entries } = parseEntries('hace 1 min lo metí al cooler, hace 3 min quité el cap y puse el 2', NOW, ctx(events));
  assert.deepEqual(entries.map((e) => [e.action, e.cap]), [['quitar', 1], ['poner', 2], ['meter', 1]]);
  assert.ok(entries[0].ts <= entries[1].ts && entries[1].ts <= entries[2].ts);
});

test('parse: time in a separate clause and absolute times', () => {
  assert.equal(parseEntries('puse un cap, hace 4 minutos', NOW, ctx()).entries[0].ts, NOW - 4 * MIN);
  assert.equal(parseEntries('a las 10:15 puse el cap 2', NOW, ctx()).entries[0].ts, at(-15));
  assert.equal(parseEntries('puse el cap a las 11:00', NOW, ctx()).entries.length, 0); // future
});

test('parse: fin de infusión, unknown text, bad cap', () => {
  assert.equal(parseEntries('terminó la quimio hace 5 minutos', NOW, ctx()).entries[0].action, 'fin');
  assert.ok(parseEntries('hola', NOW, ctx()).problems.length);
  assert.ok(parseEntries('puse el cap 9', NOW, ctx()).problems.length);
});

test('todo: nothing logged, on head, due, after quitar', () => {
  assert.equal(todo([], S, NOW)[0].action, 'sacar');
  const head = [ev('sacar', 1, -5), ev('poner', 1, -4)];
  const wait = todo(head, S, NOW);
  assert.equal(wait[0].action, null);
  assert.match(wait[0].text, /Cap #1 en la cabeza/);
  const due = todo([ev('sacar', 1, -25), ev('poner', 1, -24)], S, NOW);
  assert.deepEqual(due.map((i) => [i.action, i.cap]), [['sacar', 2], ['quitar', 1], ['poner', 2]]);
  const mid = todo([ev('sacar', 1, -25), ev('poner', 1, -24), ev('sacar', 2, -1), ev('quitar', 1, 0)], S, NOW);
  assert.deepEqual(mid.map((i) => [i.action, i.cap]), [['poner', 2], ['meter', 1]]);
});

test('todo: lead reminder to take the next cap out', () => {
  const events = [ev('sacar', 1, -19), ev('poner', 1, -18)]; // swap in 2 min
  assert.equal(todo(events, { ...S, lead: 0 }, NOW)[0].action, null);
  assert.equal(todo(events, { ...S, lead: 3 }, NOW)[0].action, 'sacar');
});

test('plan: swaps projected from the cap on head, clipped by post-cooling', () => {
  const events = [ev('poner', 1, -5)];
  const p = plan(events, S, NOW);
  assert.deepEqual(p.swaps.map((x) => [x.from, x.to, x.at]), [[1, 2, at(15)], [2, 3, at(35)], [3, 4, at(55)], [4, 1, at(75)]]);
  const withFin = plan([...events, ev('fin', 0, 0)], { ...S, post: 30 }, NOW);
  assert.equal(withFin.postDoneAt, at(30));
  assert.deepEqual(withFin.swaps.map((x) => x.at), [at(15)]);
  assert.equal(plan(events, { ...S, pre: 50 }, NOW).preDoneAt, at(45));
});

test('capStates', () => {
  assert.deepEqual([...capStates([ev('sacar', 1, 0), ev('poner', 1, 1), ev('sacar', 2, 2)])], [[1, 'poner'], [2, 'sacar']]);
});
