// Pixel-based text contrast check for backgrounds axe cannot resolve (photos, gradients, glass,
// pseudo-elements). For every visible text node: record its colour and box, hide all text,
// screenshot the section, then compare the text colour with the REAL background pixels behind
// each text box. Reports the 2nd-percentile (near worst-case) and median contrast.
//   fail    = median contrast below the WCAG AA threshold (4.5, or 3 for large text)
//   partial = median passes but the worst 2% of pixels do not (a bright patch behind some glyphs)
// Env: WIDTHS=1440,375  SAMPLES=2 (screenshots per section, 3s apart, to catch animated backdrops)
import fs from 'node:fs';
import { launch, BASE, ALL_IDS, warmUp, outDir } from './lib.mjs';

const WIDTHS = (process.env.WIDTHS || '1440,375').split(',').map(Number);
const SAMPLES = Number(process.env.SAMPLES || 2);
const only = process.env.ONLY ? process.env.ONLY.split(',') : ALL_IDS;
const out = outDir('reports');

const collect = () => {
  const items = [];
  const skipped = [];
  const sec = document.querySelector('.__target');
  const sr = sec.getBoundingClientRect();
  const rgba = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const effOpacity = (el) => {
    let o = 1;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement)
      o *= parseFloat(getComputedStyle(e).opacity);
    return o;
  };
  const label = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls =
      typeof el.className === 'string' && el.className
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
    return el.tagName.toLowerCase() + id + cls;
  };
  const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const text = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName)) continue;
    if (el.closest('[hidden], [aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('button:disabled, input:disabled')) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const eo = effOpacity(el);
    if (eo < 0.05) continue;
    const clip = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text';
    const fill = rgba(cs.webkitTextFillColor) || rgba(cs.color);
    const key = label(el) + '|' + text + '|' + Math.round(r.x) + ',' + Math.round(r.y);
    if (seen.has(key)) continue;
    seen.add(key);
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = px >= 24 || (px >= 18.66 && bold);
    const base = { sel: label(el), text: text.slice(0, 40), large, px: Math.round(px) };
    if (clip) {
      skipped.push({ ...base, why: 'background-clip:text (manual check)' });
      continue;
    }
    if (!fill) continue;
    items.push({
      ...base,
      x: r.x - sr.x,
      y: r.y - sr.y,
      w: r.width,
      h: r.height,
      color: [fill[0], fill[1], fill[2], fill[3] * eo],
    });
  }
  // Placeholders (no text node).
  for (const inp of sec.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    const cs = getComputedStyle(inp, '::placeholder');
    const c = rgba(cs.color);
    const r = inp.getBoundingClientRect();
    if (!c || r.width < 2 || inp.disabled) continue;
    const px = parseFloat(getComputedStyle(inp).fontSize);
    items.push({
      sel: label(inp) + '::placeholder',
      text: inp.getAttribute('placeholder').slice(0, 40),
      large: false,
      px: Math.round(px),
      x: r.x - sr.x + 8,
      y: r.y - sr.y + r.height * 0.3,
      w: Math.max(8, r.width - 16),
      h: r.height * 0.4,
      color: [c[0], c[1], c[2], c[3] * effOpacity(inp)],
    });
  }
  return { items, skipped, w: sr.width, h: sr.height };
};

const analyse = async ({ b64, items }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return items.map((it) => {
    const x = Math.max(0, Math.floor(it.x)),
      y = Math.max(0, Math.floor(it.y));
    const w = Math.min(img.width - x, Math.ceil(it.w)),
      h = Math.min(img.height - y, Math.ceil(it.h));
    if (w < 1 || h < 1) return { ...it, skip: true };
    const d = ctx.getImageData(x, y, w, h).data;
    const total = w * h;
    const stride = Math.max(1, Math.floor(total / 3000));
    const [tr, tg, tb, ta] = it.color;
    const arr = [];
    for (let i = 0; i < total; i += stride) {
      const br = d[i * 4],
        bg = d[i * 4 + 1],
        bb = d[i * 4 + 2];
      const r = ta * tr + (1 - ta) * br,
        g = ta * tg + (1 - ta) * bg,
        b = ta * tb + (1 - ta) * bb;
      const l1 = lum(r, g, b),
        l2 = lum(br, bg, bb);
      arr.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
    }
    arr.sort((a, b2) => a - b2);
    const p2 = arr[Math.floor(arr.length * 0.02)];
    const med = arr[Math.floor(arr.length / 2)];
    const thr = it.large ? 3 : 4.5;
    return {
      sel: it.sel,
      text: it.text,
      large: it.large,
      px: it.px,
      thr,
      p2: +p2.toFixed(2),
      med: +med.toFixed(2),
      status: med < thr ? 'fail' : p2 < thr ? 'partial' : 'pass',
    };
  });
};

const b = await launch();
const report = {};
for (const w of WIDTHS) {
  const page = await b.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(BASE);
  await warmUp(page);
  const rows = [];
  for (const id of only) {
    if (id === 'top' || id === 'compare') {
      /* chrome areas are plain colours; axe covers them */
    }
    await page.evaluate((i) => {
      document.querySelectorAll('.__target').forEach((e) => e.classList.remove('__target'));
      const el = document.getElementById(i);
      el.classList.add('__target');
      el.scrollIntoView({ behavior: 'instant' });
    }, id);
    await page.waitForTimeout(500);
    const info = await page.evaluate(collect);
    const worst = new Map();
    await page
      .addStyleTag({
        content:
          '*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}*::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important}.topnav{visibility:hidden!important}',
      })
      .then(async (tag) => {
        for (let s = 0; s < SAMPLES; s++) {
          if (s) await page.waitForTimeout(3000);
          const png = await page.locator(`#${id}`).screenshot();
          const res = await page.evaluate(analyse, {
            b64: png.toString('base64'),
            items: info.items,
          });
          res.forEach((r, i) => {
            if (r.skip) return;
            const prev = worst.get(i);
            if (!prev || r.p2 < prev.p2) worst.set(i, r);
          });
        }
        await tag.evaluate((t) => t.remove());
      });
    for (const r of worst.values()) rows.push({ section: id, ...r });
    info.skipped.forEach((s) => rows.push({ section: id, ...s, status: 'manual' }));
  }
  report[w] = rows;
  await page.close();
}
await b.close();

fs.writeFileSync(`${out}contrast.json`, JSON.stringify(report, null, 2));
let failed = 0;
for (const w of WIDTHS) {
  const rows = report[w];
  const count = (s) => rows.filter((r) => r.status === s).length;
  console.log(
    `\n== width ${w}: ${rows.length} text items | pass ${count('pass')} | partial ${count('partial')} | fail ${count('fail')} | manual ${count('manual')}`,
  );
  for (const r of rows.filter((x) => x.status === 'fail' || x.status === 'partial')) {
    console.log(
      `${r.status.toUpperCase().padEnd(7)} ${r.section} ${r.sel} "${r.text}" ${r.px}px need ${r.thr} median ${r.med} worst2% ${r.p2}`,
    );
  }
  failed += count('fail');
}
if (failed) process.exitCode = 1;
