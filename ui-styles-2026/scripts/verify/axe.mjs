// axe-core via @axe-core/playwright: light, dark and reduced-motion runs over the whole page.
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { launch, BASE, warmUp, outDir } from './lib.mjs';

const configs = [
  { name: 'light', colorScheme: 'light', reducedMotion: 'no-preference' },
  { name: 'dark', colorScheme: 'dark', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', colorScheme: 'light', reducedMotion: 'reduce' },
  { name: 'mobile-375', colorScheme: 'light', reducedMotion: 'no-preference', width: 375 },
];
const out = outDir('reports');
const b = await launch();
const summary = [];
for (const c of configs) {
  const ctx = await b.newContext({
    viewport: { width: c.width || 1440, height: 900 },
    colorScheme: c.colorScheme,
    reducedMotion: c.reducedMotion,
  });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await warmUp(page);
  const res = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  fs.writeFileSync(`${out}axe-${c.name}.json`, JSON.stringify(res.violations, null, 2));
  const rows = res.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }));
  summary.push({
    config: c.name,
    violations: rows.length,
    nodes: rows.reduce((a, r) => a + r.nodes, 0),
    incomplete: res.incomplete.length,
    rows,
  });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(summary, null, 2));
if (summary.some((s) => s.violations)) process.exitCode = 1;
