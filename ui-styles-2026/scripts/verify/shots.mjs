// Screenshots every section at 375, 768, 1440 (plus overflow-only checks at 320 and 1920).
import { launch, BASE, ALL_IDS, warmUp, outDir } from './lib.mjs';

const WIDTHS = (process.env.WIDTHS || '375,768,1440').split(',').map(Number);
const OVERFLOW_WIDTHS = [320, 375, 768, 1440, 1920];
const only = process.env.ONLY ? process.env.ONLY.split(',') : ALL_IDS;
const out = outDir('shots');
const b = await launch();
const report = [];

for (const w of WIDTHS) {
  const page = await b.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(BASE);
  await warmUp(page);
  await page.addStyleTag({ content: '.topnav{visibility:hidden!important}' });
  for (const id of only) {
    const loc = page.locator(`#${id}`);
    await loc.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await loc.screenshot({ path: `${out}${w}-${id}.png`, animations: 'disabled' });
  }
  await page.close();
}

for (const w of OVERFLOW_WIDTHS) {
  const page = await b.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(BASE);
  await warmUp(page);
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const sec of document.querySelectorAll('.style-sec, .hero, .compare')) {
      const sr = sec.getBoundingClientRect();
      if (sec.scrollWidth > vw + 1)
        offenders.push(`${sec.id || sec.className}: scrollWidth ${sec.scrollWidth} > ${vw}`);
      void sr;
    }
    return { vw, docScroll: document.documentElement.scrollWidth, offenders };
  });
  report.push({ width: w, ...r, ok: r.docScroll <= r.vw && r.offenders.length === 0 });
  await page.close();
}
await b.close();
console.log(JSON.stringify(report, null, 2));
if (report.some((r) => !r.ok)) process.exitCode = 1;
