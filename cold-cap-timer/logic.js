// Pure functions: no DOM, so they can be tested with `node --test`.

export const ACTIONS = {
  sacar: 'Sacar del cooler',
  poner: 'Poner en la cabeza',
  quitar: 'Quitar de la cabeza',
  meter: 'Meter al cooler',
  fin: 'Terminó la infusión',
};

export function fmt(ms) {
  const neg = ms < 0;
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  const body = h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  return neg ? `-${body}` : body;
}

export const clock = (ts) => new Date(ts).toLocaleTimeString('es-PA', { hour: 'numeric', minute: '2-digit' });

// ---------------------------------------------------------------- state derived from the log

const capEvents = (events) => events.filter((e) => e.action !== 'fin');

// Cap currently on the head. A head holds one cap, so putting a cap on replaces whatever was there
// (a forgotten "quitar" must not leave a ghost that comes back later). Removing a cap that is not on the head is ignored.
export function capOnHead(events) {
  let head = null;
  for (const e of events) {
    if (e.action === 'poner') head = { cap: e.cap, since: e.ts };
    else if (e.action === 'quitar' && head?.cap === e.cap) head = null;
  }
  return head;
}

// Last action per cap: 'sacar' (out of the cooler, ready), 'poner' (on head), 'quitar' (off head, must go back), 'meter' (in cooler).
export function capStates(events) {
  const st = new Map();
  for (const e of capEvents(events)) st.set(e.cap, e.action);
  return st;
}

// Steps left open in the log (a cap taken out but never placed, a cap removed but never put back) go stale as the
// session moves on. Only the most recent one counts, so a forgotten tap cannot confuse the instructions forever.
export function readyCaps(events) {
  const evs = capEvents(events);
  const st = capStates(events);
  const lastSacar = [...evs].reverse().find((e) => e.action === 'sacar');
  if (!lastSacar || st.get(lastSacar.cap) !== 'sacar') return [];
  const lastPoner = [...evs].reverse().find((e) => e.action === 'poner');
  return lastPoner && lastPoner.ts > lastSacar.ts ? [] : [lastSacar.cap]; // another cap went on after this one came out
}
export function storeCaps(events) {
  const evs = capEvents(events);
  const lastQuitar = [...evs].reverse().find((e) => e.action === 'quitar');
  return lastQuitar && capStates(events).get(lastQuitar.cap) === 'quitar' ? [lastQuitar.cap] : [];
}

// Cap number to use when the user didn't say one.
export function inferCap(events, action, numCaps, selected = 1) {
  const evs = capEvents(events);
  const rotation = () => {
    const head = capOnHead(events);
    if (head) return (head.cap % numCaps) + 1; // the cap after the one on the head
    const last = [...evs].reverse().find((e) => e.action === 'sacar');
    return last ? (last.cap % numCaps) + 1 : selected;
  };
  if (action === 'sacar') return rotation();
  if (action === 'poner') return readyCaps(events)[0] ?? rotation();
  if (action === 'quitar') return capOnHead(events)?.cap ?? [...evs].reverse().find((e) => e.action === 'poner')?.cap ?? selected;
  if (action === 'meter') return storeCaps(events)[0] ?? [...evs].reverse().find((e) => e.action === 'quitar')?.cap ?? selected;
  return selected;
}

// Per-use durations. A "use" of a cap runs sacar -> poner -> quitar -> meter.
export function summarize(events) {
  const uses = [];
  const current = new Map();
  for (const e of capEvents(events)) {
    if (e.action === 'sacar') {
      const u = { cap: e.cap, sacar: e.ts };
      current.set(e.cap, u);
      uses.push(u);
      continue;
    }
    let u = current.get(e.cap);
    if (!u) {
      // Action logged without a "sacar" first: still keep it.
      u = { cap: e.cap };
      current.set(e.cap, u);
      uses.push(u);
    }
    u[e.action] = e.ts;
  }
  return uses.map((u) => ({
    ...u,
    transit: u.sacar != null && u.poner != null ? u.poner - u.sacar : null, // out of cooler before reaching the head
    onHead: u.poner != null && u.quitar != null ? u.quitar - u.poner : null,
    backToCooler: u.quitar != null && u.meter != null ? u.meter - u.quitar : null,
    outOfCooler: u.sacar != null && u.meter != null ? u.meter - u.sacar : null,
  }));
}

