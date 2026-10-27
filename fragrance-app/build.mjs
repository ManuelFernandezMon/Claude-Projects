// Reads ../fragrance-content/*.md and writes public/data.json. No dependencies.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "fragrance-content");
const out = join(here, "public", "data.json");

const read = (p) => readFileSync(join(src, p), "utf8");

function tableRows(md) {
  return md
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .slice(2)
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
}

function parseCollection(md) {
  return tableRows(md).map(([name, brand, notes, purchased, rating, occasion]) => ({
    name,
    brand,
    notes,
    purchased,
    rating: rating === "" ? null : Number(rating),
    occasions: occasion ? occasion.split(",").map((s) => s.trim()).filter(Boolean) : [],
  }));
}

function parseWishlist(md) {
  return tableRows(md).map(([name, brand, notes, why, priority]) => ({ name, brand, notes, why, priority }));
}

function parsePreferences(md) {
  const part = md.split(/^## Notes \/ preferences.*$/m)[1] || "";
  return part
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => {
      const i = l.indexOf(":");
      return { label: l.slice(2, i).trim(), value: l.slice(i + 1).trim() };
    });
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

// Minimal markdown: headings, paragraphs, lists, hr. Enough for scripts and research notes.
function markdown(md) {
  const html = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushPara(); flushList();
      const level = Math.min(m[1].length + 1, 5);
      html.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^---+$/.test(line)) {
      flushPara(); flushList(); html.push("<hr>");
    } else if ((m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/))) {
      flushPara();
      const tag = /^\s*\d+\./.test(line) ? "ol" : "ul";
      if (list !== tag) { flushList(); html.push(`<${tag}>`); list = tag; }
      html.push(`<li>${inline(m[1])}</li>`);
    } else if (line.startsWith("|")) {
      continue;
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return html.join("\n");
}

function documents(dir) {
  const full = join(src, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse()
    .map((f) => {
      const md = read(join(dir, f));
      const title = (md.match(/^#\s+(.*)$/m) || [null, f])[1];
      const date = (f.match(/^\d{4}-\d{2}-\d{2}/) || [""])[0];
      const body = md.replace(/^#\s+.*\n/, "");
      return { file: f, title, date, html: markdown(body) };
    });
}

const collectionMd = read("collection.md");
const data = {
  handle: "@tufrenperfumero",
  collection: parseCollection(collectionMd),
  preferences: parsePreferences(collectionMd),
  wishlist: parseWishlist(read("wishlist.md")),
  content: documents("content"),
  research: documents("research"),
};

writeFileSync(out, JSON.stringify(data, null, 1) + "\n");
console.log(
  `data.json: ${data.collection.length} perfumes, ${data.wishlist.length} wishlist, ` +
    `${data.content.length} scripts, ${data.research.length} research notes`
);
