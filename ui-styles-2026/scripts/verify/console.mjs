// Console / network errors while scrolling, toggling every recipe and switch, in 3 environments.
import { launch, BASE, warmUp } from './lib.mjs';

const envs = [
  { name: 'light', colorScheme: 'light', reducedMotion: 'no-preference' },
  { name: 'dark', colorScheme: 'dark', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', colorScheme: 'light', reducedMotion: 'reduce' },
];
const b = await launch();
const results = [];
for (const e of envs) {
  const ctx = await b.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: e.colorScheme,
    reducedMotion: e.reducedMotion,
  });
  const page = await ctx.newPage();
  const msgs = [];
  page.on('console', (m) => {
    if (['error', 'warning'].includes(m.type())) msgs.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (err) => msgs.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (r) => msgs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) msgs.push(`http ${r.status()}: ${r.url()}`);
  });
  await page.goto(BASE);
  await warmUp(page);
  for (const btn of await page.$$('.show-css')) {
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }
  for (const sw of await page.$$('[role=switch]')) {
    await sw.scrollIntoViewIfNeeded();
    await sw.click();
  }
  await page.waitForTimeout(300);
  results.push({ env: e.name, messages: [...new Set(msgs)] });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => r.messages.length)) process.exitCode = 1;
