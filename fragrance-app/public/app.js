"use strict";

const view = document.getElementById("view");
const dlg = document.getElementById("dlg");
const STORE_KEY = "perfumeApp.v1";
const OCCASIONS = ["Everyday", "Office", "Evening", "Date night", "Special occasion", "Summer", "Winter", "Beach", "Gym"];
const IDEA_STATUSES = ["Idea", "Scripted", "Filmed", "Posted"];

const state = {
  seed: null,
  db: null,
  search: "",
  sort: "rating",
  brand: "",
  occasions: new Set(),
  recText: "",
  recTags: new Set(),
  recResult: null,
  recAi: null,
  recNote: "",
};

/* ---------- helpers ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(16).slice(2));
const fmt = (n) => (n == null ? "" : n.toFixed(1).replace(/\.0$/, ""));
const ratedOnly = (list) => list.filter((p) => p.rating != null);
const avg = (list) => (list.length ? list.reduce((s, p) => s + p.rating, 0) / list.length : 0);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\n+/g, " ").trim();

/* ---------- data layer (stored on this device) ---------- */
function seedDb(seed) {
  return {
    version: 1,
    collection: seed.collection.map((p) => ({ id: uid(), ...p })),
    wishlist: seed.wishlist.map((w) => ({ id: uid(), ...w })),
    ideas: [],
    meta: { lastBackup: null, warmClimate: true },
  };
}
function loadDb(seed) {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d && Array.isArray(d.collection) && Array.isArray(d.wishlist)) {
      d.ideas = d.ideas || [];
      d.meta = { lastBackup: null, warmClimate: true, ...(d.meta || {}) };
      return d;
    }
  } catch (e) { /* fall through to seed */ }
  return seedDb(seed);
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.db)); }
  catch (e) { alert("Couldn't save to this device (storage full or blocked). Copy a backup from the More tab."); }
}
function commit() { save(); renderCurrent(); }

/* ---------- shared UI pieces ---------- */
function ratingEl(p) {
  if (p.rating == null) return h("span", { class: "pill" }, "not rated");
  return h("div", { class: "rating" },
    h("span", { class: "num" }, fmt(p.rating)),
    h("span", { class: "bar", title: `${fmt(p.rating)} / 10` }, h("i", { style: `width:${p.rating * 10}%` })));
}
const tagsEl = (list) => (list.length ? h("div", { class: "tags" }, list.map((o) => h("span", { class: "tag" }, o))) : null);
const btn = (label, cls, onclick, attrs, ico) => h("button", { type: "button", class: "btn " + (cls || ""), onclick, ...(attrs || {}) }, ico ? icon(ico, 16) : null, label);

function perfumeCard(p, opts = {}) {
  return h("article", { class: "card" + (opts.big ? " top-pick" : "") },
    opts.eyebrow ? h("p", { class: "eyebrow" }, opts.eyebrow) : null,
    h("div", { class: "card-head" },
      h("div", {}, h("h3", { class: "card-name" }, p.name), h("p", { class: "card-brand" }, p.brand + (p.purchased ? ` · ${p.purchased}` : ""))),
      ratingEl(p)),
    tagsEl(p.occasions || []),
    opts.reasons ? h("ul", { class: "reasons" }, opts.reasons.map((r) => h("li", {}, r))) : null,
    p.notes ? h("details", { class: "notes", open: opts.big }, h("summary", {}, "Notes"), h("p", {}, p.notes)) : null,
    opts.edit ? h("div", { class: "card-actions" }, btn("Edit", "small", () => editPerfume(p), null, "pencil-simple")) : null);
}

function chipRow(options, selected, onToggle, counts) {
  return h("div", { class: "chips" }, options.map((o) =>
    h("button", { type: "button", class: "chip" + (selected.has(o) ? " active" : ""), "aria-pressed": String(selected.has(o)), onclick: () => onToggle(o) },
      o + (counts ? ` ${counts[o] || 0}` : ""))));
}
function occasionCounts(list) {
  const counts = {};
  for (const p of list) for (const o of p.occasions || []) counts[o] = (counts[o] || 0) + 1;
  return counts;
}
const pageHead = (title, lede, action) =>
  h("div", { class: "page-head" }, h("div", {}, h("h1", {}, title), lede ? h("p", { class: "lede" }, lede) : null), action || null);