// ---------------------------------------------------------------- what to do now

// Cap that goes on the head at the next swap.
export function nextCap(events, numCaps) {
  const head = capOnHead(events);
  const ready = readyCaps(events).filter((c) => c !== head?.cap);
  return ready[0] ?? (head ? (head.cap % numCaps) + 1 : inferCap(events, 'sacar', numCaps));
}

// Ordered list of things to do right now. items[0] is the most urgent.
// Each item: { action, cap, text, sub?, urgent? }. `action` (when set) is the button to highlight.
export function todo(events, s, now) {
  const items = [];
  const head = capOnHead(events);
  const ready = readyCaps(events).filter((c) => c !== head?.cap);
  const store = storeCaps(events);
  const nextCap = ready[0] ?? (head ? (head.cap % s.numCaps) + 1 : inferCap(events, 'sacar', s.numCaps));

  if (!capEvents(events).length) {
    items.push({ action: 'sacar', cap: nextCap, text: `Saca el cap #${nextCap} del cooler`, sub: 'O cuéntame qué ya hiciste' });
    return items;
  }

  if (head) {
    const swapAt = head.since + s.interval * 60000;
    const out = ready.includes(nextCap);
    if (now >= swapAt) {
      if (!out) items.push({ action: 'sacar', cap: nextCap, urgent: true, text: `Saca el cap #${nextCap} del cooler` });
      items.push({ action: 'quitar', cap: head.cap, urgent: true, text: `Quita el cap #${head.cap}` });
      items.push({ action: 'poner', cap: nextCap, urgent: true, text: `Pon el cap #${nextCap}` });
    } else if (s.lead > 0 && now >= swapAt - s.lead * 60000 && !out) {
      items.push({ action: 'sacar', cap: nextCap, urgent: true, text: `Saca el cap #${nextCap} del cooler`, sub: `Cambio a las ${clock(swapAt)}` });
    } else if (s.lead > 0 && !out) {
      items.push({ action: null, cap: nextCap, text: `Sacar el cap #${nextCap} a las ${clock(swapAt - s.lead * 60000)}`, sub: `Cambio a las ${clock(swapAt)}` });
    } else {
      items.push({ action: null, cap: nextCap, text: `Cambio a las ${clock(swapAt)}`, sub: out ? `El cap #${nextCap} ya está fuera del cooler` : `Siguiente: cap #${nextCap}` });
    }
  } else if (ready.length) {
    items.push({ action: 'poner', cap: ready[0], urgent: true, text: `Pon el cap #${ready[0]} en la cabeza` });
  }

  if (store.length) items.push({ action: 'meter', cap: store[0], urgent: !head && !ready.length, text: `Mete el cap #${store[0]} al cooler` });

  if (!head && !ready.length && !store.length) {
    items.push({ action: 'sacar', cap: nextCap, text: `Saca el cap #${nextCap} del cooler`, sub: 'No hay cap en la cabeza' });
  }
  return items;
}

// Rough projection assuming each swap happens right on time.
export function plan(events, s, now) {
  const first = events.find((e) => e.action === 'poner');
  const head = capOnHead(events);
  const fin = [...events].reverse().find((e) => e.action === 'fin');
  const out = {
    preDoneAt: first && s.pre > 0 ? first.ts + s.pre * 60000 : null,
    postDoneAt: fin && s.post > 0 ? fin.ts + s.post * 60000 : null,
    swaps: [],
  };
  if (head) {
    let cap = head.cap;
    for (let k = 1; k <= 4; k++) {
      const at = head.since + k * s.interval * 60000;
      if (out.postDoneAt && at >= out.postDoneAt) break;
      const to = (cap % s.numCaps) + 1;
      out.swaps.push({ at, from: cap, to, takeOutAt: s.lead > 0 ? at - s.lead * 60000 : null });
      cap = to;
    }
  }
  return out;
}

// ---------------------------------------------------------------- live status (Android persistent notification)

/**
 * Timeline for the always-on Android notification. The native service shows the last phase whose `at`
 * has passed and switches by itself at each `at`, so it keeps working while the app is closed.
 * A phase has: at, title, text, big, sub, and either countdownTo (ms) or countUpFrom (ms).
 * Returns [] when there is nothing to show.
 */
