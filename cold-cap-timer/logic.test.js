import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, capOnHead, capStates, inferCap, summarize, todo, plan, parseEntries, liveTimeline, readyCaps, storeCaps, wearMin, placements, milestones, changeAt } from './logic.js';

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
  assert.deepEqual(capOnHead([ev('poner', 1, 0)]), { cap: 1, since: at(0), index: 1 });
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
  assert.equal(inferCap([ev('poner', 1, 0)], 'sacar', 4), 2); // cap 1 on head: next out is 2
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
  assert.match(wait[0].text, /Cambio a las/);
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
  assert.equal(p.swaps[0].takeOutAt, null);
  const withLead = plan(events, { ...S, lead: 5 }, NOW);
  assert.deepEqual(withLead.swaps.slice(0, 2).map((x) => x.takeOutAt), [at(10), at(30)]);
  const withFin = plan([...events, ev('fin', 0, 0)], { ...S, post: 30 }, NOW);
  assert.equal(withFin.postDoneAt, at(30));
  assert.deepEqual(withFin.swaps.map((x) => x.at), [at(15)]);
  assert.equal(plan(events, { ...S, pre: 50 }, NOW).preDoneAt, at(45));
});

test('parse: "saqué el cap" with a cap on the head takes the next one', () => {
  const r = parseEntries('hace 1 min saqué el cap', NOW, ctx([ev('poner', 1, -16)]));
  assert.deepEqual(r.entries, [{ action: 'sacar', cap: 2, ts: NOW - MIN }]);
});

test('capStates', () => {
  assert.deepEqual([...capStates([ev('sacar', 1, 0), ev('poner', 1, 1), ev('sacar', 2, 2)])], [[1, 'poner'], [2, 'sacar']]);
});