/* ---------- modal forms ---------- */
function openModal(title, bodyEls, { onSave, saveLabel = "Save", onDelete, extra } = {}) {
  let armed = false;
  const del = onDelete
    ? h("button", { type: "button", class: "btn danger", onclick: (e) => {
        if (!armed) { armed = true; e.target.textContent = "Tap again to delete"; return; }
        dlg.close(); onDelete();
      } }, "Delete")
    : null;
  const form = h("form", { class: "dlg-form", onsubmit: (e) => {
    e.preventDefault();
    if (onSave() !== false) dlg.close();
  } },
    h("h2", {}, title),
    bodyEls,
    h("div", { class: "dlg-actions" },
      del,
      h("span", { class: "grow" }),
      extra || null,
      h("button", { type: "button", class: "btn", onclick: () => dlg.close() }, "Cancel"),
      h("button", { type: "submit", class: "btn primary" }, saveLabel)));
  dlg.replaceChildren(form);
  dlg.showModal();
}
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

const field = (label, input, hint) => h("label", { class: "field" }, h("span", { class: "field-label" }, label), input, hint ? h("span", { class: "hint" }, hint) : null);
const textInput = (value, attrs) => h("input", { type: "text", value: value || "", autocomplete: "off", ...(attrs || {}) });

function perfumeForm(p, { title, onSave, onDelete, extra }) {
  const draft = { occasions: new Set(p.occasions || []) };
  const name = textInput(p.name, { required: true, placeholder: "e.g. Khamrah" });
  const brand = textInput(p.brand, { required: true, placeholder: "e.g. Lattafa" });
  const notes = h("textarea", { rows: "3", placeholder: "Top: …; Middle: …; Base: …" }, p.notes || "");
  const purchased = textInput(p.purchased, { placeholder: "e.g. 2026-09" });
  const rating = h("input", { type: "range", min: "0", max: "10", step: "0.5", value: String(p.rating ?? 0), class: "rating-slider" });
  const ratingLabel = h("span", { class: "rating-value" });
  const syncRating = () => { const v = parseFloat(rating.value); ratingLabel.textContent = v > 0 ? `${fmt(v)} / 10` : "not rated"; ratingLabel.classList.toggle("is-set", v > 0); };
  rating.addEventListener("input", syncRating); syncRating();

  const known = [...new Set([...OCCASIONS, ...state.db.collection.flatMap((x) => x.occasions || []), ...draft.occasions])];
  const chipHost = h("div", {});
  const drawChips = () => chipHost.replaceChildren(chipRow(known, draft.occasions, (o) => {
    draft.occasions.has(o) ? draft.occasions.delete(o) : draft.occasions.add(o); drawChips();
  }));
  drawChips();
  const custom = textInput("", { placeholder: "Add another occasion…" });
  const addCustom = () => {
    const v = custom.value.trim();
    if (!v) return;
    if (!known.includes(v)) known.push(v);
    draft.occasions.add(v); custom.value = ""; drawChips();
  };
  custom.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } });

  openModal(title, [
    field("Name", name), field("Brand", brand), field("Notes / accords", notes),
    field("Purchased", purchased),
    field("Rating", h("div", { class: "rating-row" }, rating, ratingLabel), "Slide to 0 to mark it unrated."),
    h("div", { class: "field" }, h("span", { class: "field-label" }, "Occasions"), chipHost,
      h("div", { class: "inline" }, custom, btn("Add", "small", addCustom))),
  ], {
    onDelete, extra,
    onSave: () => {
      addCustom();
      const r = parseFloat(rating.value);
      return onSave({
        name: name.value.trim(), brand: brand.value.trim(), notes: notes.value.trim(), purchased: purchased.value.trim(),
        rating: r > 0 ? r : null, occasions: [...draft.occasions],
      });
    },
  });
}

