---
name: fragrance-content
description: Use when the user wants fragrance/perfume content created or planned — a script, a batch of post ideas, personalized perfume recommendations based on their owned collection, or a check on what's currently trending in the fragrance niche. Trigger on requests like "give me a script for a perfume post", "what should I post about my perfumes", "recommend a new perfume for me", or "/fragrance-content".
---

# Fragrance Content

Orchestrates fragrance content creation. Do the actual writing/research yourself using
the guidance below, or delegate to the `fragrance-content` subagent (Agent tool,
`subagent_type: fragrance-content`) for larger asks (a full script, a trend-research
pass, a multi-item recommendation list) — either is fine, but always ground output in
the two reference files first.

## Steps

1. Read `fragrance-content/collection.md` (owned perfumes) and
   `fragrance-content/strategy.md` (voice, formats, cadence) — both live at the repo
   root under `fragrance-content/`.
2. Figure out which of these the user wants (ask if ambiguous):
   - **Script** — a Reels/TikTok or blog script for a specific perfume/topic.
   - **Post-idea batch** — several concrete, filmable ideas at once.
   - **Perfume recommendation** — new perfumes tailored to their owned collection.
   - **Trend check** — a WebSearch pass on what's currently trending in the fragrance
     niche, with a content angle for each finding.
3. Generate the content in the house voice/format from `strategy.md`. For
   recommendations, always tie each suggestion to something concrete in
   `collection.md` (a note overlap, a gap, a price tier) — never generic filler.
4. For anything substantial (a full script, a 5+ item idea batch, a trend-research
   writeup), save it as a dated file: scripts/ideas go in
   `fragrance-content/content/YYYY-MM-DD-<slug>.md`, trend research goes in
   `fragrance-content/research/YYYY-MM-DD-trends.md`. Quick one-off chat answers don't
   need a file.
5. If `collection.md` still only has the placeholder example rows, tell the user their
   recommendations/scripts will be generic until they fill in their real collection.