test('liveTimeline: lead window, then swap due', () => {
  const ph = liveTimeline([ev('poner', 1, -5)], { ...S, lead: 5 }, NOW);
  assert.deepEqual(ph.map((p) => p.at), [at(-5), at(10), at(15)]);
  assert.deepEqual(ph.map((p) => p.countdownTo ?? null), [at(10), at(15), null]);
  assert.equal(ph[2].countUpFrom, at(15));
  assert.match(ph[1].title, /Saca el cap #2/);
  assert.match(ph[2].text, /Quita el #1 y pon el #2/);
  assert.match(ph[0].big, /Cambio: .*\(#1 → #2\)/);
});

test('liveTimeline: no lead phase when lead is 0 or next cap already out', () => {
  assert.equal(liveTimeline([ev('poner', 1, -5)], { ...S, lead: 0 }, NOW).length, 2);
  const out = liveTimeline([ev('poner', 1, -5), ev('sacar', 2, -1)], { ...S, lead: 5 }, NOW);
  assert.equal(out.length, 2);
  assert.match(out[0].text, /El #2 ya está fuera/);
});

test('liveTimeline: no cap on head counts up from the last step; nothing to show otherwise', () => {
  const ph = liveTimeline([ev('sacar', 1, -30), ev('poner', 1, -29), ev('quitar', 1, -2)], { ...S, lead: 5 }, NOW);
  assert.equal(ph.length, 1);
  assert.equal(ph[0].countUpFrom, at(-2));
  assert.deepEqual(liveTimeline([], S, NOW), []);
  assert.deepEqual(liveTimeline([ev('poner', 1, -5), ev('quitar', 1, -1), ev('fin', 0, 0)], S, NOW), []);
});

test('a forgotten "quitar" does not leave a ghost cap on the head', () => {
  const events = [ev('sacar', 1, 0), ev('poner', 1, 1), ev('sacar', 2, 16), ev('poner', 2, 21), ev('meter', 1, 22)];
  assert.deepEqual(capOnHead(events), { cap: 2, since: at(21), index: 2 });
  const next = [...events, ev('sacar', 3, 36), ev('quitar', inferCap([...events, ev('sacar', 3, 36)], 'quitar', 4), 41)];
  assert.equal(capOnHead(next), null); // before the fix cap 1 came back as the head
  assert.equal(capOnHead([ev('poner', 1, 0), ev('quitar', 3, 5)])?.cap, 1); // removing a cap that is not on the head does nothing
});

test('stale open steps are ignored', () => {
  // cap 2 was taken out, but cap 3 went on the head instead
  assert.deepEqual(readyCaps([ev('sacar', 2, 0), ev('poner', 3, 2)]), []);
  assert.deepEqual(readyCaps([ev('sacar', 2, 0), ev('poner', 1, -5)]), [2]);
  // only the most recent removed cap waits to go back to the cooler
  assert.deepEqual(storeCaps([ev('quitar', 1, 0), ev('quitar', 2, 20)]), [2]);
  assert.deepEqual(storeCaps([ev('quitar', 1, 0), ev('meter', 1, 1)]), []);
});

test('instructions after a sloppy swap match reality', () => {
  const events = [ev('sacar', 1, -50), ev('poner', 1, -49), ev('sacar', 2, -34), ev('poner', 2, -29), ev('sacar', 3, -14), ev('quitar', 2, -9)];
  const items = todo(events, S, NOW);
  assert.equal(capOnHead(events), null);
  assert.equal(items[0].action, 'poner');
  assert.equal(items[0].cap, 3);
});

// ---- Penguin 3-cap dry-ice protocol (personal schedule): pre-cooling 50 min = 20 + 20 + 10, infusion starts when
// cap 3 has been worn 10 min (25 min in total), then a cap change every 25 min, and at least 6 h after the infusion.
const P = { schedule: [20, 20, 25], numCaps: 3, pre: 50, post: 360, warn: 60, lead: 5 };

test('protocol: wear minutes per placement, last value repeats', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((i) => wearMin(i, P)), [20, 20, 25, 25, 25, 25, 25]);
  assert.equal(wearMin(3, { interval: 20 }), 20); // single interval still works
});

test('protocol: the swap time follows the placement number', () => {
  const events = [ev('poner', 1, 0), ev('quitar', 1, 20), ev('poner', 2, 20), ev('quitar', 2, 40), ev('poner', 3, 40)];
  const head = capOnHead(events);
  assert.equal(head.index, 3);
  assert.equal(changeAt(head, P, null).at, at(65)); // cap 3 is worn 25 min
  assert.equal(changeAt(capOnHead(events.slice(0, 1)), P, null).at, at(20)); // cap 1 is worn 20 min
});

test('protocol: a double tap on Poner does not count as a new placement', () => {
  const events = [ev('poner', 1, 0), ev('poner', 1, 1)];
  assert.equal(placements(events).length, 1);
  assert.equal(capOnHead(events).since, at(0));
});

test('protocol: infusion starts 10 min into cap 3 (50 min of pre-cooling)', () => {
  // only cap 1 placed: projected from it
  assert.equal(milestones([ev('poner', 1, 0)], P).infusionAt, at(50));
  // cap 3 placed late (at minute 45): the real placement wins, infusion 10 min after it
  const late = [ev('poner', 1, 0), ev('poner', 2, 20), ev('poner', 3, 45)];
  assert.equal(milestones(late, P).infusionAt, at(55));
  // projection from the latest placement when cap 2 is late (placed at 25): 25 + 20 + 10
  assert.equal(milestones([ev('poner', 1, 0), ev('poner', 2, 25)], P).infusionAt, at(55));
  assert.equal(milestones([ev('poner', 1, 0)], { ...P, pre: 0 }).infusionAt, null);
});

test('protocol: post-cooling ends 6 h after the infusion finished and the last cap just comes off', () => {
  const events = [ev('poner', 1, 0), ev('fin', 0, 100), ev('poner', 2, 340)];
  const m = milestones(events, P);
  assert.equal(m.postDoneAt, at(100 + 360));
  assert.equal(m.infusionAt, null);
  const head = capOnHead([ev('poner', 1, 440)]);
  const last = changeAt(head, P, m.postDoneAt); // swap would be at 460 >= end at 460
  assert.deepEqual(last, { at: at(460), final: true });
  const mid = changeAt(capOnHead([ev('poner', 1, 300)]), P, m.postDoneAt);
  assert.equal(mid.final, false);
});

test('protocol: instructions for the infusion start and the last cap', () => {
  const justPlaced = [ev('sacar', 1, -49), ev('poner', 1, -48)];
  assert.equal(todo(justPlaced, P, NOW).at(-1).text.startsWith('Empezar la infusión a las'), true);
  const atInfusion = [ev('poner', 1, -50), ev('poner', 2, -30), ev('poner', 3, -10)];
  const items = todo(atInfusion, P, NOW);
  assert.equal(items[0].text, 'Ya puede empezar la infusión');
  assert.equal(items[0].urgent, true);
  const finished = [ev('poner', 1, -30), ev('fin', 0, -400)];
  const done = todo(finished, P, NOW);
  assert.equal(done[0].text, 'Terminó el post-enfriamiento');
  assert.equal(done[0].action, 'quitar');
  const lastCap = [ev('poner', 1, -10), ev('fin', 0, -352)]; // post-cooling ends in 8 min, this cap would last 20 more
  assert.match(todo(lastCap, P, NOW)[0].text, /Último cap, hasta las/);
});

test('protocol: plan uses each cap duration and stops before the post-cooling end', () => {
  const events = [ev('poner', 1, 0)];
  const p = plan(events, P, at(5));
  assert.deepEqual(p.swaps.map((x) => x.at), [at(20), at(40), at(65), at(90)]);
  assert.deepEqual(p.swaps.map((x) => x.minutes), [20, 25, 25, 25]); // how long the next cap is worn
  assert.deepEqual(p.swaps.map((x) => [x.from, x.to]), [[1, 2], [2, 3], [3, 1], [1, 2]]);
  assert.equal(p.preDoneAt, at(50));
});

test('protocol: live notification for the last cap', () => {
  const events = [ev('poner', 1, -10), ev('fin', 0, -352)];
  const ph = liveTimeline(events, P, NOW);
  assert.equal(ph.length, 2);
  assert.match(ph[0].title, /último cap/);
  assert.equal(ph[1].title, 'Terminó el post-enfriamiento');
});