function addPerfume() {
  perfumeForm({ purchased: thisMonth() }, {
    title: "Add a perfume",
    onSave: (p) => { state.db.collection.push({ id: uid(), ...p }); commit(); },
  });
}
function editPerfume(p) {
  perfumeForm(p, {
    title: "Edit perfume",
    onSave: (next) => { Object.assign(p, next); commit(); },
    onDelete: () => { state.db.collection = state.db.collection.filter((x) => x.id !== p.id); commit(); },
  });
}

function wishlistForm(w, { title, onSave, onDelete, extra }) {
  const name = textInput(w.name, { required: true });
  const brand = textInput(w.brand, { required: true });
  const notes = h("textarea", { rows: "3" }, w.notes || "");
  const why = h("textarea", { rows: "2", placeholder: "Why do you want it?" }, w.why || "");
  const priority = h("select", {}, ["High", "Medium", "Low"].map((x) => h("option", { value: x, selected: (w.priority || "Medium") === x }, x)));
  openModal(title, [field("Name", name), field("Brand", brand), field("Notes / accords", notes), field("Why it's on the list", why), field("Priority", priority)], {
    onDelete, extra,
    onSave: () => onSave({ name: name.value.trim(), brand: brand.value.trim(), notes: notes.value.trim(), why: why.value.trim(), priority: priority.value }),
  });
}
function addWish() {
  wishlistForm({ priority: "Medium" }, { title: "Add to wishlist", onSave: (w) => { state.db.wishlist.push({ id: uid(), ...w }); commit(); } });
}
function editWish(w) {
  const bought = btn("Bought it", "", () => {
    dlg.close();
    perfumeForm({ name: w.name, brand: w.brand, notes: w.notes, purchased: thisMonth() }, {
      title: "Move to collection",
      onSave: (p) => {
        state.db.collection.push({ id: uid(), ...p });
        state.db.wishlist = state.db.wishlist.filter((x) => x.id !== w.id);
        commit();
      },
    });
  });
  wishlistForm(w, {
    title: "Edit wishlist item", extra: bought,
    onSave: (next) => { Object.assign(w, next); commit(); },
    onDelete: () => { state.db.wishlist = state.db.wishlist.filter((x) => x.id !== w.id); commit(); },
  });
}

function ideaForm(i, { title, onSave, onDelete }) {
  const t = textInput(i.title, { required: true, placeholder: "e.g. Naughty Dates vs Khamrah" });
  const body = h("textarea", { rows: "5", placeholder: "Hook, notes, shots…" }, i.body || "");
  const status = h("select", {}, IDEA_STATUSES.map((x) => h("option", { value: x, selected: (i.status || "Idea") === x }, x)));
  const perfume = h("select", {}, h("option", { value: "" }, "None"),
    [...state.db.collection].sort((a, b) => a.name.localeCompare(b.name)).map((p) => h("option", { value: p.name, selected: i.perfume === p.name }, p.name)));
  openModal(title, [field("Title", t), field("Details", body), field("Status", status), field("Perfume", perfume)], {
    onDelete,
    onSave: () => onSave({ title: t.value.trim(), body: body.value.trim(), status: status.value, perfume: perfume.value }),
  });
}
function addIdea() { ideaForm({}, { title: "New video idea", onSave: (i) => { state.db.ideas.unshift({ id: uid(), created: new Date().toISOString().slice(0, 10), ...i }); commit(); } }); }
function editIdea(i) {
  ideaForm(i, {
    title: "Edit video idea",
    onSave: (next) => { Object.assign(i, next); commit(); },
    onDelete: () => { state.db.ideas = state.db.ideas.filter((x) => x.id !== i.id); commit(); },
  });
}

/* ---------- views ---------- */
const sorters = {
  rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  brand: (a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name),
  newest: (a, b) => (b.purchased || "").localeCompare(a.purchased || "") || a.name.localeCompare(b.name),
};

