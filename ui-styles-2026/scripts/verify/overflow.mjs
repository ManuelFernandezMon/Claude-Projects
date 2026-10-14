// Flags real content wider than the viewport at 320-1920px. Unlike a scrollWidth check this also
// catches content that is CLIPPED by overflow:hidden/clip ancestors. Decorative aria-hidden shapes
// and content inside intentionally scrollable regions (overflow auto/scroll) are ignored.
import { launch, BASE, warmUp, SECTION_IDS } from './lib.mjs';

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];
const b = await launch();
const failures = [];
for (const w of WIDTHS) {
  const page = await b.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(BASE);
  await warmUp(page);
  const bad = await page.evaluate((ids) => {
    const vw = document.documentElement.clientWidth;
    const out = [];
    if (document.documentElement.scrollWidth > vw)
      out.push(`page scrolls horizontally: ${document.documentElement.scrollWidth} > ${vw}`);
    for (const id of [...ids, 'top', 'compare']) {
      const sec = document.getElementById(id);
      for (const el of sec.querySelectorAll('*')) {
        if (el.closest('[aria-hidden="true"]')) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || r.right <= vw + 1 || getComputedStyle(el).visibility === 'hidden') continue;
        let scrollable = false;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const o = getComputedStyle(a).overflowX;
          if (o === 'auto' || o === 'scroll') {
            scrollable = true;
            break;
          }
        }
        if (!scrollable)
          out.push(
            `${id} ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)} > ${vw}`,
          );
      }
    }
    return out.slice(0, 12);
  }, SECTION_IDS);
  console.log(`${w}px: ${bad.length ? 'FAIL' : 'ok'}`);
  bad.forEach((m) => console.log('   ' + m));
  if (bad.length) failures.push(w);
  await page.close();
}
await b.close();
if (failures.length) process.exitCode = 1;
