# Project Journal

A running log of what got built and decided each session. Newest entries on top.

---

## 2026-08 — Getting the channel off the ground

**Setup**
- Built the `fragrance-content` Claude Code subagent (`.claude/agents/fragrance-content.md`) and the `/fragrance-content` skill — handles scripts, post ideas, perfume recommendations, and trend research, always grounded in `collection.md` and `strategy.md`.
- Created the `fragrance-content/` project folder: `collection.md`, `strategy.md`, `content/`, `research/`, `brand/`.
- Set up a weekly Routine (Monday mornings) that scouts fragrance trends and drops a dated note + post ideas into `research/`.

**Collection**
- Populated `collection.md` with all 45 owned perfumes — notes/accords researched per bottle, including resolving the Aromas Artesanales clone names to their real originals (e.g. Galvez → Valentino Uomo Born in Roma, Dubai → Creed Silver Mountain Water).
- Built an interactive fill-in form (Artifact) so ratings, purchase dates, and occasions could be filled in without hand-editing a 45-row table; merged the results back in.
- Preferences recorded: gourmand/vanilla lean, no dislikes flagged, budget under $50 with occasional niche splurges, open to both niche and designer.
- Added **Dream Sea** by Lorenzo Pazzaglia as a new pickup (watery/green top, ylang-ylang and Bulgarian rose heart, vanilla-salt-ambergris-sandalwood base).

**Brand**
- Chose the handle **@tufrenperfumero** (Panamanian slang "fren" = friend — "your perfume friend"), picked from a set of Panama + fragrance wordplay options.
- Designed a logo: a perfume-atomizer icon mark in wine (`#8b2942`) and gold (`#c49a52`), plus light/dark wordmark lockups — saved in `brand/`.
- Installed the `logo-designer-skill` Claude Code plugin (with `rsvg-convert` for PNG export) for more guided logo iteration later, working around a couple of inaccuracies in its README (its documented install command and PNG-export npm package don't actually exist — used the real `plugin marketplace add`/`plugin install` flow and `librsvg2-bin` instead).

**Content**
- Video 1 — channel introduction, in Panamanian Spanish (`content/2026-08-02-intro-video-script.md`).
- Video 2 — first-impressions reaction to Dream Sea (`content/2026-08-15-dream-sea-first-impressions.md`).
- Liked format locked in as the default in `strategy.md`: hook → live reaction → conversational notes breakdown → CTA that teases a follow-up.
- Initial trend check completed (`research/2026-08-02-trends.md`): dupe comparisons, "cheap perfumes that smell expensive," boozy gourmands, and "smellmaxxing" content are all currently performing well in the niche.

**Repo**
- Everything lives on branch `claude/fragrance-content-agent-g7e66l` of `ManuelFernandezMon/Claude-Projects`, not yet merged to `main`.