function viewCollection() {
  const { collection } = state.db;
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
      .filter((p) => (!q || `${p.name} ${p.brand} ${p.notes}`.toLowerCase().includes(q)) &&
        (!state.brand || p.brand === state.brand) &&
        [...state.occasions].every((o) => (p.occasions || []).includes(o)))
      .sort(sorters[state.sort]);
    countEl.textContent = `${list.length} of ${collection.length} perfumes`;
    results.replaceChildren(...(list.length ? list.map((p) => perfumeCard(p, { edit: true })) : [h("p", { class: "empty" }, "No perfumes match those filters.")]));
  }
  function drawChips() {
    chipHost.replaceChildren(chipRow(occs, state.occasions, (o) => {
      state.occasions.has(o) ? state.occasions.delete(o) : state.occasions.add(o);
      drawChips(); drawResults();
    }, counts));
  }
  drawChips(); drawResults();

  return [
    pageHead("Collection", "Everything you own. Tap Edit on any card to change it.", btn("Add perfume", "primary", addPerfume, null, "plus")),
    h("div", { class: "stats" },
      h("div", { class: "stat" }, h("div", { class: "n" }, collection.length), h("div", { class: "l" }, "perfumes")),
      h("div", { class: "stat" }, h("div", { class: "n" }, fmt(Math.round(avg(rated) * 10) / 10) || "–"), h("div", { class: "l" }, "average rating"), h("div", { class: "s" }, `${rated.length} rated`)),
      best ? h("div", { class: "stat" }, h("div", { class: "n" }, fmt(best.rating)), h("div", { class: "l" }, "top rated"), h("div", { class: "s" }, best.name)) : null),
    h("div", { class: "controls" },
      h("input", { type: "search", placeholder: "Search name, brand or note…", value: state.search, "aria-label": "Search", oninput: (e) => { state.search = e.target.value; drawResults(); } }),
      h("select", { "aria-label": "Sort", onchange: (e) => { state.sort = e.target.value; drawResults(); } },
        [["rating", "Highest rated"], ["name", "Name A-Z"], ["brand", "Brand A-Z"], ["newest", "Newest first"]].map(([v, t]) => h("option", { value: v, selected: state.sort === v }, t))),
      h("select", { "aria-label": "Brand", onchange: (e) => { state.brand = e.target.value; drawResults(); } },
        h("option", { value: "" }, "All brands"), brands.map((b) => h("option", { value: b, selected: state.brand === b }, b)))),
    chipHost, countEl, results,
  ];
}

function openAiSettings(onSaved) {
  const key = textInput(GeminiAI.getKey(), { type: "password", placeholder: "Paste your Gemini API key", autocomplete: "off", spellcheck: "false" });
  const model = textInput(GeminiAI.getModel(), { placeholder: "Leave empty to pick automatically" });
  const remove = btn("Remove key", "danger", () => { GeminiAI.clear(); dlg.close(); renderCurrent(); });
  openModal("AI settings", [
    h("p", { class: "hint" }, "Ask AI uses Google Gemini with your own free key. Get one in a minute at ",
      h("a", { href: "https://aistudio.google.com/apikey", target: "_blank", rel: "noopener" }, "aistudio.google.com/apikey"), "."),
    field("Gemini API key", key, "Stored only on this device and left out of backups. Anyone with your phone unlocked could read it, so don't reuse a key you care about."),
    field("Model (optional)", model, "The app finds a current Flash model by itself. Only set this if Google renames it."),
    h("p", { class: "hint" }, "When you tap Ask AI, your occasion text and your collection (names, notes, ratings, tags) are sent to Google. The free tier may use prompts to improve Google's models. Nothing else leaves your phone."),
  ], {
    saveLabel: "Save", extra: GeminiAI.hasKey() ? remove : null,
    onSave: () => {
      if (!key.value.trim()) { key.focus(); return false; }
      GeminiAI.save(key.value, model.value);
      if (onSaved) setTimeout(onSaved, 0);
    },
  });
}

