"use strict";
// Optional "Ask AI" for the Recommend tab, using the user's own free Gemini API key.
// The key and model are stored only on this device (never in backups) and requests go straight
// from the phone to Google. Model names change often, so the model is looked up with the key.
(function (root) {
  const API = "https://generativelanguage.googleapis.com/v1beta";
  const KEY = "perfumeApp.geminiKey";
  const MODEL = "perfumeApp.geminiModel";
  const get = (k) => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const set = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { /* ignore */ } };

  class AiError extends Error {
    constructor(kind, message) { super(message); this.kind = kind; }
  }

  async function call(path, key, body) {
    let res;
    try {
      res = await fetch(`${API}/${path}`, {
        method: body ? "POST" : "GET",
        headers: { "x-goog-api-key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) { throw new AiError("offline", "Couldn't reach Gemini. Check your connection."); }
    if (res.ok) return res.json();
    const detail = await res.json().then((j) => j.error && j.error.message).catch(() => "");
    if (res.status === 429) throw new AiError("quota", "Free limit reached for now. Try again in a minute, or use the keyword picks.");
    if (res.status === 400 || res.status === 401 || res.status === 403) throw new AiError("key", detail || "Gemini rejected the key. Check it in AI settings.");
    if (res.status === 404) throw new AiError("model", detail || "That model isn't available.");
    throw new AiError("other", detail || `Gemini error ${res.status}`);
  }

  // Newest plain Flash model that can generate text; skip lite/preview/image/tts variants when possible.
  function pickModel(models) {
    const ok = models
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/(image|tts|live|audio|thinking|exp|robotics|computer)/.test(n));
    const version = (n) => parseFloat(/^gemini-([\d.]+)/.exec(n)[1]);
    const rank = (n) => version(n) * 10 - (/lite/.test(n) ? 3 : 0) - (/preview/.test(n) ? 1 : 0) - (/-\d{3}$/.test(n) ? 1 : 0);
    return ok.sort((a, b) => rank(b) - rank(a))[0] || "";
  }

  async function resolveModel(key, force) {
    const saved = get(MODEL);
    if (saved && !force) return saved;
    const list = await call("models?pageSize=200", key);
    const m = pickModel(list.models || []);
    if (!m) throw new AiError("model", "No Gemini Flash model is available for this key. Enter a model name in AI settings.");
    set(MODEL, m);
    return m;
  }

  function buildPrompt(collection, text, tags, warm) {
    const lines = collection.map((p) => `- ${p.name} (${p.brand}) | rating ${p.rating == null ? "unrated" : p.rating + "/10"} | occasions: ${(p.occasions || []).join(", ") || "none"} | notes: ${p.notes || "unknown"}`);
    return [
      "You are a friendly fragrance stylist. Pick perfumes ONLY from the owner's collection below.",
      "Weigh the occasion, weather, dress code and vibe, the owner's own ratings and occasion tags, and the notes (fresh/citrus/aquatic for heat, warm/sweet/spicy for evenings and cold).",
      warm ? "The owner lives somewhere hot and humid (Panama), so lean fresher unless the occasion clearly calls for something heavy." : "",
      "Return the best 3 picks, best first, each with a one or two sentence reason that mentions specific notes or ratings. Also give one short styling tip (how many sprays, where) in tip.",
      "Write the reasons in the same language as the occasion text. Use the exact perfume names from the list.",
      'Reply as JSON: {"picks":[{"name":"...","why":"..."}],"tip":"..."}',
      "",
      `Occasion: ${text || "(none given)"}`,
      tags.length ? `Selected tags: ${tags.join(", ")}` : "",
      "",
      "Collection:",
      ...lines,
    ].filter((l) => l !== "").join("\n");
  }

  async function ask({ collection, text, tags, warm }) {
    const key = get(KEY);
    if (!key) throw new AiError("nokey", "Add your free Gemini key first.");
    const body = { contents: [{ parts: [{ text: buildPrompt(collection, text, tags || [], warm) }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } };
    let model = await resolveModel(key);
    let out;
    try { out = await call(`models/${model}:generateContent`, key, body); }
    catch (e) {
      if (e.kind !== "model") throw e;
      model = await resolveModel(key, true);
      out = await call(`models/${model}:generateContent`, key, body);
    }
    const raw = out.candidates && out.candidates[0] && out.candidates[0].content && out.candidates[0].content.parts
      ? out.candidates[0].content.parts.map((p) => p.text || "").join("") : "";
    let data;
    try { data = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim()); }
    catch (e) { throw new AiError("other", "The AI's answer wasn't readable. Try again."); }
    const byName = new Map(collection.map((p) => [p.name.toLowerCase(), p]));
    const picks = (data.picks || [])
      .map((x) => ({ perfume: byName.get(String(x.name || "").toLowerCase().trim()), why: String(x.why || "") }))
      .filter((x) => x.perfume);
    if (!picks.length) throw new AiError("other", "The AI didn't pick anything from your collection. Try rewording.");
    return { picks, tip: String(data.tip || ""), model };
  }

  root.GeminiAI = {
    ask, AiError,
    hasKey: () => !!get(KEY),
    getKey: () => get(KEY),
    getModel: () => get(MODEL),
    save: (key, model) => { set(KEY, key.trim()); set(MODEL, model.trim()); },
    clear: () => { set(KEY, ""); set(MODEL, ""); },
    pickModel,
  };
})(typeof window !== "undefined" ? window : globalThis);
