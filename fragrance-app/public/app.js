"use strict";

const view = document.getElementById("view");
const state = {
  data: null,
  search: "",
  sort: "rating",
  brand: "",
  occasions: new Set(),
  wearOccasions: new Set(),
};

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const fmt = (n) => (n == null ? "" : n.toFixed(1).replace(/\.0$/, ""));
const ratedOnly = (list) => list.filter((p) => p.rating != null);
const avg = (list) => (list.length ? list.reduce((s, p) => s + p.rating, 0) / list.length : 0);

function ratingEl(p) {
  if (p.rating == null) return h("span", { class: "pill" }, "not rated");
  return h("div", { class: "rating" },
    h("span", { class: "num" }, fmt(p.rating)),
    h("span", { class: "bar", title: `${fmt(p.rating)} / 10` }, h("i", { style: `width:${p.rating * 10}%` })));
}

function tagsEl(list) {
  return list.length ? h("div", { class: "tags" }, list.map((o) => h("span", { class: "tag" }, o))) : null;
}

function perfumeCard(p, opts = {}) {
  return h("article", { class: "card" + (opts.big ? " top-pick" : "") },
    opts.eyebrow ? h("p", { class: "eyebrow" }, opts.eyebrow) : null,
    h("div", { class: "card-head" },
      h("div", {}, h("h3", { class: "card-name" }, p.name), h("p", { class: "card-brand" }, p.brand + (p.purchased ? ` · ${p.purchased}` : ""))),
      ratingEl(p)),
    tagsEl(p.occasions),
    p.notes ? h("details", { class: "notes", open: opts.big }, h("summary", {}, "Notes"), h("p", {}, p.notes)) : null);
}

function chipRow(options, selected, onToggle, counts) {
  return h("div", { class: "chips" }, options.map((o) =>
    h("button", { type: "button", class: "chip" + (selected.has(o) ? " active" : ""), "aria-pressed": String(selected.has(o)), onclick: () => onToggle(o) },
      o + (counts ? ` ${counts[o]}` : ""))));
}

function occasionCounts(list) {
  const counts = {};
  for (const p of list) for (const o of p.occasions) counts[o] = (counts[o] || 0) + 1;
  return counts;
}