function viewRecommend() {
  const { collection, meta } = state.db;
  const counts = occasionCounts(collection);
  const occs = [...new Set([...OCCASIONS, ...Object.keys(counts)])].filter((o) => counts[o]);
  const out = h("div", {});
  const chipHost = h("div", {});
  const input = h("textarea", { rows: "3", placeholder: "Describe where you're going… e.g. “Birthday party at a cervecería at night” or “Entrevista de trabajo, hace calor”", value: state.recText, "aria-label": "Describe the occasion" });
  input.addEventListener("input", () => { state.recText = input.value; });

  async function askAi() {
    if (!GeminiAI.hasKey()) { openAiSettings(askAi); return; }
    state.recText = input.value;
    state.recNote = "";
    out.replaceChildren(h("p", { class: "count" }, "Asking Gemini…"));
    aiBtn.disabled = true;
    try {
      state.recAi = await GeminiAI.ask({ collection, text: state.recText, tags: [...state.recTags], warm: meta.warmClimate });
      state.recResult = null;
      drawOut();
    } catch (e) {
      state.recAi = null;
      state.recResult = Recommender.recommend(collection, state.recText, [...state.recTags], 5, { warmClimate: meta.warmClimate });
      state.recNote = `${e.message} Showing keyword picks instead.`;
      drawOut();
    } finally { aiBtn.disabled = false; }
  }
  function run() {
    state.recAi = null; state.recNote = "";
    state.recText = input.value;
    state.recResult = Recommender.recommend(collection, state.recText, [...state.recTags], 5, { warmClimate: meta.warmClimate });
    drawOut();
  }
  function drawOut() {
    out.replaceChildren();
    if (state.recNote) out.append(h("p", { class: "note-box" }, state.recNote));
    const ai = state.recAi;
    if (ai) {
      out.append(
        h("p", { class: "count" }, `Gemini picks · ${ai.model}`),
        perfumeCard(ai.picks[0].perfume, { big: true, eyebrow: "Top pick", reasons: [ai.picks[0].why] }),
        h("div", { class: "cards" }, ai.picks.slice(1).map((x) => perfumeCard(x.perfume, { reasons: [x.why] }))),
        ai.tip ? h("p", { class: "note-box" }, ai.tip) : null);
      return;
    }
    const r = state.recResult;
    if (!r) return;
    if (!r.ctx.understood) {
      out.append(h("p", { class: "note-box" }, "I couldn't pick out an occasion, place or mood in that. Try words like date, office, party, beach, wedding, gym, hot, cold, fresh or sweet (Spanish works too). Showing your top-rated bottles for now."));
    } else {
      const bits = [...r.ctx.tags, ...r.ctx.vibes, r.ctx.hot ? "hot weather" : null].filter(Boolean);
      out.append(h("p", { class: "count" }, `Matched: ${bits.join(", ")}`));
    }
    out.append(
      perfumeCard(r.results[0].perfume, { big: true, eyebrow: "Top pick", reasons: r.results[0].reasons }),
      h("div", { class: "cards" }, r.results.slice(1).map((x) => perfumeCard(x.perfume, { reasons: x.reasons }))));
  }
  function drawChips() {
    chipHost.replaceChildren(chipRow(occs, state.recTags, (o) => {
      state.recTags.has(o) ? state.recTags.delete(o) : state.recTags.add(o);
      drawChips();
    }));
  }
  drawChips(); drawOut();

  const aiBtn = btn("Ask AI", "", askAi, null, "sparkle");
  const examples = ["Birthday party at a cervecería at night", "Entrevista de trabajo, hace calor", "Día de playa", "Romantic dinner, something sweet"];
  return [
    pageHead("What should I wear?", "Describe the occasion in your own words (English or Spanish), or pick tags. Picks come from your own shelf, ranked by your tags, ratings and notes."),
    input,
    h("div", { class: "chips ex" }, examples.map((x) => h("button", { type: "button", class: "chip", onclick: () => { input.value = x; run(); } }, x))),
    chipHost,
    h("div", { class: "controls" },
      btn("Recommend", "primary", run, null, "magnifying-glass"),
      aiBtn,
      btn("AI settings", "small", () => openAiSettings(), null, "sliders-horizontal"),
      h("label", { class: "check" },
        h("input", { type: "checkbox", checked: meta.warmClimate, onchange: (e) => { meta.warmClimate = e.target.checked; save(); } }),
        " I live somewhere hot (lean fresher)")),
    out,
    h("p", { class: "hint" }, "Recommend runs on your phone using keywords. Ask AI sends your occasion and collection to Gemini (needs your free key and internet)."),
  ];
}

