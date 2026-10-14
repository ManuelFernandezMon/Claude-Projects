// Recipe fidelity: every `property: value` declaration shown in a section's "Show CSS" recipe must
// also appear (whitespace-insensitive) in that style's own stylesheet, and recipes must be <= 15 lines.
import fs from 'node:fs';
import { launch, BASE, SECTION_IDS } from './lib.mjs';

// Token-level comparison: every number+unit and every colour used in a recipe must also occur in the
// stylesheet (after normalising 0.5/.5, #fff/#ffffff). That catches drift such as 9px vs 10px.
const normHex = (h) => {
  h = h.toLowerCase().slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  return '#' + h.slice(0, 6);
};
const tokens = (text) => {
  const t = new Set();
  const noStr = text.replace(/(["'])(?:(?!\1).)*\1/g, '""').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of noStr.matchAll(/#[0-9a-fA-F]{3,8}\b/g))
    if ([4, 5, 7, 9].includes(m[0].length)) t.add(normHex(m[0]));
  for (const m of noStr.matchAll(
    /(?<![\w#-])(-?\d*\.?\d+)(px|rem|em|vw|vh|svh|%|deg|ms|s)?(?![\w])/g,
  )) {
    const n = parseFloat(m[1]);
    if (n === 0 || n === 1) continue; // too common to be informative
    t.add(n + (m[2] || ''));
  }
  return t;
};
const canon = (s) => s.toLowerCase().replace(/\s+/g, '').replace(/;$/, '');
const b = await launch();
const page = await b.newPage();
await page.goto(BASE);
const recipes = await page.evaluate(
  (ids) =>
    ids.map((id) => {
      const sec = document.getElementById(id);
      return {
        id,
        css: sec.getAttribute('data-css'),
        code: sec.querySelector('.css-recipe code')?.textContent ?? '',
      };
    }),
  SECTION_IDS,
);
await b.close();

let bad = 0;
const rows = [];
for (const r of recipes) {
  const file = new URL(`../../${r.css}`, import.meta.url).pathname;
  const sheetText = fs.readFileSync(file, 'utf8');
  const sheet = tokens(sheetText);
  const lines = r.code.replace(/\n+$/, '').split('\n').length;
  const recipe = tokens(r.code);
  const missing = [...recipe].filter((t) => !sheet.has(t));
  rows.push({ id: r.id, lines, decls: recipe.size, missing });
  if (missing.length || lines > 15) bad++;
}
for (const r of rows) {
  const flag = r.missing.length || r.lines > 15 ? 'FAIL' : 'ok  ';
  console.log(
    `${flag} ${r.id} lines=${r.lines} declarations=${r.decls} missing=${r.missing.length}`,
  );
  r.missing.forEach((m) => console.log(`       not in stylesheet: ${m.replace(/\s+/g, ' ')}`));
}
if (bad) process.exitCode = 1;