export function liveTimeline(events, s, now) {
  const evs = capEvents(events);
  const head = capOnHead(events);
  if (!evs.length || (!head && events.some((e) => e.action === 'fin'))) return [];

  const p = plan(events, s, now);
  const planLines = [
    ...(p.preDoneAt ? [`Pre-enfriamiento listo: ${clock(p.preDoneAt)}`] : []),
    ...p.swaps.slice(0, 3).map((w) => `${w.takeOutAt ? `Sacar #${w.to}: ${clock(w.takeOutAt)} · ` : ''}Cambio: ${clock(w.at)} (#${w.from} → #${w.to})`),
    ...(p.postDoneAt ? [`Fin del post-enfriamiento: ${clock(p.postDoneAt)}`] : []),
  ];
  const withBig = (phase) => ({ ...phase, big: [phase.text, ...(planLines.length ? ['', ...planLines] : [])].join('\n') });

  if (!head) {
    const last = evs[evs.length - 1];
    const first = todo(events, s, now)[0];
    return [withBig({ at: last.ts, title: 'Sin cap en la cabeza', text: first.text, sub: 'desde el último paso', countUpFrom: last.ts, urgent: !!first.urgent })];
  }

  const nxt = nextCap(events, s.numCaps);
  const swapAt = head.since + s.interval * 60000;
  const alreadyOut = readyCaps(events).includes(nxt);
  const leadAt = s.lead > 0 && !alreadyOut ? Math.max(head.since, swapAt - s.lead * 60000) : null;
  const title = `Cap #${head.cap} en la cabeza`;
  const phases = [];
  if (alreadyOut) {
    phases.push({ at: head.since, title, text: `El #${nxt} ya está fuera · cambio a las ${clock(swapAt)}`, sub: 'para el cambio', countdownTo: swapAt });
  } else if (leadAt) {
    phases.push({ at: head.since, title, text: `Sacar el #${nxt} a las ${clock(leadAt)} · cambio ${clock(swapAt)}`, sub: `para sacar el #${nxt}`, countdownTo: leadAt });
    phases.push({ at: leadAt, title: `Saca el cap #${nxt} del cooler`, text: `Cambio a las ${clock(swapAt)}: quita el #${head.cap}, pon el #${nxt}`, sub: 'para el cambio', countdownTo: swapAt, urgent: true });
  } else {
    phases.push({ at: head.since, title, text: `Siguiente: cap #${nxt} · cambio a las ${clock(swapAt)}`, sub: 'para el cambio', countdownTo: swapAt });
  }
  phases.push({ at: swapAt, title: '¡Cambiar ya!', text: `Quita el #${head.cap} y pon el #${nxt}`, sub: 'de retraso', countUpFrom: swapAt, urgent: true });
  return phases.map(withBig);
}

// ---------------------------------------------------------------- natural language input (Spanish)

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50 };
const NUMTOK = `(\\d+(?:[.,]\\d+)?|${Object.keys(NUM).join('|')})`;
const toNum = (t) => NUM[t] ?? parseFloat(t.replace(',', '.'));
const ORD = { primer: 1, primero: 1, primera: 1, segundo: 2, segunda: 2, tercer: 3, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6 };

function parseAction(c) {
  if (/(termin|acab|finaliz)\w*.*(quimio|infusion|tratamiento|sesion)|fin de (la )?(quimio|infusion)/.test(c)) return 'fin';
  if (/\bquit|\bretir|\bremov|\bsa(?:c|qu)\w*.*\bcabeza/.test(c)) return 'quitar';
  if (/\bmet[ei]|\bmeti|\bguard|\bdevolv|\bregres/.test(c)) return 'meter';
  if (/\bsa(?:c|qu)/.test(c)) return 'sacar';
  if (/\bpus|\bpon|\bcoloc|\bcoloq/.test(c)) return 'poner';
  return null;
}

