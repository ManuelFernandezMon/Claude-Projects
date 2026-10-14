// Shared helpers for the verification scripts. Run against a served copy of the site:
//   npm run serve   (http://127.0.0.1:4173)   then   node scripts/verify/<script>.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

export const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium',
].filter(Boolean);

export async function launch() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return chromium.launch({ executablePath: p });
    }
  }
  return chromium.launch();
}

export const SECTION_IDS = Array.from(
  { length: 20 },
  (_, i) => `s-${String(i + 1).padStart(2, '0')}`,
);
export const ALL_IDS = ['top', ...SECTION_IDS, 'compare'];

// Scroll through the whole page once so IntersectionObserver activates every section and
// lazy rendering (content-visibility) is resolved; then return to the top.
export async function warmUp(page) {
  await page.evaluate(() => document.fonts && document.fonts.ready);
  for (const id of ALL_IDS) {
    await page.evaluate(
      (i) => document.getElementById(i)?.scrollIntoView({ behavior: 'instant' }),
      id,
    );
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

export function outDir(name) {
  const d = new URL(`../../${name}/`, import.meta.url).pathname;
  fs.mkdirSync(d, { recursive: true });
  return d;
}
