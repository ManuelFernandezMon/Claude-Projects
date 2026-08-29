# Fragrance Content

Content-creation workspace for a fragrance/perfume channel (Reels/TikTok scripts + blog/newsletter posts).

## How to use it

Run `/fragrance-content` in Claude Code and pick what you need:
- A short-form video script
- A batch of post ideas
- Personalized perfume recommendations based on your collection
- A quick trend check (what's currently getting engagement in the fragrance niche)

The skill delegates the actual writing/research to the `fragrance-content` subagent
(`.claude/agents/fragrance-content.md`), which reads the two reference files below
before generating anything.

## Folder layout

- `collection.md` — your owned perfumes (brand, notes, rating, occasion). **Keep this updated** —
  it's what personalizes recommendations and keeps scripts from repeating scents you've already covered.
- `wishlist.md` — perfumes you don't own yet but want. Only added when you explicitly say to add
  something — recommendations aren't added automatically. Move an entry to `collection.md` once
  you actually buy it.
- `strategy.md` — content format/hook/CTA/cadence notes for the niche. Refine over time as you see
  what performs.
- `content/` — generated scripts, captions, and post-idea batches, saved dated (e.g.
  `content/2026-08-02-dupes-for-baccarat-rouge.md`).
- `research/` — dated trend-research notes, written both on demand and by a weekly recurring
  Routine that scouts the internet for what's trending in the niche.

## Recurring trend research

A weekly Routine (set up separately, not a file in this repo) periodically searches for fragrance
trends and drops a dated note into `research/` plus a few ready-to-use post ideas. Ask to have it
re-scheduled or paused at any time.
