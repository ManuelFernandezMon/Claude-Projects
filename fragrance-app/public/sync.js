"use strict";
// Saves the app's data to a branch of your GitHub repo using your own fine-grained token, so every
// change is reflected on GitHub (app-data.json plus collection.md / wishlist.md in one commit).
// The token lives only in this device's localStorage and is never part of backups or commits.
(function (root) {
  const LS = "perfumeApp.sync";
  const DEFAULTS = { token: "", repo: "ManuelFernandezMon/Claude-Projects", branch: "app-data", auto: true, lastSyncId: "", dirty: false, lastAt: "", state: "off", error: "" };
  const listeners = new Set();
  let cfg = { ...DEFAULTS };
  let timer = null;
  let running = false;
  let again = false;
  let getSnapshot = null;

  try { cfg = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) || "{}") }; } catch (e) { /* defaults */ }
  const persist = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };
  const emit = () => listeners.forEach((fn) => fn(info()));
  function set(patch) { cfg = { ...cfg, ...patch }; persist(); emit(); }
  const info = () => ({ connected: !!cfg.token, repo: cfg.repo, branch: cfg.branch, auto: cfg.auto, state: cfg.state, error: cfg.error, lastAt: cfg.lastAt, dirty: cfg.dirty });

  class SyncError extends Error { constructor(kind, msg) { super(msg); this.kind = kind; } }

  async function api(path, opts = {}) {
    let res;
    try {
      res = await fetch(`https://api.github.com/${path}`, {
        method: opts.method || "GET",
        headers: { Authorization: `Bearer ${cfg.token}`, Accept: opts.accept || "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
    } catch (e) { throw new SyncError("offline", "Can't reach GitHub right now."); }
    if (res.status === 404 && opts.allow404) return null;
    if (res.status === 401) throw new SyncError("auth", "GitHub rejected the token. Reconnect with a new one.");
    if (res.status === 403 || res.status === 404) throw new SyncError("auth", "The token can't write to that repo. It needs Contents: read and write on it.");
    if (res.status === 409 || res.status === 422) throw new SyncError("race", "GitHub changed underneath us.");
    if (!res.ok) throw new SyncError("other", `GitHub error ${res.status}`);
    return opts.accept ? res.text() : res.json();
  }

  async function remoteData() {
    const text = await api(`repos/${cfg.repo}/contents/app-data.json?ref=${encodeURIComponent(cfg.branch)}`, { accept: "application/vnd.github.raw+json", allow404: true });
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  async function commitFiles(files, message) {
    const ref = await api(`repos/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`, { allow404: true });
    const entries = Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", content }));
    let parents = [], baseTree;
    if (ref) {
      const parent = await api(`repos/${cfg.repo}/git/commits/${ref.object.sha}`);
      parents = [ref.object.sha]; baseTree = parent.tree.sha;
    } else {
      // First sync: an orphan branch holding only data files, with Vercel deploys switched off for it.
      entries.push({ path: "vercel.json", mode: "100644", type: "blob", content: '{ "git": { "deploymentEnabled": false } }\n' });
      entries.push({ path: "README.md", mode: "100644", type: "blob", content: "Data snapshots written by the Perfumes app. `app-data.json` is the complete data; `collection.md` and `wishlist.md` follow the format in fragrance-content/. Do not edit by hand.\n" });
    }
    const tree = await api(`repos/${cfg.repo}/git/trees`, { method: "POST", body: { ...(baseTree ? { base_tree: baseTree } : {}), tree: entries } });
    const commit = await api(`repos/${cfg.repo}/git/commits`, { method: "POST", body: { message, tree: tree.sha, parents } });
    if (ref) await api(`repos/${cfg.repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { method: "PATCH", body: { sha: commit.sha } });
    else await api(`repos/${cfg.repo}/git/refs`, { method: "POST", body: { ref: `refs/heads/${cfg.branch}`, sha: commit.sha } });
  }

  async function pushOnce(force) {
    const snap = getSnapshot();
    const remote = await remoteData();
    if (!force && remote && remote.syncId && remote.syncId !== cfg.lastSyncId) { set({ state: "conflict", error: "" }); return; }
    const syncId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const data = { ...snap.data, syncId, savedAt: new Date().toISOString() };
    await commitFiles({ "app-data.json": JSON.stringify(data, null, 2) + "\n", "collection.md": snap.collectionMd, "wishlist.md": snap.wishlistMd }, `App sync: ${snap.summary}`);
    set({ lastSyncId: syncId, dirty: false, lastAt: data.savedAt, state: "synced", error: "" });
  }

  async function run(force) {
    if (!cfg.token || !getSnapshot) return;
    if (running) { again = true; return; }
    running = true;
    set({ state: "saving", error: "" });
    try {
      try { await pushOnce(force); }
      catch (e) { if (e.kind !== "race") throw e; await pushOnce(force); }
    } catch (e) {
      set({ state: e.kind === "offline" ? "offline" : "error", error: e.message });
    } finally {
      running = false;
      if (again) { again = false; schedule(); }
    }
  }

  function schedule() {
    if (!cfg.token) return;
    set({ dirty: true });
    if (!cfg.auto || cfg.state === "conflict") return;
    clearTimeout(timer);
    timer = setTimeout(() => run(false), 3000);
  }

  root.GitSync = {
    info, onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    init(snapshotFn) { getSnapshot = snapshotFn; },
    schedule, syncNow: () => { clearTimeout(timer); return run(false); },
    // Check GitHub when the app opens: pull silently if another device changed things and nothing is pending here.
    async onOpen() {
      if (!cfg.token || cfg.state === "conflict") return null;
      try {
        const remote = await remoteData();
        if (remote && remote.syncId && remote.syncId !== cfg.lastSyncId) {
          if (cfg.dirty || !cfg.lastSyncId) { set({ state: "conflict", error: "" }); return null; }
          return remote;
        }
        if (cfg.dirty) run(false); else set({ state: "synced", error: "" });
      } catch (e) { set({ state: e.kind === "offline" ? "offline" : "error", error: e.message }); }
      return null;
    },
    async connect(token, repo, branch) {
      const prev = cfg;
      cfg = { ...cfg, token: token.trim(), repo: repo.trim() || DEFAULTS.repo, branch: (branch || "").trim() || DEFAULTS.branch };
      try {
        const r = await api(`repos/${cfg.repo}`);
        if (!r.permissions || !r.permissions.push) throw new SyncError("auth", "That token can read the repo but not write to it. Give it Contents: read and write.");
      } catch (e) { cfg = prev; throw e; }
      set({ lastSyncId: "", dirty: true, state: "saving", error: "" });
    },
    disconnect() { clearTimeout(timer); set({ token: "", state: "off", error: "", lastSyncId: "", dirty: false }); },
    setAuto(v) { set({ auto: !!v }); if (v) schedule(); },
    async pull() { const d = await remoteData(); if (!d) throw new SyncError("other", "No data on GitHub yet."); return d; },
    markPulled(data) { set({ lastSyncId: data.syncId || "", dirty: false, state: "synced", error: "", lastAt: data.savedAt || "" }); },
    overwriteGitHub: () => run(true),
    SyncError,
  };
})(typeof window !== "undefined" ? window : globalThis);
