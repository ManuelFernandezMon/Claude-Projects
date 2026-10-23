/**
 * Unit conversion for ingredient quantities written the way people write them ("1 1/2 cups", "200 g", "2-3 tbsp").
 *
 * Only same-kind conversions are done here (volume to volume, weight to weight): they are plain arithmetic and work
 * offline. Volume to weight ("1 cup of flour" to grams) depends on the ingredient and is left to the AI.
 *
 * Kitchen values are used rather than lab values (1 cup = 240 ml, 1 tbsp = 15 ml, 1 tsp = 5 ml, 1 lb = 450 g), because
 * that is what recipes in either system actually use.
 */

export type System = 'metric' | 'us'
type Kind = 'volume' | 'weight'
type Unit = 'tsp' | 'tbsp' | 'floz' | 'cup' | 'pint' | 'quart' | 'ml' | 'l' | 'oz' | 'lb' | 'g' | 'kg'

const UNITS: Record<Unit, { kind: Kind; system: System; toBase: number }> = {
  tsp: { kind: 'volume', system: 'us', toBase: 5 },
  tbsp: { kind: 'volume', system: 'us', toBase: 15 },
  floz: { kind: 'volume', system: 'us', toBase: 30 },
  cup: { kind: 'volume', system: 'us', toBase: 240 },
  pint: { kind: 'volume', system: 'us', toBase: 480 },
  quart: { kind: 'volume', system: 'us', toBase: 960 },
  ml: { kind: 'volume', system: 'metric', toBase: 1 },
  l: { kind: 'volume', system: 'metric', toBase: 1000 },
  oz: { kind: 'weight', system: 'us', toBase: 28.35 },
  lb: { kind: 'weight', system: 'us', toBase: 450 },
  g: { kind: 'weight', system: 'metric', toBase: 1 },
  kg: { kind: 'weight', system: 'metric', toBase: 1000 },
}

const ALIASES: Record<string, Unit> = {
  tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  tbsp: 'tbsp', tbsps: 'tbsp', tbs: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  'fl oz': 'floz', 'fl. oz': 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  cup: 'cup', cups: 'cup', c: 'cup',
  pint: 'pint', pints: 'pint', pt: 'pint',
  quart: 'quart', quarts: 'quart', qt: 'quart',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  g: 'g', gram: 'g', grams: 'g', gr: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
}

const VULGAR: Record<string, string> = { '½': ' 1/2', '⅓': ' 1/3', '⅔': ' 2/3', '¼': ' 1/4', '¾': ' 3/4', '⅛': ' 1/8', '⅜': ' 3/8', '⅝': ' 5/8', '⅞': ' 7/8' }

const NUM = String.raw`\d+\s+\d+/\d+|\d+/\d+|\d*\.\d+|\d+`
const RE = new RegExp(
  String.raw`^\s*(${NUM})(?:\s*(?:-|–|to)\s*(${NUM}))?\s*(fl\.?\s*oz|fluid\s+ounces?|[a-zA-Z]+\.?)(?![a-zA-Z])\s*(.*)$`,
  'i',
)

function toNumber(s: string): number {
  const t = s.trim()
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = /^(\d+)\/(\d+)$/.exec(t)
  if (frac) return Number(frac[1]) / Number(frac[2])
  return Number(t)
}

export interface ParsedQuantity {
  low: number
  high?: number
  unit: Unit
  rest: string
}

/** Reads "1 1/2 cups", "2-3 tbsp", "200 g", "½ tsp". Returns null for counts, free text and anything else. */
export function parseQuantity(input: string): ParsedQuantity | null {
  let s = input.trim()
  for (const [v, r] of Object.entries(VULGAR)) s = s.split(v).join(r)
  s = s.replace(/(\d)\s+(\d\/\d)/g, '$1 $2').trim()
  const m = RE.exec(s)
  if (!m) return null
  const unitKey = m[3].toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ')
  const unit = ALIASES[unitKey] ?? ALIASES[unitKey.replace('fl. oz', 'fl oz')]
  if (!unit) return null
  const rest = m[4].trim()
  if (/\d/.test(rest)) return null // "1 cup (125 g)" or "2 cups plus 1 tbsp": leave alone instead of mangling it
  return { low: toNumber(m[1]), high: m[2] ? toNumber(m[2]) : undefined, unit, rest }
}

/** Which system the quantity is written in, or undefined when it has no recognisable unit. */
export function unitSystem(q: string): System | undefined {
  const p = parseQuantity(q)
  return p ? UNITS[p.unit].system : undefined
}