/* ---------- Collection ---------- */
const sorters = {
  rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  brand: (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
  newest: (a, b) => b.purchased.localeCompare(a.purchased) || a.name.localeCompare(b.name),
};

function viewCollection() {
  const { collection } = state.data;
  const rated = ratedOnly(collection);
  const best = [...rated].sort((a, b) => b.rating - a.rating)[0];
  const counts = occasionCounts(collection);
  const occs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const brands = [...new Set(collection.map((p) => p.brand))].sort();

  const countEl = h("p", { class: "count" });
  const results = h("div", { class: "cards" });
  const chipHost = h("div", {});

  function drawResults() {
    const q = state.search.trim().toLowerCase();
    const list = collection
      .filter((p) =>
        (!q || `${p.name} ${p.brand} ${p.notes}`.toLowerCase().includes(q)) &&
        (!state.brand || p.brand === state.brand) &&
        [...state.occasions].every((o) => p.occasions.includes(o)))
      .sort(sorters[state.sort]);
    countEl.textContent = `${list.length} of ${collection.length} perfumes`;
    results.replaceChildren(...(list.length ? list.map((p) => perfumeCard(p)) : [h("p", { class: "empty" }, "No perfumes match those filters.")]));
  }
  function drawChips() {
    chipHost.replaceChildren(chipRow(occs, state.occasions, (o) => {
      state.occasions.has(o) ? state.occasions.delete(o) : state.occasions.add(o);
      drawChips(); drawResults();
    }, counts));
  }
  drawChips(); drawResults();

  return [
    h("h1", {}, "Collection"),
    h("p", { class: "lede" }, "Everything you own, with your 1-10 ratings and the occasions each bottle suits."),
    h("div", { class: "stats" },
      h("div", { class: "stat" }, h("div", { class: "n" }, collection.length), h("div", { class: "l" }, "perfumes")),
      h("div", { class: "stat" }, h("div", { class: "n" }, fmt(Math.round(avg(rated) * 10) / 10)), h("div", { class: "l" }, "average rating"), h("div", { class: "s" }, `${rated.length} rated`)),
      best ? h("div", { class: "stat" }, h("div", { class: "n" }, fmt(best.rating)), h("div", { class: "l" }, "top rated"), h("div", { class: "s" }, best.name)) : null),
    h("div", { class: "controls" },
      h("input", { type: "search", placeholder: "Search name, brand or note…", value: state.search, "aria-label": "Search", oninput: (e) => { state.search = e.target.value; drawResults(); } }),
      h("select", { "aria-label": "Sort", onchange: (e) => { state.sort = e.target.value; drawResults(); } },
        [["rating", "Highest rated"], ["name", "Name A-Z"], ["brand", "Brand A-Z"], ["newest", "Newest first"]].map(([v, t]) => h("option", { value: v, selected: state.sort === v }, t))),
      h("select", { "aria-label": "Brand", onchange: (e) => { state.brand = e.target.value; drawResults(); } },
        h("option", { value: "" }, "All brands"), brands.map((b) => h("option", { value: b, selected: state.brand === b }, b)))),
    chipHost,
    countEl,
    results,
  ];
}

/* ---------- Wear today ---------- */
function viewWear() {
  const { collection } = state.data;
  const counts = occasionCounts(collection);
  const occs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const out = h("div", {});
  const chipHost = h("div", {});

  function draw() {
    chipHost.replaceChildren(chipRow(occs, state.wearOccasions, (o) => {
      state.wearOccasions.has(o) ? state.wearOccasions.delete(o) : state.wearOccasions.add(o);
      draw();
    }));
    out.replaceChildren();
    if (!state.wearOccasions.size) {
      out.append(h("p", { class: "empty" }, "Pick one or more occasions to see your best match."));
      return;
    }
    const sel = [...state.wearOccasions];
    let matches = collection.filter((p) => sel.every((o) => p.occasions.includes(o)))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    let fallback = false;
    if (!matches.length) {
      fallback = true;
      matches = ratedOnly(collection).sort((a, b) => b.rating - a.rating || b.occasions.length - a.occasions.length);
    }
    out.append(...[
      h("p", { class: "count" }, fallback ? "Nothing is tagged for that exact combination." : `${matches.length} match${matches.length === 1 ? "" : "es"} for ${sel.join(" + ")}`),
      fallback ? h("p", { class: "note-box" }, "Showing your highest-rated versatile bottles instead.") : null,
      perfumeCard(matches[0], { big: true, eyebrow: fallback ? "Closest fit" : "Top pick" }),
      h("div", { class: "cards" }, matches.slice(1, 4).map((p) => perfumeCard(p))),
    ].filter(Boolean));
  }
  draw();
  return [
    h("h1", {}, "What should I wear?"),
    h("p", { class: "lede" }, "Choose an occasion and get a ranked pick from your own shelf. Choosing several narrows it down."),
    chipHost, out,
  ];
}

/* ---------- Wishlist ---------- */
function viewWishlist() {
  const order = { High: 0, Medium: 1, Low: 2 };
  const list = [...state.data.wishlist].sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
  return [
    h("h1", {}, "Wishlist"),
    h("p", { class: "lede" }, "Perfumes you want but don't own yet."),
    list.length ? h("div", { class: "cards" }, list.map((p) =>
      h("article", { class: "card" },
        h("div", { class: "card-head" },
          h("div", {}, h("h3", { class: "card-name" }, p.name), h("p", { class: "card-brand" }, p.brand)),
          p.priority ? h("span", { class: "pill " + p.priority.toLowerCase() }, p.priority) : null),
        p.why ? h("p", { class: "why" }, p.why) : null,
        p.notes ? h("details", { class: "notes" }, h("summary", {}, "Notes"), h("p", {}, p.notes)) : null)))
      : h("p", { class: "empty" }, "Your wishlist is empty."),
  ];
}

/* ---------- Videos ---------- */
function docList(items, kind) {
  return items.length ? h("ul", { class: "doc-list" }, items.map((d) =>
    h("li", {}, h("a", { href: `#/videos/${kind}/${encodeURIComponent(d.file)}` }, h("span", {}, d.title), h("span", { class: "date" }, d.date))))) : h("p", { class: "empty" }, "Nothing here yet.");
}

function viewVideos(parts) {
  if (parts.length === 2) {
    const [kind, file] = parts;
    const doc = (state.data[kind] || []).find((d) => d.file === decodeURIComponent(file));
    if (!doc) return [h("a", { class: "back", href: "#/videos" }, "← Videos"), h("p", { class: "empty" }, "That document wasn't found.")];
    const body = h("div", { class: "doc" });
    body.innerHTML = doc.html;
    return [h("a", { class: "back", href: "#/videos" }, "← Videos"), h("h1", {}, doc.title), h("p", { class: "lede" }, doc.date), body];
  }
  return [
    h("h1", {}, "Videos"),
    h("p", { class: "lede" }, "Scripts and trend research saved from your sessions."),
    h("h2", {}, "Scripts"), docList(state.data.content, "content"),
    h("h2", {}, "Trend research"), docList(state.data.research, "research"),
  ];
}

/* ---------- Insights ---------- */
function viewInsights() {
  const { collection, preferences } = state.data;
  const rated = ratedOnly(collection);
  const buckets = {};
  for (let i = 1; i <= 10; i++) buckets[i] = 0;
  for (const p of rated) buckets[Math.floor(p.rating)]++;
  const keys = Object.keys(buckets).map(Number).filter((k) => k >= Math.min(...rated.map((p) => Math.floor(p.rating))));
  const max = Math.max(...keys.map((k) => buckets[k]), 1);

  const byBrand = {};
  for (const p of collection) (byBrand[p.brand] ||= []).push(p);
  const brandRows = Object.entries(byBrand)
    .map(([brand, ps]) => ({ brand, n: ps.length, r: ratedOnly(ps) }))
    .map((b) => ({ ...b, avg: avg(b.r) }))
    .sort((a, b) => b.n - a.n || b.avg - a.avg);

  const counts = occasionCounts(collection);
  const unrated = collection.filter((p) => p.rating == null);
  const untagged = collection.filter((p) => !p.occasions.length);

  return [
    h("h1", {}, "Insights"),
    h("p", { class: "lede" }, "How your collection and ratings are shaped."),
    h("h2", {}, "Rating distribution"),
    h("div", { class: "hist", role: "img", "aria-label": "Number of perfumes per rating" },
      keys.map((k) => h("div", { class: "col" }, h("b", {}, buckets[k] || ""), h("i", { style: `height:${(buckets[k] / max) * 100}%` })))),
    h("div", { class: "hist-axis" }, keys.map((k) => h("span", {}, k === 10 ? "10" : `${k}+`))),
    h("h2", {}, "By brand"),
    h("div", { class: "table-scroll" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, "Brand"), h("th", {}, "Bottles"), h("th", {}, "Avg rating"))),
      h("tbody", {}, brandRows.map((b) => h("tr", {}, h("td", {}, b.brand), h("td", { class: "num" }, b.n), h("td", { class: "num" }, b.r.length ? fmt(Math.round(b.avg * 10) / 10) : "—")))))),
    h("h2", {}, "Occasion coverage"),
    h("div", { class: "table-scroll" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, "Occasion"), h("th", {}, "Bottles"))),
      h("tbody", {}, Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([o, n]) => h("tr", {}, h("td", {}, o), h("td", { class: "num" }, n)))))),
    unrated.length || untagged.length ? h("h2", {}, "Still to fill in") : null,
    unrated.length ? h("p", {}, h("strong", {}, "Not rated: "), unrated.map((p) => p.name).join(", ")) : null,
    untagged.length ? h("p", {}, h("strong", {}, "No occasions: "), untagged.map((p) => p.name).join(", ")) : null,
    preferences.length ? h("h2", {}, "Your stated preferences") : null,
    preferences.length ? h("ul", {}, preferences.map((p) => h("li", {}, h("strong", {}, p.label + ": "), p.value))) : null,
  ];
}

/* ---------- Router ---------- */
const routes = { collection: viewCollection, wear: viewWear, wishlist: viewWishlist, videos: viewVideos, insights: viewInsights };

function route() {
  if (!state.data) return;
  const [name = "collection", ...rest] = location.hash.replace(/^#\/?/, "").split("/");
  const key = routes[name] ? name : "collection";
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.route === key));
  view.replaceChildren(...routes[key](rest));
  window.scrollTo(0, 0);
}

async function init() {
  try {
    const res = await fetch("data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    state.data = await res.json();
  } catch (e) {
    view.replaceChildren(h("p", { class: "empty" }, "Couldn't load your data. Check your connection and reload."));
    return;
  }
  document.getElementById("footMeta").textContent = `${state.data.collection.length} perfumes · ${state.data.handle}`;
  window.addEventListener("hashchange", route);
  route();
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
init();