function viewWishlist() {
  const order = { High: 0, Medium: 1, Low: 2 };
  const list = [...state.db.wishlist].sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3) || a.name.localeCompare(b.name));
  return [
    pageHead("Wishlist", "Perfumes you want but don't own yet.", btn("Add to wishlist", "primary", addWish, null, "plus")),
    list.length ? h("div", { class: "cards" }, list.map((p) =>
      h("article", { class: "card" },
        h("div", { class: "card-head" },
          h("div", {}, h("h3", { class: "card-name" }, p.name), h("p", { class: "card-brand" }, p.brand)),
          p.priority ? h("span", { class: "pill " + p.priority.toLowerCase() }, p.priority) : null),
        p.why ? h("p", { class: "why" }, p.why) : null,
        p.notes ? h("details", { class: "notes" }, h("summary", {}, "Notes"), h("p", {}, p.notes)) : null,
        h("div", { class: "card-actions" }, btn("Edit", "small", () => editWish(p)))))) : h("p", { class: "empty" }, "Your wishlist is empty."),
  ];
}

function docList(items, kind) {
  return items.length ? h("ul", { class: "doc-list" }, items.map((d) =>
    h("li", {}, h("a", { href: `#/videos/${kind}/${encodeURIComponent(d.file)}` }, h("span", {}, d.title), h("span", { class: "date" }, d.date))))) : h("p", { class: "empty" }, "Nothing here yet.");
}

function viewVideos(parts) {
  if (parts.length === 2) {
    const [kind, file] = parts;
    const doc = ((state.seed && state.seed[kind]) || []).find((d) => d.file === decodeURIComponent(file));
    if (!doc) return [h("a", { class: "back", href: "#/videos" }, "← Videos"), h("p", { class: "empty" }, "That document wasn't found.")];
    const body = h("div", { class: "doc" });
    body.innerHTML = doc.html;
    return [h("a", { class: "back", href: "#/videos" }, "← Videos"), h("h1", {}, doc.title), h("p", { class: "lede" }, doc.date), body];
  }
  const ideas = state.db.ideas;
  return [
    pageHead("Videos", "Your video ideas, plus the scripts and research saved from Claude sessions.", btn("New idea", "primary", addIdea, null, "plus")),
    h("h2", {}, "Ideas"),
    ideas.length ? IDEA_STATUSES.map((s) => {
      const group = ideas.filter((i) => (i.status || "Idea") === s);
      return group.length ? h("div", {}, h("p", { class: "count" }, `${s} · ${group.length}`),
        h("div", { class: "cards" }, group.map((i) =>
          h("article", { class: "card" },
            h("div", { class: "card-head" }, h("h3", { class: "card-name" }, i.title), h("span", { class: "pill" }, i.created || "")),
            i.perfume ? h("p", { class: "card-brand" }, i.perfume) : null,
            i.body ? h("p", { class: "why pre" }, i.body) : null,
            h("div", { class: "card-actions" }, btn("Edit", "small", () => editIdea(i))))))) : null;
    }) : h("p", { class: "empty" }, "No ideas yet. Tap “New idea” to add one."),
    h("h2", {}, "Scripts"), docList(state.seed.content, "content"),
    h("h2", {}, "Trend research"), docList(state.seed.research, "research"),
  ];
}

/* ---------- More: insights + backup ---------- */
function collectionMarkdown() {
  let md = "| Perfume | Brand | Notes/Accords | Purchased | My Rating (1-10) | Occasion |\n|---|---|---|---|---|---|\n";
  for (const p of state.db.collection) md += `| ${cell(p.name)} | ${cell(p.brand)} | ${cell(p.notes)} | ${cell(p.purchased)} | ${p.rating == null ? "" : fmt(p.rating)} | ${cell((p.occasions || []).join(", "))} |\n`;
  md += "\n\n| Perfume | Brand | Notes/Accords | Why it's on the list | Priority |\n|---|---|---|---|---|\n";
  for (const w of state.db.wishlist) md += `| ${cell(w.name)} | ${cell(w.brand)} | ${cell(w.notes)} | ${cell(w.why)} | ${cell(w.priority)} |\n`;
  if (state.db.ideas.length) {
    md += "\n\n## Video ideas\n";
    for (const i of state.db.ideas) md += `- [${i.status || "Idea"}] ${cell(i.title)}${i.perfume ? ` (${cell(i.perfume)})` : ""}${i.body ? `: ${cell(i.body)}` : ""}\n`;
  }
  return md;
}