export function unitKind(q: string): Kind | undefined {
  const p = parseQuantity(q)
  return p ? UNITS[p.unit].kind : undefined
}

/** Cook-friendly rounding for metric amounts. */
function niceRound(v: number): number {
  if (v < 10) return Math.round(v)
  if (v < 50) return Math.round(v)
  if (v < 1000) return Math.round(v / 5) * 5
  return Math.round(v / 10) * 10
}

const trim = (n: number, decimals = 2) => String(Number(n.toFixed(decimals)))

function fmtMetric(base: number, kind: Kind): string {
  if (kind === 'volume') return base >= 1000 ? `${trim(base / 1000)} l` : `${niceRound(base)} ml`
  return base >= 1000 ? `${trim(base / 1000)} kg` : `${niceRound(base)} g`
}

/** Rounds to the nearest practical fraction (thirds and quarters, or eighths) and writes it as "1 1/2". */
function fmtFraction(x: number, eighths = false): { text: string; value: number } {
  const steps = eighths ? [0, 1 / 8, 1 / 4, 3 / 8, 1 / 2, 5 / 8, 3 / 4, 7 / 8, 1] : [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1]
  const labels: Record<number, string> = { 0: '', [1 / 8]: '1/8', [1 / 4]: '1/4', [3 / 8]: '3/8', [1 / 3]: '1/3', [1 / 2]: '1/2', [5 / 8]: '5/8', [2 / 3]: '2/3', [3 / 4]: '3/4', [7 / 8]: '7/8', 1: '' }
  const whole = Math.floor(x)
  const frac = x - whole
  let best = steps[0]
  for (const s of steps) if (Math.abs(s - frac) < Math.abs(best - frac)) best = s
  const w = best === 1 ? whole + 1 : whole
  const f = best === 1 ? 0 : best
  const label = labels[f]
  const text = [w > 0 ? String(w) : '', label].filter(Boolean).join(' ') || '0'
  return { text, value: w + f }
}

function fmtUs(base: number, kind: Kind): { text: string; value: number; unit: string } {
  if (kind === 'volume') {
    if (base < 14) {
      const f = fmtFraction(base / 5, true)
      return { text: `${f.text} tsp`, value: f.value * 5, unit: 'tsp' }
    }
    if (base < 60) {
      const f = fmtFraction(base / 15)
      return { text: `${f.text} tbsp`, value: f.value * 15, unit: 'tbsp' }
    }
    const f = fmtFraction(base / 240)
    return { text: `${f.text} ${f.value > 1 ? 'cups' : 'cup'}`, value: f.value * 240, unit: 'cup' }
  }
  const oz = base / 28.35
  if (oz < 15.5) {
    const step = oz < 8 ? 0.5 : 1
    const v = Math.max(step, Math.round(oz / step) * step)
    return { text: `${trim(v, 1)} oz`, value: v * 28.35, unit: 'oz' }
  }
  const f = fmtFraction(base / 450)
  return { text: `${f.text} lb`, value: f.value * 450, unit: 'lb' }
}

export interface Converted {
  text: string
  /** True when rounding to a practical measure moved the amount by more than about 4%. */
  approx: boolean
}

/**
 * Converts within the same kind (volume or weight). Returns the original text unchanged when it is already in the
 * target system, and undefined when there is nothing to convert (no unit, a count, or a form we do not parse).
 */
export function convertLocal(quantity: string, to: System): Converted | undefined {
  const p = parseQuantity(quantity)
  if (!p) return undefined
  const info = UNITS[p.unit]
  if (info.system === to) return { text: quantity.trim(), approx: false }

  const one = (n: number): { text: string; approx: boolean } => {
    const base = n * info.toBase
    if (to === 'metric') return { text: fmtMetric(base, info.kind), approx: false }
    const r = fmtUs(base, info.kind)
    return { text: r.text, approx: Math.abs(r.value - base) / base > 0.04 }
  }

  const a = one(p.low)
  const strip = (t: string) => t.replace(/ (ml|l|g|kg|oz|lb|tsp|tbsp|cups?)$/, '')
  const unitOf = (t: string) => / (ml|l|g|kg|oz|lb|tsp|tbsp|cups?)$/.exec(t)?.[1] ?? ''
  let text = a.text
  let approx = a.approx
  if (p.high !== undefined) {
    const b = one(p.high)
    // a range only stays a range when both ends land in the same unit; otherwise convert each end fully
    text = unitOf(a.text) === unitOf(b.text) ? `${strip(a.text)}-${b.text}` : `${a.text} - ${b.text}`
    approx = approx || b.approx
  }
  return { text: p.rest ? `${text} ${p.rest}` : text, approx }
}
