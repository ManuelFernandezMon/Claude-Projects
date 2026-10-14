// Checks user-preference handling: running animations with and without prefers-reduced-motion,
// backdrop-filter under prefers-contrast: more, and the Liquid Glass "reduce transparency" switch.
import { launch, BASE, warmUp, SECTION_IDS } from './lib.mjs';

const b = await launch();
const out = {};

async function runningAnimations(reducedMotion) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await warmUp(page);
  const perSection = {};
  for (const id of SECTION_IDS) {
    await page.evaluate(
      (i) => document.getElementById(i).scrollIntoView({ behavior: 'instant' }),
      id,
    );
    await page.waitForTimeout(350);
    perSection[id] = await page.evaluate((i) => {
      const sec = document.getElementById(i);
      return document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect && sec.contains(a.effect.target))
        .filter((a) => {
          const t = a.effect.getComputedTiming();
          return t.iterations === Infinity || t.activeDuration > 1000;
        }).length;
    }, id);
  }
  await ctx.close();
  return perSection;
}
out.animationsNormal = await runningAnimations('no-preference');
out.animationsReduced = await runningAnimations('reduce');
out.reducedMotionTotals = {
  normal: Object.values(out.animationsNormal).reduce((a, n) => a + n, 0),
  reduced: Object.values(out.animationsReduced).reduce((a, n) => a + n, 0),
};

// prefers-contrast: more and the Liquid Glass switches
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await warmUp(page);
  const bf = () =>
    page.evaluate(() => {
      const get = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const cs = getComputedStyle(e);
        return cs.backdropFilter || cs.webkitBackdropFilter || 'none';
      };
      return {
        card01: get('#s-01 .demo-card'),
        card02: get('#s-02 .demo-card'),
        controls01: get('#s-01 .demo-controls'),
      };
    });
  await page.evaluate(() =>
    document.getElementById('s-01').scrollIntoView({ behavior: 'instant' }),
  );
  await page.waitForTimeout(400);
  out.backdropDefault = await bf();
  const sw = page.locator('#s-01 [data-section-class="reduce-transparency"]');
  await sw.click();
  out.backdropAfterReduceTransparencySwitch = await bf();
  await sw.click();
  await page
    .emulateMedia({ contrast: 'more' })
    .catch((e) => (out.contrastEmulationError = String(e).slice(0, 120)));
  await page.waitForTimeout(300);
  out.backdropContrastMore = await bf();
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 2));
const bad = out.reducedMotionTotals.reduced > 0;
if (bad) process.exitCode = 1;