async function copyText(text, statusEl, msg) {
  try { await navigator.clipboard.writeText(text); statusEl.textContent = msg; }
  catch (e) {
    const ta = h("textarea", { class: "copybox", readonly: true }, text);
    statusEl.replaceChildren(h("span", {}, "Couldn't copy automatically, select and copy this: "), ta);
    ta.select();
  }
}

function viewMore() {
  const { collection } = state.db;
  const rated = ratedOnly(collection);
  const buckets = {};
  for (let i = 1; i <= 10; i++) buckets[i] = 0;
  for (const p of rated) buckets[Math.floor(p.rating)]++;
  const lo = rated.length ? Math.min(...rated.map((p) => Math.floor(p.rating))) : 1;
  const keys = Object.keys(buckets).map(Number).filter((k) => k >= lo);
  const max = Math.max(...keys.map((k) => buckets[k]), 1);
  const byBrand = {};
  for (const p of collection) (byBrand[p.brand] ||= []).push(p);
  const brandRows = Object.entries(byBrand).map(([brand, ps]) => ({ brand, n: ps.length, r: ratedOnly(ps) }))
    .map((b) => ({ ...b, avg: avg(b.r) })).sort((a, b) => b.n - a.n || b.avg - a.avg);
  const counts = occasionCounts(collection);
  const unrated = collection.filter((p) => p.rating == null);
  const untagged = collection.filter((p) => !(p.occasions || []).length);

  const status = h("p", { class: "hint" });
  const restoreBox = h("textarea", { rows: "4", placeholder: "Paste a backup here to restore it…" });
  const backupInfo = state.db.meta.lastBackup ? `Last backup copied: ${new Date(state.db.meta.lastBackup).toLocaleString()}` : "You haven't copied a backup yet.";

  return [
    pageHead("More", "Insights on your shelf, and backup tools for your data."),
    h("h2", {}, "Backup & sync"),
    h("p", { class: "lede" }, "Your data lives only on this device. Copy a backup now and then, and use the markdown copy to give Claude your latest changes."),
    h("p", { class: "hint" }, backupInfo),
    h("div", { class: "controls" },
      btn("Copy backup (JSON)", "primary", () => { state.db.meta.lastBackup = new Date().toISOString(); save(); copyText(JSON.stringify(state.db), status, "Backup copied. Paste it somewhere safe (notes app, email to yourself)."); }),
      btn("Copy as markdown for Claude", "", () => copyText(collectionMarkdown(), status, "Copied. Paste it into your Claude session and ask it to update your repo files."))),
    status,
    h("div", { class: "field" }, h("span", { class: "field-label" }, "Restore from backup"), restoreBox,
      h("div", { class: "controls" }, btn("Restore", "", () => {
        try {
          const d = JSON.parse(restoreBox.value);
          if (!d || !Array.isArray(d.collection) || !Array.isArray(d.wishlist)) throw new Error("shape");
          state.db = { ideas: [], meta: { lastBackup: null, warmClimate: true }, ...d, version: 1 };
          commit(); alert("Restored.");
        } catch (e) { alert("That doesn't look like a backup from this app."); }
      }), btn("Reset to starter data", "danger", () => {
        if (confirm("Replace everything on this device with the starter data? This can't be undone.")) { state.db = seedDb(state.seed); commit(); }
      }))),

    h("h2", {}, "Rating distribution"),
    rated.length ? [
      h("div", { class: "hist", role: "img", "aria-label": "Number of perfumes per rating" },
        keys.map((k) => h("div", { class: "col" }, h("b", {}, buckets[k] || ""), h("i", { style: `height:${(buckets[k] / max) * 100}%` })))),
      h("div", { class: "hist-axis" }, keys.map((k) => h("span", {}, k === 10 ? "10" : `${k}+`))),
    ] : h("p", { class: "empty" }, "Rate a few perfumes to see this."),
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
  ];
}

