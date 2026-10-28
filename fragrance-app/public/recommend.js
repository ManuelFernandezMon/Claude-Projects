"use strict";
// Offline keyword-based recommender: turns a free-text occasion (English or Spanish)
// plus your own tags/ratings/notes into a ranked list. No network, no AI model.
(function (root) {
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // A trailing * means "starts with"; otherwise the whole word must match.
  const OCCASION_WORDS = {
    "Date night": ["date", "romantic", "romance", "dinner", "anniversary", "valentine", "cita", "romantic*", "romantica*", "cena", "aniversario", "enamora*"],
    "Evening": ["night", "evening", "bar", "club", "brewery", "pub", "drinks", "concert", "party", "cervecer*", "noche", "fiesta", "antro", "tragos", "concierto", "rumba", "discoteca"],
    "Special occasion": ["wedding", "birthday", "party", "celebration", "graduation", "event", "gala", "formal", "boda", "cumple*", "graduacion", "fiesta", "celebracion", "evento", "quincea*"],
    "Office": ["work", "office", "interview", "meeting", "job", "class", "school", "university", "oficina", "trabajo", "entrevista", "reunion", "clase", "colegio", "universidad"],
    "Everyday": ["casual", "errand*", "daily", "everyday", "shopping", "mall", "lunch", "brunch", "diario", "cotidiano", "compras", "almuerzo"],
    "Summer": ["hot", "summer", "sunny", "humid", "heat", "calor", "verano", "soleado", "humedo", "caluroso"],
    "Winter": ["cold", "winter", "chilly", "frio", "invierno", "fria"],
    "Beach": ["beach", "pool", "vacation", "island", "resort", "playa", "piscina", "vacaciones", "isla"],
    "Gym": ["gym", "workout", "sport*", "training", "gimnasio", "ejercicio", "deporte", "entrenar", "entrenamiento"],
  };
  const VIBE_WORDS = {
    fresh: ["fresh", "clean", "light", "refreshing", "crisp", "fresco", "ligero", "limpio", "refrescante"],
    sweet: ["sweet", "dessert", "gourmand", "cozy", "sugary", "dulce", "golosina"],
    bold: ["strong", "loud", "bold", "statement", "compliments", "intense", "fuerte", "intenso", "llamativo", "impactante", "piropos"],
    subtle: ["subtle", "soft", "discreet", "quiet", "sutil", "suave", "discreto"],
  };
  const HOT_WORDS = ["hot", "humid", "heat", "calor", "caluroso", "humedo", "sunny", "soleado"];
  const DAY_WORDS = ["day", "daytime", "morning", "afternoon", "brunch", "lunch", "daily"];
  const NIGHT_WORDS = ["night", "evening", "noche", "bar", "club", "party", "fiesta", "dinner", "cena", "late"];

  const FRESH_NOTES = ["citrus", "bergamot", "lemon", "lime", "grapefruit", "mandarin", "orange", "citron", "yuzu", "pomelo", "marine", "aquatic", "sea notes", "ozonic", "salt", "mint", "green", "melon", "pineapple", "apple", "cucumber", "tea", "aquozone", "watermelon", "coconut", "ginger", "rhubarb", "mango", "blueberry", "grass", "basil"];
  const HEAVY_NOTES = ["oud", "agarwood", "tobacco", "leather", "cinnamon", "caramel", "praline", "honey", "cacao", "cocoa", "coffee", "incense", "myrrh", "rum", "cognac", "dates", "chocolate", "toffee", "labdanum", "benzoin", "amber", "smoke", "suede"];
  const SWEET_NOTES = ["vanilla", "caramel", "praline", "honey", "tonka", "sugar", "cacao", "chocolate", "toffee", "milk", "brulee", "marshmallow", "cream", "rum", "candy"];

  function matcher(word) {
    return word.endsWith("*")
      ? new RegExp("(^|[^a-z])" + word.slice(0, -1))
      : new RegExp("(^|[^a-z])" + word + "([^a-z]|$)");
  }
  const anyWord = (text, words) => words.some((w) => matcher(w).test(text));
  const hits = (notes, list) => list.filter((n) => notes.includes(n));

  function parse(text, selectedTags) {
    const t = norm(text || "");
    const tags = new Set(selectedTags || []);
    for (const [tag, words] of Object.entries(OCCASION_WORDS)) if (anyWord(t, words)) tags.add(tag);
    const vibes = Object.entries(VIBE_WORDS).filter(([, w]) => anyWord(t, w)).map(([v]) => v);
    const hot = anyWord(t, HOT_WORDS) || tags.has("Summer") || tags.has("Beach");
    const night = anyWord(t, NIGHT_WORDS) || tags.has("Evening") || tags.has("Date night");
    const day = anyWord(t, DAY_WORDS);
    return { tags: [...tags], vibes, hot, night, day, understood: tags.size > 0 || vibes.length > 0 || hot || night || day };
  }

  function score(p, ctx, opts) {
    const notes = norm(p.notes || "");
    const fresh = hits(notes, FRESH_NOTES);
    const heavy = hits(notes, HEAVY_NOTES);
    const sweet = hits(notes, SWEET_NOTES);
    const rating = p.rating == null ? 6.5 : p.rating;
    const reasons = [];
    let s = rating * 0.5;

    const matched = ctx.tags.filter((tag) => (p.occasions || []).includes(tag));
    s += matched.length * 3;
    if (ctx.tags.length) {
      if (matched.length === ctx.tags.length) s += 2;
      if (!matched.length) s -= 2;
    }
    if (matched.length) reasons.push(`Tagged for ${matched.join(" + ")}`);
    else if (ctx.tags.length) reasons.push("Not tagged for this occasion, picked on its notes");
    if (p.rating != null) reasons.push(`You rated it ${p.rating}/10`);
    else reasons.push("Not rated yet");

    if (ctx.vibes.includes("fresh")) { s += fresh.length * 0.8 - heavy.length * 0.6; }
    if (ctx.vibes.includes("sweet")) { s += sweet.length * 0.8; }
    if (ctx.vibes.includes("bold")) { s += heavy.length * 0.5 + (rating >= 9 ? 1 : 0); }
    if (ctx.vibes.includes("subtle")) { s -= heavy.length * 0.6; }
    const heat = ctx.hot ? 1 : opts && opts.warmClimate ? 0.4 : 0;
    if (heat) {
      s += (fresh.length * 0.6 - heavy.length * 0.6) * heat;
      if (ctx.hot && fresh.length) reasons.push(`Fresh notes for the heat: ${fresh.slice(0, 3).join(", ")}`);
      else if (ctx.hot && heavy.length > 2) reasons.push("Heavy notes, may feel thick in the heat");
    }
    if (ctx.night && !ctx.day) {
      s += heavy.length * 0.2 + sweet.length * 0.2;
      if (sweet.length) reasons.push(`Warm, sweet notes for night: ${sweet.slice(0, 3).join(", ")}`);
    }
    if (ctx.day && !ctx.night) s -= heavy.length * 0.5;
    if (ctx.vibes.includes("fresh") && !ctx.hot && fresh.length) reasons.push(`Fresh notes: ${fresh.slice(0, 3).join(", ")}`);
    return { perfume: p, score: s, reasons };
  }

  function recommend(collection, text, selectedTags, limit, opts) {
    const ctx = parse(text, selectedTags);
    const ranked = collection.map((p) => score(p, ctx, opts)).sort((a, b) => b.score - a.score);
    return { ctx, results: ranked.slice(0, limit || 5) };
  }

  const api = { parse, score, recommend, OCCASION_WORDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Recommender = api;
})(typeof window !== "undefined" ? window : globalThis);
