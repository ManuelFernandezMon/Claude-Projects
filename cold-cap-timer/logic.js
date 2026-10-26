// Pure functions: no DOM, so they can be tested with `node --test`.

export const ACTIONS = {
  sacar: 'Sacar del cooler',
  poner: 'Poner en la cabeza',
  quitar: 'Quitar de la cabeza',
  meter: 'Meter al cooler',
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

// Cap currently on the head: last `poner` with no later `quitar` for that cap.
export function capOnHead(events) {
  const open = new Map();
  for (const e of events) {
    if (e.action === 'poner') open.set(e.cap, e.ts);
    if (e.action === 'quitar') open.delete(e.cap);
  }
  if (!open.size) return null;
  const [cap, since] = [...open.entries()].pop();
  return { cap, since };
}

// Per-use durations. A "use" of a cap runs sacar -> poner -> quitar -> meter.
export function summarize(events) {
  const uses = [];
  const current = new Map();
  for (const e of events) {
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

// Suggested next action given the log.
export function nextAction(events) {
  const last = events[events.length - 1];
  if (!last) return 'sacar';
  return { sacar: 'poner', poner: 'quitar', quitar: 'meter', meter: 'sacar' }[last.action];
}

export function toCSV(events, t0) {
  const rows = [['hora', 'minutos_desde_inicio', 'cap', 'accion']];
  for (const e of events) {
    rows.push([
      new Date(e.ts).toLocaleTimeString('es-PA'),
      ((e.ts - t0) / 60000).toFixed(1),
      e.cap,
      ACTIONS[e.action],
    ]);
  }
  return rows.map((r) => r.join(',')).join('\n');
}