/* ---------- router ---------- */
const routes = { collection: viewCollection, recommend: viewRecommend, wishlist: viewWishlist, videos: viewVideos, more: viewMore };
const aliases = { wear: "recommend", insights: "more" };

function renderCurrent(keepScroll = true) {
  if (!state.db) return;
  const [raw = "collection", ...rest] = location.hash.replace(/^#\/?/, "").split("/");
  const name = aliases[raw] || raw;
  const key = routes[name] ? name : "collection";
  document.querySelectorAll("#tabs a").forEach((a) => a.classList.toggle("active", a.dataset.route === key));
  const y = window.scrollY;
  view.replaceChildren(...routes[key](rest).flat().filter(Boolean));
  document.getElementById("footMeta").textContent = `${state.db.collection.length} perfumes · ${state.seed.handle}${state.build ? ` · build ${state.build}` : ""}`;
  window.scrollTo(0, keepScroll ? y : 0);
}

function decorateNav() {
  document.querySelectorAll("#tabs a[data-icon]").forEach((a) => a.prepend(icon(a.dataset.icon, 20)));
}

/* ---------- update banner ---------- */
const REPO = "ManuelFernandezMon/Claude-Projects";
const APK_URL = `https://github.com/${REPO}/releases/download/apk-latest/tufrenperfumero.apk`;
const SKIP_KEY = "perfumeApp.skipBuild";
const bannerHost = document.getElementById("bannerHost");
const isApk = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

function showBanner({ title, sub, action, onDismiss }) {
  const x = h("button", { type: "button", class: "x", "aria-label": "Dismiss", onclick: () => { bannerHost.replaceChildren(); onDismiss && onDismiss(); } }, icon("x", 16));
  bannerHost.replaceChildren(h("div", { class: "banner", role: "status" },
    h("span", { class: "ico-dot" }, icon(action.icon, 20)),
    h("div", { class: "banner-text" }, h("b", {}, title), h("span", {}, sub)),
    action.href
      ? h("a", { class: "btn primary small", href: action.href, target: "_blank", rel: "noopener" }, action.label)
      : btn(action.label, "primary small", action.onclick),
    x));
}

async function checkApkUpdate(build) {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/apk-latest`, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return;
    const rel = await res.json();
    const latest = parseInt((/build\s+(\d+)/i.exec(rel.name || "") || [])[1], 10);
    if (!latest || latest <= build || String(latest) === lsGet(SKIP_KEY)) return;
    showBanner({
      title: "New version available", sub: `Build ${latest} is ready. Your data stays on the phone when you install over this one.`,
      action: { label: "Download", icon: "download-simple", href: APK_URL },
      onDismiss: () => lsSet(SKIP_KEY, String(latest)),
    });
  } catch (e) { /* offline or rate limited: try again next time */ }
}

async function initUpdates() {
  // Web / installed PWA: the service worker swaps in new files by itself; offer a reload.
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      showBanner({ title: "New version ready", sub: "Reload to get the latest changes.", action: { label: "Reload", icon: "arrow-clockwise", onclick: () => location.reload() } });
    });
  }
  // Android app: compare this build with the latest published APK.
  let build = 0;
  try { const r = await fetch("build.json", { cache: "no-cache" }); build = (await r.json()).build || 0; } catch (e) { /* none */ }
  state.build = build;
  if (isApk() && build) {
    checkApkUpdate(build);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) checkApkUpdate(build); });
  }
}

async function init() {
  try {
    const res = await fetch("data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    state.seed = await res.json();
  } catch (e) {
    view.replaceChildren(h("p", { class: "empty" }, "Couldn't load the starter data. Check your connection and reload."));
    return;
  }
  state.db = loadDb(state.seed);
  window.addEventListener("hashchange", () => renderCurrent(false));
  decorateNav();
  renderCurrent(false);
  initUpdates();
}

if ("serviceWorker" in navigator && location.protocol.startsWith("http") && location.hostname !== "localhost") navigator.serviceWorker.register("sw.js").catch(() => {});
init();
