// With JavaScript disabled every section must still be visible and styled (the <noscript> block
// in index.html loads all stylesheets and overrides the hidden-until-ready rule).
import { launch, BASE, SECTION_IDS } from './lib.mjs';

const b = await launch();
const ctx = await b.newContext({
  javaScriptEnabled: false,
  viewport: { width: 1280, height: 800 },
});
const page = await ctx.newPage();
await page.goto(BASE);
await page.waitForLoadState('load');
await page.waitForTimeout(1500);
const res = await page.evaluate(
  (ids) =>
    ids.map((id) => {
      const sec = document.getElementById(id);
      const cs = getComputedStyle(sec);
      return {
        id,
        visibility: cs.visibility,
        background: cs.backgroundColor + ' ' + cs.backgroundImage.slice(0, 20),
        font: cs.fontFamily.slice(0, 24),
      };
    }),
  SECTION_IDS,
);
const hidden = res.filter((r) => r.visibility !== 'visible');
// A section that really received its own stylesheet no longer has the browser-default Times-like font.
const unstyled = res.filter(
  (r) => /^("?Times|serif)/i.test(r.font) && r.id !== 's-06' && r.id !== 's-15',
);
console.log(
  JSON.stringify({
    sections: res.length,
    hidden: hidden.map((h) => h.id),
    possiblyUnstyled: unstyled.map((u) => u.id),
  }),
);
await page
  .locator('#s-05')
  .screenshot({ path: new URL('../../shots/nojs-s-05.png', import.meta.url).pathname });
await b.close();
if (hidden.length) process.exitCode = 1;
