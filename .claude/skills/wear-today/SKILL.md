---
name: wear-today
description: Use when the user wants a perfume/cologne recommendation for a specific occasion, mood, weather, or season, picked from their own collection — e.g. "what should I wear tonight", "cologne for a job interview", "pick something for date night", "what fits a summer party". Reads fragrance-content/collection.md and ranks matches by occasion fit and rating.
---

# Wear Today

Quick lookup, not a content-generation task — keep the answer short.

## Steps

1. Read `fragrance-content/collection.md`.
2. Map what the user said to the standard tags used in the `Occasion` column: `Everyday`, `Office`, `Evening`, `Date night`, `Special occasion`, `Summer`, `Winter`. Common synonyms:
   - work, interview, meeting → Office
   - party, wedding, event, celebration → Special occasion
   - hot, beach, vacation → Summer
   - cold, holidays → Winter
   - casual, daily, errands → Everyday
   - romantic, dinner date → Date night
   - night out, club, bar → Evening
   If the request doesn't map cleanly to any tag (or combines several, e.g. "winter wedding"), ask one quick clarifying question rather than guessing.
3. Filter rows whose `Occasion` column contains the matching tag(s).
4. Rank matches by `My Rating (1-10)` descending. Rows with no rating yet sort last (they're new/unrated, not necessarily bad — mention that if one comes up).
5. If nothing matches the specific tag, fall back to the highest-rated perfume tagged for the most occasions (a versatile all-rounder) and say plainly that it's a fallback, not an exact match.
6. Respond with:
   - **Top pick** — name, brand, one line tying it to the occasion and why (rating + a note or two that fits the vibe).
   - **2 backups** — just name + one-line reason, no need for full pyramids.
   Keep the whole answer short — a few lines, not a script or a research writeup.