// Milliseconds ago ("hace 3 min"), or null.
function parseAgo(c) {
  if (/\bhace medio minuto\b/.test(c)) return 30000;
  let m = c.match(new RegExp(`\\bhace ${NUMTOK}\\s*(?:horas?|hrs?|h)\\b`));
  if (m) return toNum(m[1]) * 3600000;
  m = c.match(new RegExp(`\\bhace ${NUMTOK}\\s*(?:minutos?|mins?|m)\\b`));
  if (m) return toNum(m[1]) * 60000;
  m = c.match(new RegExp(`\\bhace ${NUMTOK}\\s*(?:segundos?|segs?|s)\\b`));
  if (m) return toNum(m[1]) * 1000;
  return null;
}

// Absolute clock time today ("a las 10:15"), or null. undefined = that time hasn't happened yet.
function parseAbs(c, now) {
  const m = c.match(/\ba las (\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/);
  if (!m) return null;
  let h = +m[1];
  const min = +(m[2] ?? 0);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  const d = new Date(now);
  d.setHours(h, min, 0, 0);
  // Without am/pm, "a las 3" could be 3:00 or 15:00: take the latest one that already happened.
  const candidates = !m[3] && h <= 12 ? [d.getTime(), d.getTime() + 12 * 3600000] : [d.getTime()];
  const past = candidates.filter((t) => t <= now + 60000);
  return past.length ? Math.max(...past) : undefined;
}

function parseCap(c) {
  let m = c.match(/\bcaps?\s*(?:numero|num\.?|no\.?|n|#)?\s*#?(\d{1,2})\b/);
  if (m) return +m[1];
  m = c.match(/\bcaps?\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
  if (m) return NUM[m[1]];
  m = c.match(/\b(primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa])\s+cap\b/);
  if (m) return ORD[m[1]];
  return null;
}

/**
 * Turns free Spanish text into log entries, e.g. "hace 3 min le puse un cap".
 * Returns { entries: [{action, cap, ts}], problems: [string] }. Entries are sorted by time.
 */
export function parseEntries(text, now, { events, numCaps, selected = 1 }) {
  const t = norm(text).replace(/[¿?¡!]/g, ' ');
  const clauses = t.split(/[,;.]| y | luego | despues | entonces /).map((s) => s.trim()).filter(Boolean);
  const problems = [];
  const parsed = [];

  for (const c of clauses) {
    const action = parseAction(c);
    const ago = parseAgo(c);
    const abs = parseAbs(c, now);
    if (abs === undefined) { problems.push(`“${c}”: esa hora todavía no ha pasado`); continue; }
    const ts = abs ?? (ago != null ? now - ago : null);
    if (!action) {
      // A clause with only a time ("hace 3 minutos") belongs to the previous action if that had none.
      const prev = parsed[parsed.length - 1];
      if (ts != null && prev && prev.ts == null) prev.ts = ts;
      else if (ts == null || !prev) problems.push(`No entendí “${c}”`);
      continue;
    }
    parsed.push({ action, ts, cap: parseCap(c) });
  }

  // An action with no time of its own shares the time of the one before it ("hace 3 min quité el cap y puse el 2").
  parsed.forEach((p, i) => { if (p.ts == null && i > 0) p.ts = parsed[i - 1].ts; });
  const entries = parsed.map((p) => ({ action: p.action, cap: p.cap, ts: p.ts ?? now })).sort((a, b) => a.ts - b.ts);
  const working = [...events];
  for (const e of entries) {
    if (e.action !== 'fin') {
      const prefix = working.filter((w) => w.ts <= e.ts);
      e.cap ??= inferCap(prefix, e.action, numCaps, selected);
      if (e.cap < 1 || e.cap > numCaps) problems.push(`El cap #${e.cap} no existe (tienes ${numCaps} caps)`);
    } else {
      e.cap = 0;
    }
    working.push(e);
    working.sort((a, b) => a.ts - b.ts);
  }
  if (!entries.length && !problems.length) problems.push('Cuéntame qué pasó, por ejemplo: “hace 3 min le puse un cap”.');
  return { entries, problems };
}

export function toCSV(events, t0) {
  const rows = [['hora', 'minutos_desde_inicio', 'cap', 'accion']];
  for (const e of events) {
    rows.push([
      new Date(e.ts).toLocaleTimeString('es-PA'),
      ((e.ts - t0) / 60000).toFixed(1),
      e.action === 'fin' ? '' : e.cap,
      ACTIONS[e.action],
    ]);
  }
  return rows.map((r) => r.join(',')).join('\n');
}
