// Keyboard walk: Tab through every focusable control, check a visible focus change by comparing
// pixels with and without focus, no positive tabindex, and that Show CSS / switches work by keyboard.
import { launch, BASE, warmUp } from './lib.mjs';

const b = await launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE);
await warmUp(page);

const problems = [];
const noFocusChange = [];
const stops = [];

const positive = await page.$$eval(
  '[tabindex]',
  (els) => els.filter((e) => Number(e.getAttribute('tabindex')) > 0).length,
);
if (positive) problems.push(`${positive} element(s) with positive tabindex`);

await page.evaluate(() => window.scrollTo(0, 0));
await page.keyboard.press('Tab'); // first stop (skip link)
for (let i = 0; i < 400; i++) {
  const info = await page.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return null;
    const r = e.getBoundingClientRect();
    return {
      tag: e.tagName.toLowerCase(),
      id: e.id || '',
      cls: String(e.className || '').slice(0, 40),
      text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30),
      sec:
        (e.closest('section,header,nav,footer') || {}).id ||
        (e.closest('nav,header,footer') || {}).className ||
        '',
      w: r.width,
      h: r.height,
    };
  });
  if (!info) break;
  stops.push(info);
  if (info.w > 0 && info.h > 0 && info.tag !== 'body') {
    await page.evaluate(() =>
      document.activeElement.scrollIntoView({ block: 'center', behavior: 'instant' }),
    );
    await page.waitForTimeout(40);
    const box = await page.evaluate(() => {
      const r = document.activeElement.getBoundingClientRect();
      return {
        x: Math.max(0, r.x - 10),
        y: Math.max(0, r.y - 10),
        width: r.width + 20,
        height: r.height + 20,
      };
    });
    if (box.width > 0 && box.height > 0 && box.y + box.height < 900 && box.y >= 0) {
      const focused = await page.screenshot({ clip: box, animations: 'disabled' });
      await page.evaluate(() => {
        window.__prev = document.activeElement;
        document.activeElement.blur();
      });
      const plain = await page.screenshot({ clip: box, animations: 'disabled' });
      await page.evaluate(() => window.__prev.focus({ focusVisible: true }));
      if (Buffer.compare(focused, plain) === 0)
        noFocusChange.push(
          `${info.sec} <${info.tag}${info.id ? '#' + info.id : ''}> "${info.text}"`,
        );
    }
  }
  const before = await page.evaluate(() => document.activeElement);
  void before;
  await page.keyboard.press('Tab');
  const same = await page.evaluate(() => document.activeElement === document.body);
  if (same) break;
}

// Operate Show CSS and a switch with the keyboard in a few sections.
const checks = [];
for (const n of ['01', '07', '14', '20']) {
  const btn = page.locator(`#s-${n} .show-css`);
  await btn.scrollIntoViewIfNeeded();
  await btn.focus();
  await page.keyboard.press('Enter');
  const expanded = await btn.getAttribute('aria-expanded');
  const visible = await page.locator(`#css-${n}`).isVisible();
  checks.push({ section: n, showCssByKeyboard: expanded === 'true' && visible });
  const sw = page.locator(`#s-${n} [role=switch]`).first();
  await sw.focus();
  await page.keyboard.press('Space');
  checks.push({ section: n, switchBySpace: (await sw.getAttribute('aria-checked')) === 'true' });
}
await b.close();
console.log(
  JSON.stringify(
    {
      focusStops: stops.length,
      positiveTabindex: positive,
      noVisibleFocusChange: noFocusChange,
      checks,
      problems,
    },
    null,
    2,
  ),
);
if (noFocusChange.length || problems.length || checks.some((c) => Object.values(c).includes(false)))
  process.exitCode = 1;
