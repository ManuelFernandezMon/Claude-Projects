# RESEARCH.md — UI Styles 2026

Compiled 2026-10-14 from five parallel research passes (WebSearch + WebFetch). No docs MCP (e.g. Context7) was available, so CSS support data comes from MDN browser-compat-data and MDN/web.dev pages.

## How to read this file

- `[F]` = page was fetched and read. `[S]` = seen only in a search-result snippet (weaker).
- **unverified** = fewer than 2 sources, or only a snippet. Unverified claims are NOT used as facts on the site: they are cut or shown with a hedge.
- Momentum labels (rising / stable / cooling) are **qualitative editorial judgments** from trade blogs; no source provided adoption data. The site's comparison table must say so.
- Numeric claims seen in sources and deliberately **excluded** from the site: "35% dwell time" (bento), "47% battery" and "astigmatism 30-60%" (dark mode), "80% of Dribbble designs fail WCAG" (neumorphism), visionOS "20 pt ornament overlap" / "60 pt target" (single secondary source), any "usability study" task-success numbers.
- Liquid Glass: sources agree true refraction is not possible in plain CSS; the SVG `feDisplacementMap` + `backdrop-filter: url()` technique approximates it, mainly in Chromium, with no primary-source support data (unverified) and no `@supports` detection. The site will ship a frosted-glass base with that effect as an optional enhancement.
- Several WCAG mappings in the notes below are the researchers' own inference, not the cited source's; they refer to real WCAG criteria but should be read as "relevant criterion", not "source says".

---

# Part A — Styles 1-5

Method: WebSearch + WebFetch. Items marked [F] were fetched and read. Items marked [S] were seen only in search-result summaries. Several pages returned 403/404 (uxdesign.cc, medium, nngroup minimalism). Nothing here is filled from memory. "Unverified" means fewer than 2 sources.

Shared WCAG references [F]:
- SC 1.4.3 Contrast (Minimum), AA: 4.5:1 for text, 3:1 for large text. Text over background images that lack contrast fails. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- SC 1.4.11 Non-text Contrast, AA: UI components and the graphics needed to identify them need at least 3:1 against adjacent colors. https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html

---
## 1. Liquid Glass

**(a) Definition.** Apple's translucent material for controls and navigation that "reflects and refracts its surroundings" and adapts to the content beneath it. Apple's WWDC25 session calls it a "digital meta-material that dynamically bends and shapes light". It forms a functional layer above app content.
- Apple newsroom [F]: https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- Apple iOS 26 release page [F]: https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/
- Apple WWDC25 "Meet Liquid Glass" [F]: https://developer.apple.com/videos/play/wwdc2025/219/

**(b) Origin.** Announced by Apple on June 9, 2025 (WWDC25). Alan Dye, VP of Human Interface Design, is quoted in the press release.
- Apple newsroom [F] (URL above) gives the date and Dye.
- TechRadar [S] says it spans iOS 26, iPadOS 26, macOS Tahoe 26, watchOS 26 and tvOS 26: https://www.techradar.com/tech/apple-reveals-major-visual-redesign-for-ios-26-macos-26-and-more-at-wwdc-2025
- Yanko Design [S] says it takes inspiration from visionOS and is the biggest visual change since iOS 7: https://www.yankodesign.com/2025/06/09/wwdc-2025-apple-unveils-liquid-glass-design-revolution-and-foundation-models-framework/

**Relation to glassmorphism.**
- Glassmorphism blurs the backdrop. Liquid Glass adds lensing/refraction, motion-reactive specular highlights, and adaptive tint and shadow.
- Apple's WWDC25 session [F] says lensing is its primary way of defining itself. It says tint, shadow and dynamic range adapt to the content beneath. It says larger glass has more pronounced refraction and highlights respond to geometry and device motion.
- Setproduct [F] (June 9, 2026) says "glassmorphism only blurs what's behind it": https://setproduct.com/blog/liquid-glass-vs-glassmorphism
- Designmonks [S] makes the same distinction: https://www.designmonks.co/blog/liquid-glass-vs-glassmorphism
- Interpretation (mine): Liquid Glass is the platform-native successor to the frosted-glass idea. It is not the same technique.

**(c) Momentum 2025-26: RISING, with a contested reception.**
- Setproduct [F], June 2026, calls it the "current high-water mark for digital depth" and rates momentum rising.
- Apple shipped it as the system-wide design across its platforms (newsroom [F]).
- Backlash: coverage of beta complaints about readability and of an iOS 26.1 beta "Clear/Tinted" toggle that raises opacity and contrast [S]. Sources: https://m.gsmarena.com/the_latest_ios_261_beta_lets_you_tone_down_the_liquid_glass-news-69987.php and https://bgr.com/tech/ios-26-beta-3-liquid-glass-complaints/. Final shipping status of the toggle was not confirmed (sources differ).
- NN/g critique "Liquid Glass Is Cracked, and Usability Suffers in iOS 26" [S, second-hand only; nngroup.com page not fetched]: https://anderegg.ca/2025/10/12/nielsen-norman-group-on-ios-26-usability

**(d) Best for / avoid.**
- Best for: the navigation and controls layer of Apple-platform apps. Apple's session [F] says to reserve it for the navigation layer, not mix Regular and Clear, and avoid glass on glass and glass in the content layer. "Clear" needs a dimming layer and bold content behind it.
- Avoid on the web: faking refraction with heavy filters (Setproduct [F]). Also avoid it for content or text-heavy surfaces (Apple [F]).

**(e) Accessibility risk.** Text and control contrast over busy or moving backgrounds, and unclear tappable areas.
- Infinum [F] (June 12, 2025, beta testing) reports contrast as low as about 1.5:1 in places against a 4.5:1 minimum. It names no WCAG SC. The measurement is from beta builds: https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/
- Mapped by me to SC 1.4.3 (text) and 1.4.11 (control boundaries).
- Mitigation:
  - Apple's session [F] says the system adapts to Reduce Transparency (frostier), Increase Contrast (black or white with border) and Reduce Motion.
  - Infinum [F] adds: build high-contrast alternatives, keep text off blurred surfaces, and test with those settings on.
  - Web equivalent: `prefers-reduced-transparency` / `prefers-contrast` fallbacks. This is my inference; not source-verified.

**(f) Ingredients.** Translucency, lensing at edges, specular highlights, adaptive tint and shadow, rounded fluid shapes, a floating control layer.
- Native: Apple's session [F]. Setproduct [F] says there is "no simple CSS equivalent".

**Can true refraction be done in plain CSS? Per sources: no, only approximated.**
- LogRocket [F]: browsers "do not expose this kind of native abstraction". SVG filters (`feDisplacementMap` driven by a displacement map) can "approximate the same effect". Chromium can use SVG filters with `backdrop-filter`. Safari and Firefox "do not support this combination yet", and `backdrop-filter` is limited to built-in CSS filter functions. Heavy SVG backdrop filters can be costly on low-power devices. It recommends feature detection plus a fallback style. https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/
- Search results [S] agree:
  - Chromium-only for the full effect; Firefox/Safari fall back to blur (https://dev.to/fabiosleal/how-to-create-the-apple-liquid-glass-effect-with-css-and-svg-2o06 and https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d).
  - A May 2026 WebKit bug report says the `foreignObject` + `feDisplacementMap` workaround does not render refraction in Safari: https://bugs.webkit.org/show_bug.cgi?id=313914
  - A library workaround clones the background into a clipped overlay. It is a static snapshot that needs manual refresh (cdn.jsdelivr.net liquid-glass-js README).
- Setproduct [F]: "no simple CSS equivalent"; the web options are approximations or a WebGPU path.
- Version numbers like "Chrome 76+" are from one search summary only; treat them as unverified and check MDN or Can I Use.

---
## 2. Glassmorphism

**(a) Definition.** A style that uses translucency and background blur to mimic frosted glass and create depth. It works best over gradients or complex backgrounds. NN/g [F]: https://www.nngroup.com/articles/glassmorphism/

**(b) Origin.**
- NN/g [F] (Megan Brown, June 7, 2024): a trend gaining popularity since 2020, seen in Apple and Microsoft materials (Microsoft "Acrylic").
- Michal Malewicz is credited with coining or popularizing the term in 2020, in his UX Collective article "Glassmorphism in user interfaces", dated Nov 22, 2020 [S, article not fetched]: https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9
- Secondary sources [S] repeat the 2020 coining: https://www.ramotion.com/blog/what-is-glassmorphism/ and https://dev.to/anuraggharat651/an-intuitive-guide-to-css-glassmorphism-4id9
- Sources disagree on Apple's role (2013 vs 2021 Big Sur) [S]. Treat that as unverified.

**(c) Momentum: STABLE, as an accent.**
- Setproduct [F], June 2026: "still trending, mainly as accent surfaces".
- NN/g [F]: "best when utilized sparingly".
- Liquid Glass lends it renewed visibility. This is my interpretation. A share-of-use claim is not verifiable and none is made here.

**(d) Best for / avoid.**
- Best for: sparing depth where you control a simple background. Use stronger blur where the background varies (NN/g [F]). Setproduct [F] adds marketing flair, badges, cards, and navigation over controlled gradients.
- Avoid: low translucency over intricate backgrounds (NN/g [F]). Avoid long-form or full-screen text (Setproduct [F]).

**(e) Accessibility risk.** Text contrast depends on whatever is behind the panel. Mitigations: ensure WCAG contrast, let users reduce transparency, and provide a solid fallback.
- NN/g [F] and Setproduct [F].
- Relevant criteria: SC 1.4.3 and 1.4.11 (W3C [F]).

**(f) Ingredients.** `backdrop-filter: blur()`, a semi-transparent background, a thin light border, vivid colors behind, layered objects.
- Setproduct [F] for the first three.
- Malewicz's four properties [S]: transparency via background blur, multi-layered, vivid colors, subtle light border.
- Browser support: one article [S] says Safari 18 shipped unprefixed `backdrop-filter` in Sept 2024. That is a single source, so unverified.

---
## 3. Minimalism

**(a) Definition.** NN/g [F]: presenting content and features simply and directly with as little distraction as possible. Common traits are flat textures, limited color palettes and negative space. https://www.nngroup.com/articles/roots-minimalism-web-design/

**(b) Origin.** NN/g [F] (Kate Moran, June 28, 2015):
- A post-WWII art movement drawing on Bauhaus; Mies van der Rohe's "Less is more".
- Tufte (1983) data-ink ratio.
- Carroll (1990) minimalism in technical communication.
- Nielsen (1995) "aesthetic and minimalist design" heuristic.
- Web minimalism emerged in the early 2000s.
- Windows 8 (2011) and iOS 7 (2013) brought flat minimal styles mainstream.
- The Decision Lab [S] corroborates Carroll 1990 and Nielsen 1995 (via the search summary): https://thedecisionlab.com/reference-guide/design/aesthetic-and-minimalist-design

**(c) Momentum: STABLE (a durable baseline).**
- Kimp [F]: for 2026 minimalism is "intent-driven" and "strips pages down to what actively helps users understand, decide, and act": https://www.kimp.io/web-design-trends-2026/
- Search summaries [S] of several 2026 trend lists (e.g. https://www.elcom.com.au/resources/blog/website-design-trends-in-2026) say it is becoming more expressive, with bold type on clean layouts.
- Evidence is qualitative trend-list commentary from agencies.

**(d) Best for / avoid.**
- Best for: content-first products and tasks needing focus.
- Avoid: NN/g [F] warns that treating it as a pure visual style cuts important elements, lowers information density, harms findability, and is not a guarantee of usability (Windows 8 as a cautionary example).
- "Best for" is a general reading of the sources, not a quoted claim. Only the NN/g [F] and Kimp [F] sources support it, so it is thinly sourced.

**(e) Accessibility risk.** Stripping out cues removes affordances and findability (NN/g [F]). Typically this appears as low-contrast light-gray text and faint controls.
- That specific example is my inference; no fetched source says it.
- Mitigation: SC 1.4.3 (4.5:1 text) and SC 1.4.11 (3:1 for UI components) [F]. Keep functional elements (NN/g [F] says the risk is cutting important ones).
- A search summary [S] found no source directly addressing minimalism's accessibility failure modes. Treat the risk statement as partly unverified.

**(f) Ingredients.** Flat textures, limited palette, negative space (NN/g [F]). Kimp [F] adds purposeful sections and interactions.
- CSS-specific ingredients: unverified (not found in sources).

---
## 4. Neumorphism

**(a) Definition.** Elements share the page's background color and use a light top-left and dark bottom-right shadow to look softly extruded. The name blends "neo" and "skeuomorphism". (Setproduct [F]; Built In/Axess Lab [S].)

**(b) Origin.**
- Alexander (Oleksandr) Plyuto posted a banking-app concept on Dribbble in late 2019 (Nov 2019 per [S]). It peaked in 2020 (Setproduct [F]): https://www.setproduct.com/blog/neumorphism-design-guide
- Michal Malewicz is said to have named it [S]: https://builtin.com/design-ux/neumorphism and https://en.wikipedia.org/wiki/Neumorphism
- Sources disagree on the view counts, so none are stated here.

**(c) Momentum: COOLING.**
- Setproduct [F] (design guide): as of 2026 it survives mainly in concept work and single-purpose interfaces, and is rarely used in production for broad audiences.
- Setproduct (liquid glass article) [F], June 2026: "Declining. Survives only as a texture inside larger systems."
- Both are the same publisher, so independence is limited. Built In [S] and Axess Lab [S] corroborate the accessibility hostility but not momentum.

**(d) Best for / avoid.**
- Best for: smart-home panels, audio players, calculators, single-purpose widgets with few elements (Setproduct [F]).
- Avoid: dense dashboards, forms, multi-CTA screens, low-vision audiences (Setproduct [F]); primary actions and forms (Setproduct liquid-glass article [F]).
- Built In [F]: use it for non-essential items like cards, not for essential controls.

**(e) Accessibility risk.** Low-contrast controls that blend into the background, unclear states, weak focus.
- Built In [F]: buttons blend in, states are unclear, and Malewicz says it "breaks the entire experience" for visually impaired users: https://builtin.com/design-ux/neumorphism-accessibility
- Setproduct [F]: text below the 4.5:1 AA minimum and weak focus states.
- Axess Lab [S] ran a low-vision simulation: buttons were not visible: https://axesslab.com/?p=2528
- Applicable criteria: SC 1.4.11 (3:1 control boundaries), SC 1.4.3, SC 2.4.7 Focus Visible (W3C 1.4.11 page [F] links focus to 3:1).
- Mitigation:
  - Add visible borders and an accent color to interactive elements, plus a clear focus indicator (Setproduct [F]).
  - Push text contrast toward 7:1 (Setproduct [F]).
  - Reserve it for non-essential cards (Built In [F]).
- Malewicz's claim that about 80% of Dribbble designs fail WCAG (Built In [F]) is his own assertion without a stated method. Do not cite it as a statistic.

**(f) Ingredients.** Base color matching the surface, radius of about 12-20px, two opposing `box-shadow` values (light and dark), inset shadows for the pressed state, lighter-gray and darker-gray shadows in dark mode (Setproduct [F]).

---
## 5. Neubrutalism

**(a) Definition.** A web style that blends brutalism's raw look with modern typography and illustration. It features bold dark borders, hard offset shadows with no blur, high contrast, and clashing colors. (Rometheme [F]: https://rometheme.net/blog/uncategorized/neubrutalism-in-design/ ; corroborated by [S] results from uxdesign.cc and Medium/designstudiouiux.)

**(b) Origin.**
- Brutalism began as 1950s architecture (Rometheme [F]); the "neubrutalism" label is unofficial (Rometheme [F]).
- Figma's 2019 brand refresh and Gumroad's 2021 rebrand under Sahil Lavingia are cited as key early examples. Source: search summary [S] of https://uxdesign.cc/neubrutalism-is-taking-over-the-web-e9d09e0fe441 (fetch returned 403), so it is a single source. Treat attribution as partly unverified; a second source for the exact dates was not found.
- NN/g's article on brutalism vs antidesign [S, second-hand quote]: https://www.nngroup.com/articles/brutalism-antidesign/ (not fetched).

**(c) Momentum: COOLING as a full-page style, STABLE as an accent.** Sources disagree.
- The Plus Addons [S] says it is cooling as a full-page style, and that thick borders, zero-blur hard shadows and pressed hovers persist as accents (https://theplusaddons.com/blog/web-design-trends-2026/).
- Made Good Designs [S] says it moved from novelty to mainstream in 2026, with more measured implementations (https://madegooddesigns.com/web-design-trends/).
- Pixso [S], June 2026, claims a "comeback", but it is a design-tool vendor, so treat it as promotional.
- All are commercial blogs. No independent data. A Medium piece quoting task-success numbers from a "2026 usability study" is excluded as unverifiable.

**(d) Best for / avoid.**
- Best for: entertainment, consumer and creative brands, and art, design and fashion audiences (Rometheme [F]).
- Avoid: sectors where speed and clarity are critical, such as healthcare. Chaotic hierarchy and hard-to-find CTAs can confuse less tech-savvy users (Rometheme [F]).
- The Plus Addons [S] says it is a hard sell outside consumer and creator brands.

**(e) Accessibility risk.** Chaotic hierarchy and visual load, plus eye strain from pure black and clashing colors.
- Rometheme [F] says hard shadows are "pretty good for accessibility" because of the high contrast, and also flags the visual processing load and hierarchy problems. It admits it did not test with users.
- Mitigation: keep text on solid fills at least 4.5:1 and use native `:focus-visible` outlines (a CSS resource at https://freefrontend.com/css-neobrutalism/ [S]). Keep a disciplined, consistent hierarchy.
- Applicable: SC 1.4.3 (W3C [F]).
- One blog [S] computed black on hot pink at 7.93:1 and black on white at 21:1 (https://theplusaddons.com/blog/neo-brutalism-web-design/). These come from one author, not an audit.
- Weakest-sourced item overall. No rigorous accessibility study was found.

**(f) Ingredients.** Pure black borders and text; hard shadows with zero blur at a 45-degree offset; saturated but muted clashing palette; bold type with generous spacing; deliberate misalignment; optional window metaphor (Rometheme [F]). Pressed hover via transform (freefrontend [S]).

---
## Claims I could not verify with 2 sources
- Neubrutalism origin dates and names (Figma 2019, Gumroad 2021) rest on one search summary.
- Glassmorphism: Apple's earlier role (2013 vs 2021) and Safari 18 unprefixed support.
- Minimalism: CSS-specific ingredients and a sourced accessibility failure mode.
- Final shipping status of the iOS 26.1 Tinted toggle.
- Browser version numbers for the SVG-filter approach.
- NN/g Liquid Glass critique details (second-hand only).
- Neumorphism momentum (rests on Setproduct only).
- No numeric trend statistics were used.


---

# Part B — Styles 6-10

Legend: [F] = page fetched; [S] = seen in search results only. Items with <2 sources are marked "unverified".
Shared WCAG sources: [F] https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (1.4.3: 4.5:1 text, 3:1 large text = 18pt or 14pt bold); [F] https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html (1.4.11: UI components and graphical objects 3:1).

## 6. Brutalism / raw web (incl. neo-brutalism)
(a) Definition: web design that deliberately rejects polish in favour of raw, rugged, unadorned layouts; the "neo" variant adds flat fills, bold type, thick borders and hard offset shadows. [F] https://brutalistwebsites.com ("ruggedness and lack of concern to look comfortable or easy"); [F] https://bejamas.com/blog/neubrutalism-web-design-trend
(b) Origin: name from architectural brutalism (1950s UK, per bejamas [F]); brutalistwebsites.com calls web brutalism "a reaction by a younger generation to the lightness, optimism, and frivolity of today's web design" [F]. Search snippets say web brutalism appeared ~2014 and that "Neubrutalism" was popularized by Michal Malewicz in the early 2020s [S] https://uxdesign.cc/neo-brutalism-breaking-rules-loudly-28a8d815fb5d, https://www.onething.design/post/neo-brutalism-ui-design-trend; sources conflict on dates. Exact dates: unverified.
(c) Momentum 2025-26: **stable/mixed (niche, cooling as full-page style; rising as accent)**. Evidence: Studiomeyer 8 May 2026 describes brutalism as an emerging counter-movement ("not retro nostalgia. It is positioning") but the author hasn't adopted it [F] https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check; Fireart describes "tactile brutalism" as successor to soft UI [F] https://fireart.studio/blog/the-best-web-design-trends/; a search summary reports one source saying it is cooling as full-page style but works as CTA accent [S] (source not individually identified: unverified). Label is a judgement from vendor blogs.
(d) Best for: brands wanting to be memorable, creative sectors (design, art, fashion, culture). Avoid when: finance, healthcare, banking where navigation/structure is crucial; users who prioritize simplicity. [F] bejamas (above); [S] onething/designstudiouiux snippets say it may not suit finance/law.
(e) Accessibility risk: harsh clashing colours and chaotic/non-standard layout/navigation; bejamas notes high contrast helps some users but can cause anxiety for others [F]. Mitigation: verify pairs meet WCAG 1.4.3 (4.5:1) and 1.4.11 (3:1 for borders/controls), keep conventional DOM order/navigation. WCAG sources above [F]. (Specific brutalism-WCAG failure evidence: only 1 source, unverified.)
(f) Ingredients: 2-5px solid black borders, hard offset box-shadow with 0 blur, flat single-colour fills, bold/monospace type, clashing high-contrast palette, little rounding. [F] bejamas (no CSS props named, traits only); [S] CSS values summary from a guide in search results (onething/designstudiouiux). Exact px values: unverified beyond one search snippet.

## 7. Bento Grid
(a) Definition: modular layout of distinct, rounded, differently sized content blocks in a compartmentalized grid, like a bento lunchbox. [F] https://webdesignerdepot.com/what-is-the-bento-ui-trend-and-how-can-you-get-started ; [F] https://www.freecodecamp.org/news/bento-grids-in-web-design/
(b) Origin: name from Japanese bento boxes (both [F]). Who started it is disputed: Apple (popularizer, per WDD [F]) vs Microsoft Metro (WDD [F]; also [S] https://bootcamp.uxdesign.cc/web-design-trend-bento-box-95814d99ac62). Apple event-slide dates conflict (2022 vs 2023) [S]: unverified.
(c) Momentum: **stable-to-rising, now mainstream default**. Studiomeyer 8 May 2026 says bento grids "held up" ("Different tile sizes can prioritise content") [F] https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check; search summary of 2026 trend lists calls it default for feature sections [S] https://studiomeyer.io/en/blog/webdesign-trends-2026 and https://line25.com/articles/web-design-trends-2026/. WDD notes some experts think it is near peak and will date quickly [F]. Claim "35% longer dwell time" has no study: unverified, do not use.
(d) Best for: bite-sized, simple-hierarchy content, feature showcases, dashboards, portfolios, mobile (WDD [F], freeCodeCamp [F]). Avoid when: no clear hierarchy, too many boxes (freeCodeCamp suggests nine or fewer), all-equal cells, dense decisions, SEO-sensitive split content. Fireart warns single-column mobile collapse can destroy narrative flow [F] https://fireart.studio/blog/the-best-web-design-trends/
(e) Accessibility risk: visual order diverging from DOM order, hurting screen reader/keyboard users (freeCodeCamp says compartmentalized grids can be hard for them unless planned [F]; the DOM-order detail about grid-template-areas was the fetch tool's own note, not the article: treat as general knowledge, relates to WCAG 1.3.2 Meaningful Sequence, 2.4.3 Focus Order, not fetched). Mitigation: keep HTML source order = logical reading order; test mobile collapse. Two independent sources on the risk: only 1 explicit (freeCodeCamp), WDD says nothing: partially unverified.
(f) Ingredients: CSS Grid (grid-template-columns/rows, gap, grid-template-areas, grid-area), varied cell spans, rounded corners, media queries to reflow (freeCodeCamp [F], WDD [F]).

## 8. Claymorphism
(a) Definition: soft, inflated "clay-like" 3D UI using rounded shapes, inner + outer shadows and pastel colours. [F] https://www.smashingmagazine.com/2022/03/claymorphism-css-ui-design-trend ; [S] https://blog.logrocket.com/ux-design/what-is-claymorphism-web-design/
(b) Origin: coined by Michal Malewicz, who also created neumorphism's resurgence (Smashing [F]; [S] https://uxdesign.cc/claymorphism-in-user-interfaces-1757fabaa377 article dated Dec 2021 per search summary, full text not read). Smashing 2022-03 gives no exact date.
(c) Momentum: **stable (niche)**. Search summary of 2026 trend lists: "stable niche that struggles with dense interfaces" [S] (single, source not identified: unverified). Setproduct 2026 says neumorphism is declining and presents clay as the contrast-preserving cousin; skeuomorphism "not trending" [F] https://www.setproduct.com/blog/liquid-glass-vs-glassmorphism. No direct 2025-26 evidence of rise or fall; label weakly supported.
(d) Best for: friendly consumer, fintech, health, education/kids apps [S] https://design-styles.enlighten-media.net/pages/claymorphism/ (low-authority). Avoid: dense data tables/long forms [S, one source], serious/enterprise tone; Malewicz warns it can look childish [F] Smashing.
(e) Accessibility risk: soft shading and pastel fills give low contrast between element and background (Smashing [F]: check contrast, hierarchy, reduced-motion for press animations). Mitigation: WCAG 1.4.11 3:1 for control edges/labels, 1.4.3 for text, strong accent colours, honour prefers-reduced-motion (WCAG 2.3.3 not fetched). Setproduct: clay uses saturated surfaces to hold contrast [F].
(f) Ingredients: any background colour, large border-radius, three shadows (two inset one light one dark, plus one darker outer), pastel palette, 3D illustrations (Smashing [F]).

## 9. Skeuomorphism (incl. revival)
(a) Definition: UI that imitates real-world objects/materials (textures, highlights, depth) so controls look tangible. [F] setproduct ("a button that looked physically raised told you to press it"); [F] WDD https://webdesignerdepot.com/how-apple-quietly-brought-skeuomorphism-back-to-life/
(b) Origin: older than flat design; flat displaced it (iOS 7 era) - not explicitly dated in fetched sources; TechRadar headline references "first time since iOS 6" [F headline only] https://www.techradar.com/phones/iphone/apples-new-liquid-glass-design-puts-the-spotlight-on-skeuomorphism-for-the-first-time-since-ios-6-and-im-all-for-it. Who/when invented: unverified.
(c) Momentum: **rising as "revival" via Apple Liquid Glass (WWDC 2025), but contested**. WDD, 12 June 2025: "this is skeuomorphism in disguise" [F]; TechRadar headline agrees [F headline]; Gizmodo argues it is not skeuomorphism in the strict sense [S] https://gizmodo.com/apples-ushers-in-new-glassy-design-with-ios-26-and-liquid-glass-interface-2000613045. Setproduct 2026: liquid glass "Yes (rising)", skeuomorphism proper "not trending" [F]. Net: realistic-texture skeuomorphism stable/niche; glass/material-depth rising. 2026 web-trend lists did not cover it [S]. "Neo-skeuomorphism" as a named movement: unverified.
(d) Best for: hero objects, audio/music/tactile controls, games, onboarding where affordance matters (affordance claim from setproduct [F]; specific use-case list otherwise unverified). Avoid: dense productivity UIs, perf-constrained pages; setproduct: "aged badly and scaled worse" [F]; Fireart avoids heavy 3D for performance [F].
(e) Accessibility risk: translucent/glass layers make text contrast depend on background; "Legibility collapses", buttons disappear (WDD [F]; setproduct "Text on glass depends entirely on whatever sits behind it" [F]). Mitigation: solid fallback and respect reduced-transparency setting (setproduct [F]); test WCAG 1.4.3 and 1.4.11 over worst-case backgrounds; CSS `prefers-reduced-transparency` is my pointer, not fetched.
(f) Ingredients: gradients, multi-layer shadows, inner highlights, textures/noise, translucent layers, specular highlights, refraction (WDD [F]); Fireart suggests CSS noise/grain as cheap texture [F].

## 10. Dark Mode UI
(a) Definition: light-on-dark colour scheme (tonal dark surfaces) offered as a theme/alternative. [F] https://www.uxdesigninstitute.com/blog/dark-mode/ ; [F] https://www.accessibilitychecker.org/blog/dark-mode-accessibility/
(b) Origin: early computers had black screens with green/amber text; light mode became the norm, dark mode returned (UX Design Institute [F]). Who/when of modern OS-level dark mode: unverified.
(c) Momentum: **stable/rising, now baseline expectation**. Studiomeyer 8 May 2026: dark mode "held up" ("A theme should fit usage and brand") [F]; Fireart: dark-first defaults "presented as a standard" [F]; search summary: now a full visual identity [S] https://theplusaddons.com/blog/web-design-trends-2026/. Fireart's "up to 47% battery" claim has no source: unverified, do not use.
(d) Best for: low-light use, light-sensitive users, media/dev/creative tools, OLED (UXDI [F]; Fireart [F]). Avoid/caution: bright sunlight, long text-heavy reading, some low-vision/colour-blind cases (UXDI [F]).
(e) Accessibility risk: halation/glare and eye strain from pure white on pure black, especially for people with astigmatism; saturated colours vibrate; lost focus indicators (accessibilitychecker [F]; UXDI [F]). Note accessibilitychecker's "astigmatism affects 30-60%" is unverified. Mitigation: near-black (#121212) with off-white text, desaturated accents, meet WCAG 1.4.3 (4.5:1) and 1.4.11 (3:1 incl. focus rings), tonal elevation instead of shadows, provide a toggle and respect system setting (both [F]). Halation is not in WCAG itself.
(f) Ingredients: CSS custom-property tokens, `@media (prefers-color-scheme: dark)` plus manual toggle (the media query itself was not stated by either fetched source: use MDN to verify, unverified here), dark-grey surfaces lightening with elevation, off-white text, desaturated accents.

## Source reliability note
Most sources are agency/vendor blogs; no academic or primary-standards sources except W3C WCAG. Momentum labels are qualitative judgements from these blogs.


---

# Part C — Styles 11-15

Method: WebSearch + WebFetch. Only claims seen in fetched pages or search results are included. "[F]" = page fetched; "[S]" = seen in search-result snippet only. Momentum is qualitative. Source quality is mostly trend blogs; no adoption data was found for any style.

Important limitation: Apple's HIG pages (developer.apple.com/design/human-interface-guidelines/designing-for-visionos and /ornaments) are JavaScript-rendered. WebFetch returned only the page title, so Apple's HIG text was NOT directly verified. visionOS traits below rest on two secondary sources.

---
## 11. Spatial UI (visionOS-style depth / glass)

**(a) Definition.** Interfaces modelled on visionOS: translucent "glass" windows floating in layered depth, with gaze or hover feedback and detached ornaments for controls. On the web this is usually approximated with glassmorphism (blur, translucency, shadows).

**(b) Origin.** Apple's visionOS (Apple Vision Pro). Launch date and designer: unverified; no fetched source states them. Apple's Liquid Glass was "introduced at WWDC 2025" [S: https://axesslab.com/?p=5111 and search summary of https://frontendmasters.com/blog/liquid-glass-on-the-web/]. Axess Lab says Liquid Glass was "intended for 2026 OS releases" [F: https://axesslab.com/?p=5111].

**Verified visionOS visual traits (secondary sources, 2 independent):**
- Glass material: the system glass lets the real room show through, and white text is the most legible choice [F: https://think.design/?p=3742]. Ornament backgrounds are typically glass [F: https://www.createwithswift.com/creating-ornaments-in-visionos/].
- Depth: a "large, open space" of windows and objects; layering conveys hierarchy [F: think.design]. The "elements nearer = more prominent" idea appears only in a search summary of a skills.cat guide, so treat it as unverified.
- Hover effect: highlights elements as the eyes move across them; gaze acts as the cursor [F: think.design]. Borderless buttons get a system hover effect when looked at [F: createwithswift].
- Ornaments: "a two-dimensional interface component that stays on a plane slightly in front of its window"; it keeps key controls reachable without covering content [F: createwithswift, summarising Apple docs]. Floating toolbars overlap the window's bottom edge by 20 pt and tab bars have at most six items [F: think.design only, so single-source and unverified against Apple].
- Apple's own HIG text: not verified (fetch failed).

**(c) Momentum 2025-26: rising (cautiously), glass specifically.** Evidence: Apple's Liquid Glass at WWDC 2025 spawned web write-ups (Axess Lab June 2025 [F]; Frontend Masters "Liquid Glass on the Web", Dev.to, Kitemetric [S: see search results]). Counter-evidence: a 2026 trend list (Barn Images, 6 Aug 2026) does not cover glass/spatial as a trend [F: https://barnimages.com/blog/tips/web-design-trends/]. So the momentum is real but tied to Apple's platform, not to a measured web trend. "Spatial UI on the web" as a distinct style: unverified (no source).

**(d) Best for / avoid.** Best for: product showcases, dashboards or media apps with a rich photo/video background, and WebXR/visionOS-adjacent experiences (inferred; no source states it, so unverified). Avoid when text sits on busy or variable backgrounds, on critical UI, or on low-power devices [F: https://axesslab.com/?p=5111 on background interference and performance].

**(e) Accessibility risk and mitigation.** Risk: text contrast on translucent layers varies with whatever is behind it. Glass shifts colour with the environment and stacking translucent layers should be avoided [F: think.design]. Axess Lab cites WCAG 1.4.3 (4.5:1) and 1.4.11 Non-text Contrast (3:1) [F]. Mitigation: use semi-opaque fills or overlays behind text; add borders or shadows for focus and hierarchy; honour `prefers-reduced-motion` and `prefers-reduced-transparency`; test in high-contrast mode and zoom [F: axesslab]. Apple ships Reduced Transparency and Increased Contrast fallbacks [S: search summary of the sources above]. WCAG 1.4.3 text: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html [F]. Note that WCAG's own page gives no guidance on gradient or varying backgrounds, so check at the worst point.

**(f) Ingredients.** `backdrop-filter: blur()` with semi-transparent RGBA background [S]; layered shadows and thin light borders (inferred; unverified); hover/focus lift states; detached floating toolbars (ornament pattern); large rounded corners (unverified). Blur of 20px and above flagged as a concern [F: axesslab].

---
## 12. Chrome / Liquid Metal

**(a) Definition.** Mirror-like metallic surfaces, molten forms, sharp reflections and high-contrast specular lighting, with embossed type and liquid contours on dark backgrounds [F: https://trends.daisyui.com/trend/chrome-liquid-metal/].

**(b) Origin.** No single origin: AIGA's Eye on Design (26 Sep 2019, Liz Stinson) says "it's hard to say where the trend truly started". It traces roots to metal-music logo typography, early psychedelic design and "acid graphics" popularised by David Rudnick, and names Jessica Walsh's logo and Dazed's beauty site as examples [F: https://eyeondesign.aiga.org/the-futuristic-gleam-of-liquid-metal-is-everywhere-right-now-heres-why/]. daisyUI calls it "a contemporary digital treatment rather than one continuous historic movement", citing Streamline Moderne, chrome airbrush/music graphics and accessible 3D tools in the early 2020s [F].

**(c) Momentum 2025-26: stable-to-rising, as an accent, not a full-site style.** Evidence: Todaymade lists liquid metal as a 2025 trend [S: https://www.todaymade.com/blog/graphic-design-trends]; Adobe Express expected silver/chrome hues to rise in 2025 [S: https://adobe.com/express/learn/blog/design-trends-2025]; CapCut's 2026 guide names chrome lettering among early-2000s cues but says it is "a selective content trend, not a mandate" and offers no performance proof [F: https://www.capcut.com/create/y2k-design-aesthetic-2026-content]. AIGA (2019) shows the style is at least 6 years old, so the "2025-26 revival" is a continuation. No usage data found.

**(d) Best for / avoid.** Best for: automotive, fashion, music, gaming, luxury tech, dramatic campaign sites [F: daisyUI]; culture brands, musicians, shoe brands [F: AIGA]. Avoid on dense explainers, financial or health info, prices, deadlines, legal copy and instructions [F: CapCut, for reflective lettering]. Use one oversized object or wordmark, not full-page chrome (daisyUI layout advice [F]).

**(e) Accessibility risk and mitigation.** Risk: reflective, gradient-filled lettering has uneven contrast and can vanish in bright light. WCAG SC 1.4.3 requires 4.5:1 (3:1 for large text) and is measured against the background actually rendered [F: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html]. Mitigation (CapCut [F]): check contrast at the weakest point under the letters, put essential text on a stable solid backing or tested outline, and preview on a phone in bright light. Keep chrome effects to headlines and set body copy in a plain sans (daisyUI [F]). Logotypes are exempt from 1.4.3 [F: W3C], but functional text is not. Also add `prefers-reduced-motion` for the slow rotation or reflection sweeps (reasonable inference; no fetched source ties it to chrome).

**(f) Ingredients.** Metallic multi-stop gradients, hard specular highlights, dark graphite/black base with one hot accent (electric blue, racing red, acid green), extended geometric display faces (Michroma, Orbitron, Audiowide, Syncopate), embossed/mirrored headline effects, liquid capsule shapes, one oversized 3D metallic object with ample negative space, slow rotation and reflection sweeps [F: daisyUI]. Typically rendered via 3D software or Photoshop and used as an image [F: AIGA].

---
## 13. Y2K (web/UI revival)

**(a) Definition.** A style of glossy chrome, translucent plastic, bubble lettering, metallic gradients and compact device shapes carrying turn-of-the-millennium digital optimism [F: https://trends.daisyui.com/trend/y2k/].

**(b) Origin.** The source period is the mid-1990s to about 2001, with a major revival from the late 2010s; the label "Y2K" is now looser and not always historically precise [F: daisyUI]. The term "Y2K aesthetic" is attributed to Evan Collins of the Consumer Aesthetics Research Institute, but only by a user-edited wiki [S: https://aesthetics.fandom.com/wiki/Y2K_Futurism], so that attribution is unverified. AIGA (27 Oct 2022, Angelica Frey) quotes Jane McFarlane (The Digital Fairy) describing rounded bloated typefaces, metallics and gloss, and Evan Collins linking the revival to 4K displays and better 3D and fluid simulation [F: https://eyeondesign.aiga.org/the-y2k-aesthetic-is-fully-back-but-can-it-stick-around/]. A glossier successor look, "Frutiger Aero", is dated roughly 2004-2013 by Dazed [S: https://www.dazeddigital.com/life-culture/article/58103/1/what-is-frutiger-aero-aesthetic-tikt].

**(c) Momentum 2025-26: stable (selective), not clearly rising.** Evidence: CapCut's 2026 guide calls it "a selective content trend, not a mandate" and recommends one hero cue and one supporting cue [F: capcut]. Barn Images (Aug 2026) says soft retro "has split into much more specific directions" such as Y2K revival [F: https://barnimages.com/blog/tips/web-design-trends/], meaning it persists as a niche. AIGA 2022 left "will it last?" open and quoted a possible "twilight" [F]. Other 2025 pieces (Zeustic blog, podcast listings) are low-quality marketing [S]. No adoption data.

**(d) Best for / avoid.** Best for: fashion, beauty, music, social products, youth brands [F: daisyUI]; product-drop teasers, music visuals, beauty launches, events, creator intros [F: CapCut]. Avoid: stacking many effects; reflective lettering on dense explainers, financial or health info, prices, legal copy [F: CapCut]; audiences expecting a sober tone (inferred; unverified).

**(e) Accessibility risk and mitigation.** Risk: gloss, chrome and low-opacity text over gradients lower contrast; reliance on colour for status. WCAG SC 1.4.3 (4.5:1 normal, 3:1 large) [F: W3C] and SC 1.4.1 Use of Color (CapCut says "don't rely on color alone" [F]; criterion text itself not fetched). Mitigation: solid or high-contrast backing under text, check the weakest point, watch low-opacity text, keep body text crisp and chrome ornament off labels [F: CapCut, daisyUI].

**(f) Ingredients.** Aqua-to-violet and holographic/iridescent gradients, glossy bevelled buttons, chrome stars and bubble forms, lens flares, rounded device-shell windows, translucent tabs, display faces (Audiowide, Michroma, Righteous, Zen Dots) with a clean sans or pixel accent; loading shines, springy motion [F: daisyUI, CapCut]. Glitchy animation, marquee text and pixel fonts are mentioned only in low-quality sources [S], so unverified.

---
## 14. Retro / Pixel UI (8-bit, pixel art, retro computing)

**(a) Definition.** Interfaces that borrow 8-bit/pixel-art graphics and 80s-90s computing looks (VHS static, neon grids, Windows 95 chrome) in a modern framework [F: https://www.newsletter.designproject.io/p/design-for-nostalgia-why-pixel-art-and-retro-ui-are-dominating-2025].

**(b) Origin.** The Design Project newsletter (29 Oct 2025, Dianne Alter) gives no historical origin; it only says designers blend 80s-90s aesthetics with modern frameworks [F]. Who/when for the style itself: unverified (the sources describe revival, not origin).

**(c) Momentum 2025-26: rising/stable as a niche, with one cooling signal.** Evidence: the Design Project newsletter (Oct 2025) says retro/pixel UI is "dominating 2025", driven by design fatigue and a wish for tactile interaction [F]; a Sage agency article says pixel art is having its biggest moment since the Flash era [S: https://sage.agency/blog/websites-that-use-cool-pixel-art-design/; fetch failed, so snippet only]; Codrops documents a 2025 8-bit portfolio rebuild [S: https://tympanus.net/codrops/?p=106855]. Cooling signal: Barn Images (6 Aug 2026) dropped "soft retro" from its 2026 list [F]. Net: persistent niche, no data on scale.

**(d) Best for / avoid.** Best for: leisure, creativity or relaxation products; Millennial and Gen Z audiences; standing out in a crowded market; teams committed to the full aesthetic [F: Design Project]. Avoid: enterprise software without a specific reason, older-skewing audiences who may find it unprofessional, cases where the style hinders core function or accessibility [F: Design Project].

**(e) Accessibility risk and mitigation.** Risk: low-contrast retro palettes and small pixel fonts reduce legibility; fixed-px text can resist zoom. WCAG SC 1.4.3 contrast [F: W3C] and SC 1.4.4 Resize Text (text must scale to 200% without loss of content or function) [F: https://w3c.github.io/wcag/understanding/resize-text]. Mitigation: meet WCAG contrast, offer a high-contrast mode, full keyboard and screen-reader support, ARIA/alt text from wireframe stage [F: Design Project]; also 4.5:1 minimum, clear focus states, reduced-motion support and 44px+ touch targets [S: search summaries of a login-screen guide and a pixel-font skill listing; weak sources]. A claim that pixel fonts are inherently hard to read at small sizes had no source: unverified. Old W3C mailing-list threads note px-sized fonts historically resisted browser enlargement [S: https://lists.w3.org/Archives/Public/w3c-wai-gl/2001AprJun/0334.html]; modern browsers zoom px, so this is dated.

**(f) Ingredients.** Pixel bitmap fonts, limited flat palettes, hard-edged borders, dithering, pixel icons, a "pixel mask" modal transition (Codrops [S]), skeuomorphic textures and neon grids [F: Design Project]. `image-rendering: pixelated` is the standard CSS for crisp scaling but no fetched source confirmed it: unverified. Lightweight CSS/SVG preferred for performance (Design Project snippet [S]).

---
## 15. Editorial / Type-First

**(a) Definition.** Type-first: large, expressive type is the main visual, with images and controls in support. Editorial: magazine-style layouts with dramatic type, art-directed images, columns, captions and deliberate pacing [F: https://trends.daisyui.com/editorial-art-inspired-ui/].

**(b) Origin.** Derived from print magazine design; no fetched source names a person or date, so who/when is unverified. A 2025 trend piece frames it as traditional editorial design carried to the web (large serif headings, white space, asymmetric grids, italic emphasis) [S: https://majestyajans.com/en/blog/2025-design-trends.html]. Variable fonts are credited as the enabler [F: https://www.designmonks.co/blog/typography-trends-2026].

**(c) Momentum 2025-26: rising.** Evidence: Barn Images (6 Aug 2026) ranks "Bold Editorial Typography" as trend #1 for 2026, with extreme scale contrast [F: https://barnimages.com/blog/tips/web-design-trends/]; DesignMonks (2026) says bold type and a comeback of expressive serifs, plus growing motion typography [F: designmonks]; a 2026 roundup says oversized type "continues to lead in 2026" [S: https://wannathis.one/blog/top-typography-trends-2026-for-designers]; a font report calls the display-serif return the year's most defining trend [S: https://madegooddesigns.com/?p=3200]. All are design blogs, no hard data.

**(d) Best for / avoid.** Best for: content needing authored rhythm, a cultural viewpoint or strong hierarchy [F: daisyUI]; key messages in hero sections, banners and social [F: designmonks]. Avoid: tiny supporting text, which hurts small screens and low-vision users [F: designmonks]; text-heavy utility UIs and data tables (inferred; unverified).

**(e) Accessibility risk and mitigation.** Risk: fluid viewport-based sizing with clamp()/vw caps can stop text scaling to 200% on zoom, failing WCAG SC 1.4.4; huge headings can also overflow narrow screens (Barn Images advises testing at 320 px for anti-grid layouts [F]). Sources: W3C Understanding SC 1.4.4 [F: https://w3c.github.io/wcag/understanding/resize-text]; Smashing Magazine and Adrian Roselli on clamp() failures [S: https://smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type]. Mitigation: include a rem component in clamp(), keep the max large enough for 200% zoom, test with browser zoom, don't disable zoom [S: same search summary]. Also keep high contrast and readable small text [F: designmonks]. SC 1.4.12 Text Spacing: no source found, unverified.

**(f) Ingredients.** Extreme scale contrast (largest heading at least ~6x the smallest text, one opinion [F: Barn Images]); display serifs or variable fonts subset to needed characters [F: Barn Images, designmonks]; asymmetric grids, generous white space, columns and captions, art-directed imagery [F: daisyUI]; optional kinetic type tied to scroll [S: search snippets; designmonks F on motion typography]; `clamp()` fluid sizing (with the caution above).

---
## Not verified with 2 sources (summary)
- Apple HIG text itself (fetch returned titles only); 20 pt ornament overlap and 60 pt targets (single secondary source); visionOS launch date/designer.
- "Spatial UI on the web" as a recognised web style.
- Y2K term origin (Evan Collins) beyond a wiki + AIGA mention; Y2K glitch/marquee/pixel-font web traits.
- Pixel fonts' legibility claims; `image-rendering: pixelated`; Sage agency article (snippet only).
- Editorial/type-first origin who/when; WCAG 1.4.12 relevance; 1.4.1 criterion text.
- All "best-for" items marked inferred.


---

# Part D — Styles 16-20

Legend: [F] = page fetched and read; [S] = seen only in search-result snippet. Momentum is editorial/qualitative only; no source gave adoption data. Many sources are trend catalogs / vendors; weight accordingly.

Source keys
- D1 daisyUI scrapbook [F] https://trends.daisyui.com/trend/scrapbook-sticker-ui/
- D2 daisyUI aurora [F] https://trends.daisyui.com/trend/mesh-gradient-aurora-ui/
- D3 daisyUI data-dense [F] https://trends.daisyui.com/trend/data-dense-utilitarian-ui/
- D4 daisyUI organic/atmospheric [F] https://trends.daisyui.com/organic-atmospheric-ui/
- D5 daisyUI 2026 list [F] https://trends.daisyui.com/ui-design-trends-2026/
- PX Pixlr (Sienna Scott, 2026-08-31) [F] https://pixlr.com/blog/handmade-scrapbooked-and-dopamine-bright-the-design-trend-bringing-back-the-human-touch/
- CM Creative Market 2026 forecast [S] https://www.accessnewswire.com/newsroom/en/computers-technology-and-internet/the-future-of-design-creative-market-releases-2026-trend-forecast-1135565
- SH Shopify graphic design trends [S] https://www.shopify.com/blog/graphic-design-trends
- KT Kittl gradient [S] https://www.kittl.com/blogs/gradient-design-trend-stl/
- KB Kittl blueprint (pub. 2025-11-26) [F] https://www.kittl.com/blogs/?p=14042
- KIT Tech Blueprint kit [S] https://cdn.jsdelivr.net/npm/@wrongstack/core@0.295.1/design-kits/tech-blueprint/KIT.md
- SP SetProduct retro/brutalist 2026 [F] https://setproduct.com/blog/retro-brutalist-ui-design-2026
- FCC freeCodeCamp biophilic [F] https://www.freecodecamp.org/news/what-is-biophilic-design/
- SK Seahawk biophilic examples [S; fetch returned no body] https://seahawkmedia.com/design/biophilic-website-design-examples/
- WCAG 1.4.3 [F] https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 1.4.1 [F] https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- WCAG 2.3.3 (AAA) [F] https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- WCAG 2.5.8 [F] https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## 16 Hand-Drawn / Scrapbook / Sticker UI
(a) Definition: "Stickers, tape, stamps, snapshots, doodles, labels, and layered ephemera create a personal assembled look" (D1); hand-drawn variant uses sketchy icons, paper textures, handwritten type (search summary of D5-family pages, [S]).
(b) Origin: D1: "19th-century domestic precedents; digital revival in the 2010s-2020s", "a contemporary synthesis rather than a single historical school." PX: no named origin or creator; "no single official name yet." No individual originator verified.
(c) Momentum: RISING (editorial). PX (2026-08-31) calls it "the biggest design trend of late summer 2026", framed as a reaction to "smooth AI-generated imagery"; D5 lists it under "Personality beats generic polish"; CM [S] lists "Hand-Drawn Revival"; SH [S] describes a "structured scrapbook" approach. All are editorial claims, no data.
(d) Best for: social products, youth brands, journaling, creator tools, events, community (D1). Avoid when: unverified as explicit guidance; D1 advises placing ephemera "around rather than across active content" and D5 says hand-drawn works only "when the interaction structure remains disciplined." Inference (not sourced): avoid for dense/regulated/transactional flows.
(e) A11y risk: low contrast and hurt legibility from clashing saturated palettes, handwriting fonts, rotated/off-axis layouts (PX recommends going "well past natural" saturation and tilted layers; PX itself does not discuss accessibility; D1 says reserve handwriting for annotations/names and keep rotation from harming scan order). Mitigation: WCAG 1.4.3 (4.5:1 text, 3:1 large) on actual rendered backgrounds, incl. text over textures/images (WCAG 1.4.3 page, failure F83); body copy in plain serif/sans (D1); decorative stickers outside content areas.
(f) Ingredients (D1): noise/texture, die-cut outlines, scallops, torn notes, tape strips, 0.75-1.5rem radii, warm paper/cream/cork bases, fonts Schoolbell, Patrick Hand, Special Elite, Caveat, Gochi Hand; brief tactile motion (peel, stamp, slide). PX: polaroids, washi tape, off-axis placement, hand-lettering.

## 17 Aurora / mesh gradients
(a) "Atmospheric multi-point gradients blending luminous colors into soft clouds, glows, and color fields" (D2).
(b) Origin: D2: emerged late 2010s; labels are "descriptive contemporary labels rather than a documented movement with a single origin." KT [S]: gradients gained traction late 1990s, strong comeback around 2018; "aurora" refers to northern lights. A claim that Figma multi-point gradients (~2017) enabled it comes from a low-quality style site: UNVERIFIED. Apple attribution: UNVERIFIED (not supported by any source).
(c) Momentum: STABLE (leaning saturated). Evidence: one search-result source says aurora gradients are so common in tech marketing they are shorthand for "AI product" [S, design-styles.enlighten-media.net, low quality]; D2 ties it to the late-2010s "saturated gradient rebrand cycle" with no 2026 data; D5 does not cover it. Treat the label as weakly supported.
(d) Best for: AI products, SaaS landing pages, premium branding, onboarding, hero backgrounds (D2). Avoid: D2 "never fill paragraphs or small labels with the gradient"; keep away from reading zones.
(e) A11y risk: text contrast varies across a gradient; slow animated colour. Mitigation: WCAG 1.4.3 check at the worst-contrast point beneath text; place text on calm dark/pale areas (D2); respect prefers-reduced-motion (D2; WCAG 2.3.3 is AAA, technique C39).
(f) Ingredients (D2): 3-5 neighbouring luminous hues, multi-point/radial gradients, blur, soft glow, 0.75-1.5rem radii, near-white or deep charcoal base, compact sans headlines. (CSS: layered radial-gradient + filter: blur is common practice, not from a fetched source.)

## 18 Data-Dense Utilitarian UI
(a) "Compact spacing, visible structure, tables, restrained colors, functional typography, and minimal ornamental styling" (D3).
(b) Origin: D3: "practical lineage rather than a named aesthetic movement", from industrial control rooms, financial terminals, scientific displays, spreadsheets, enterprise software; period 1970s to present. Corroboration SP: monospace type "went from niche to default on engineering sites"; Are.na as "dense and utilitarian."
(c) Momentum: RISING (editorial). D5: compact, information-rich screens "are returning as teams favor speed, legibility, and expert workflows" (clearest signal found). SP: "a growing slice of the web is loud again," terminal/mono styling spreading from dev tools to indie SaaS. No quantitative data.
(d) Best for: developer tools, ops, analytics, trading, logistics, internal enterprise (D3). Avoid when: casual/consumer experiences (inference in fetch summary of D3, not stated by source); SP says the raw/terminal look suits portfolios/editorial better than banking or healthcare (search summary [S]; verify before quoting).
(e) A11y risk: small text, tight rows, small targets, colour-only status. Mitigation: WCAG 2.5.8 (min 24x24 CSS px or spacing exception); WCAG 1.4.1 (D3: "never encode a metric through color alone"); WCAG 1.4.3 for muted greys and phosphor/link colours (SP: default link blue on coloured block can fall below WCAG ratios; pixel fonts at small sizes "wreck readability").
(f) Ingredients (D3): 4/8px spacing, compact rows, cool neutral surfaces, one muted analytical blue, saturated hues reserved for state, 0-4px radii, visible gridlines, condensed sans labels + mono/tabular numerals, sparklines, resizable panes, sticky headers, persistent filters. Terminal variant (SP): monospace, CRT-green, scanlines.

## 19 Blueprint / schematic / technical-drawing UI
(a) Technical-drafting aesthetic: thin-line connectors, grids, monospace labels, two-colour palettes (KB); navy ground, fine grid, dimension marks, monospace labels (KIT [S]).
(b) Origin: KB: "Historically, it referred to the cyanotype printing method used to reproduce technical drawings"; started in workshops, labs, architect offices. No named designer or date for the UI style: UNVERIFIED. (D5's "Blueprint" is a tool name, not this style; SP does not mention it.)
(c) Momentum: RISING but weakly evidenced. KB (Nov 2025, shows May 2026 date) credits a return to minimalism after maximalism, AI tools easing "deconstructed" illustration, and clarity as drivers; KIT/prompt galleries [S] are vendor/template sources. Only one independent-ish editorial source fetched: treat as thinly verified.
(d) Best for (KB): menus, packaging/product explainers, posters, merch, infographics, instructional content; KIT [S]: hardware, devtools/infra, robotics, science/engineering. Avoid when: no source states this. Inference: avoid for content-heavy reading UIs. KB caution: stroke weights must stay consistent or the illusion breaks.
(e) A11y risk: thin light lines and low-contrast light-blue-on-navy text, tiny monospace annotations. Mitigation: WCAG 1.4.3 (4.5:1 text) and, for line-art conveying meaning, WCAG 1.4.11 non-text contrast 3:1 (SC number from memory, not fetched: UNVERIFIED here); keep annotations as real text, not images of text (1.4.3 covers images of text).
(f) Ingredients: grid background (repeating linear-gradient lines), thin 1px strokes, dashed outlines, anchor-circle connectors, monospace type, two-colour palette (KB, KIT [S]); sharp corners (skills.sh blueprint-ui [S]).

## 20 Biophilic / organic design in UI
(a) "Nature-centered interfaces use organic shapes, botanical imagery, earthy colors, natural textures, and gentle motion" (D4).
(b) Origin: biophilic design comes from architecture; FCC explains the Greek roots "bios"/"philia" but gives no coiner or date. Coiner/date: UNVERIFIED by sources fetched. D4 gives no origin.
(c) Momentum: STABLE/slightly rising, weak evidence. D5: natural colour, texture, light and organic rhythm are a "calmer counterweight to synthetic software surfaces," under the personality-over-polish theme; SK's "Best Biophilic Website Design Examples in 2026" [S] is a vendor showcase only. No survey data.
(d) Best for: wellness, sustainability, calm/focus products (SK [S]; D4 says it makes products "calmer, warmer, or more connected to a physical setting"). Avoid when: no source states it. Inference: avoid in heavy data/ops UIs.
(e) A11y risk: muted earth/green palettes and text over nature photos reduce contrast; gentle ambient motion. Mitigation: WCAG 1.4.3 on text over photos/textures (failure F83); prefers-reduced-motion for ambient animation (WCAG 2.3.3 AAA, technique C39). Neither D4 nor FCC discusses accessibility; the mapping is mine.
(f) Ingredients: organic/blob shapes with asymmetric curves (D4 organic-blob page), botanical imagery, earth tones, greens, blues, wood/stone/fabric textures, airy white space, gentle motion (D4, FCC, SK [S]).

## Unverified / weak
- Apple as aurora originator; Figma ~2017 enabling; specific origin of any style's UI incarnation.
- Blueprint momentum and anyone's origin; WCAG 1.4.11 number (not fetched).
- Biophilic originator/date; SK, CM, SH, KT, KIT only seen in search snippets.
- All "rising/stable" labels are editorial, not measured.


---

# Part E — CSS features and browser support

Method: versions come from @mdn/browser-compat-data v8.1.5 (data timestamp 2026-10-08, fetched from https://unpkg.com/@mdn/browser-compat-data@8.1.5/data.json). Baseline wording comes from the MDN page banners fetched today. Where MDN's rendered page did not include a banner, that cell says "unverified". Versions are "first version supporting unprefixed unless noted". "preview" = BCD marks it as preview/nightly only, not stable release.

| Feature | Chrome | Edge | Safari | Firefox | Baseline (MDN banner) | Source |
|---|---|---|---|---|---|---|
| backdrop-filter | 76 | 79 | 18 unprefixed; 9 with -webkit- | 103 (before 123 unsupported with unknown GPU vendor) | Baseline 2024, Newly available (since Sept 2024) | https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter |
| backdrop-filter: url(#svg) + feDisplacementMap | Works (Chromium) per blogs only | same | Reported broken/unreliable; WebKit bug 313914 (NEW, unassigned, May 2026) is for SVG filter on foreignObject, not exactly backdrop-filter | Conflicting sources | No Baseline; BCD has no separate url() entry | https://bugs.webkit.org/show_bug.cgi?id=313914 ; https://medium.com/ekino-france/liquid-glass-in-css-and-svg-839985fcb88d (blog, unverified) |
| grid-template-areas | 57 | 16 | 10.1 | 52 | Widely available (since Oct 2017) | https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-areas |
| subgrid | 117 | 117 | 16 | 71 | Widely available (since Sept 2023) | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid |
| View Transitions, same-document (document.startViewTransition) | 111 | 111 | 18 | 144 | Baseline 2025, Newly available (since Oct 2025) | https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition |
| View Transitions, cross-document (@view-transition) | 126 | 126 | 18.2 | not supported (false) | MDN banner unverified | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition |
| Scroll-driven animations (animation-timeline, scroll(), view(), animation-range) | 115 | 115 | 26 | preview only (not stable) | Limited availability | https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline |
| color-mix() | 111 | 111 | 16.2 | 113 | Widely available (since May 2023) | https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix |
| oklch() / oklab() | 111 | 111 | 15.4 | 113 | oklch: Widely available (since May 2023); oklab banner unverified | https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch |
| Relative color syntax (rgb(from ...)) | 122 (119-121 partial: channels scaled 0-1) | 122 (same) | 18 (16.4-17.6 partial: needs % / deg units) | 128 | MDN banner unverified (guide page shows none) | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Relative_colors |
| @property | 85 | 85 | 16.4 | 128 | Baseline 2024, Newly available (since July 2024) | https://developer.mozilla.org/en-US/docs/Web/CSS/@property |
| conic-gradient | 69 | 79 | 12.1 | 83 | Widely available (since Nov 2020) | https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient |
| mix-blend-mode | 41 | 79 | 8 | 32 | Widely available (since Jan 2020) | https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode |
| mask-image | 120 (1 with -webkit-) | 120 (79 with -webkit-) | 15.4 (4 with -webkit-) | 53 | Widely available (since Dec 2023) | https://developer.mozilla.org/en-US/docs/Web/CSS/mask-image |
| Container queries (@container size) | 105 | 105 | 16 | 110 | Widely available (since Feb 2023) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@container |
| :has() | 105 | 105 | 15.4 | 121 | Widely available (since Dec 2023) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:has |
| light-dark() | 123 | 123 | 17.5 | 120 | Baseline 2024, Newly available (since May 2024) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark |
| color-scheme | 81 | 81 | 13 | 96 | Widely available (since Jan 2022) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme |
| prefers-reduced-motion | 74 | 79 | 10.1 | 63 | Widely available (since Jan 2020) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion |
| prefers-contrast | 96 | 96 | 14.1 | 101 | Widely available (since May 2022) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-contrast |
| forced-colors (media) / forced-color-adjust | 89 | 79 | 16 (media); forced-color-adjust not supported | 89 (media); 113 (property) | forced-colors: Widely available (since Sept 2022) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors |
| IntersectionObserver | 51 | 15 | 12.1 | 55 | Widely available (since Mar 2019) | https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API |
| text-wrap: balance (text-wrap-style) | 130 via text-wrap-style (114 via text-wrap shorthand) | same | 17.5 | 124 via text-wrap-style (121 shorthand) | Baseline 2024, Newly available (since Oct 2024) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap-style |
| corner-shape (squircle = superellipse(2)) | 139 | 139 | preview only | preview only | Experimental, not Baseline | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape |
| field-sizing | 123 | 123 | 26.2 | 152 | Baseline 2026, Newly available | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing |
| @starting-style | 117 | 117 | 17.5 | 129 | Baseline since Aug 2024 (newly available) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style |
| Anchor positioning (anchor-name, anchor(), position-area) | 125 (position-area 129) | 125 (129) | 26 | 147 | Baseline 2026, Newly available (anchor-name page) | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name |

## Notes and caveats

- What each does (brief): backdrop-filter filters what is behind an element; grid-template-areas names grid regions; subgrid lets a nested grid inherit parent tracks; View Transitions animate between DOM states; animation-timeline ties animations to scroll/view progress; color-mix/oklch/relative colors compute colors in CSS; @property registers typed custom properties (animatable); conic-gradient/mix-blend-mode/mask-image are paint effects; container queries size-query a container; :has() is a parent selector; light-dark() + color-scheme pick light/dark values; prefers-* and forced-colors are user-preference media queries; IntersectionObserver reports visibility; text-wrap: balance evens line lengths; corner-shape reshapes border-radius corners; field-sizing auto-sizes form controls; @starting-style defines entry-transition start values; anchor positioning tethers elements to anchors.
- backdrop-filter: need `-webkit-backdrop-filter` alongside the unprefixed one for Safari 9-17. Needs a transparent/translucent background. Per MDN it is limited by the "backdrop root": ancestors with opacity<1, filter, mask, clip-path, mix-blend-mode, will-change of those, or backdrop-filter stop the effect from seeing content behind them. MDN's own text (first 100k chars read) says the value accepts an SVG filter (`url()`), but gives no per-browser data for it.
- SVG feDisplacementMap via backdrop-filter:url(#f): BCD has no entry, so browser support is **unverified** from primary sources. Blog sources (secondary, not verified) say the full refraction effect works only in Chromium, and disagree on Firefox (silently renders nothing vs falls back to blur). A WebKit bug (313914) shows an HTML-in-foreignObject + feDisplacementMap version failing in Safari 26 and working in Chrome and Firefox, which is a different technique. Treat as Chromium-only progressive enhancement and test Firefox/Safari yourself. @supports cannot reliably detect it (url() parses everywhere), so use a UA check or a feature probe for Chromium only if you must; otherwise ensure the base style looks acceptable if the url() part is dropped or ignored.
- Firefox backdrop-filter: before 123 unsupported on systems with unknown GPU vendor.
- View Transitions: same-document is now in all three engines (Firefox 144). Cross-document (@view-transition) has no Firefox support. Always guard with `if (document.startViewTransition)`.
- Scroll-driven animations: Firefox only has it in preview, so not safe to rely on; Safari 26+ only. Use `@supports (animation-timeline: scroll())` and make the non-animated state the default.
- Relative colors: Chrome 119-121 and Safari 16.4-17.6 resolve channels incorrectly (partial). Gate with `@supports (color: hsl(from white h s l))` (Chrome 122+/Safari 18+ pass reliably, older partial ones also pass the test but compute wrong, so treat as Chrome 122+/Safari 18+). Do not put var() in the @supports test.
- light-dark() needs `color-scheme: light dark` on :root, and Baseline is only "newly available"; fall back to custom properties switched by prefers-color-scheme.
- text-wrap: balance: MDN says only applies to short blocks (about 6 lines or fewer in Chromium, 10 in Firefox). Harmless if ignored.
- corner-shape: Chromium 139+ only; requires border-radius; falls back to ordinary rounded corners, which is a graceful default. MDN example uses `@supports not (corner-shape: scoop)`.
- field-sizing: Firefox 152 and Safari 26.2 are recent; many users still lack it. Fallback is just default fixed size or rows/cols/size attributes.
- Anchor positioning: BCD shows the `position-anchor` property as partial in earlier releases (Chrome 125-150, Firefox 147-150, Safari 26) with full status at Chrome 151, Firefox 151, Safari 27. So treat anchor positioning as risky for older versions; use `@supports (anchor-name: --a)` plus a JS/absolute positioning fallback, and test `position-anchor` specifically.
- mask-image: unprefixed only from Chrome/Edge 120; include `-webkit-mask-image` for older Chromium and Safari <15.4.
- prefers-reduced-motion, prefers-contrast, forced-colors: In forced-colors mode box-shadow is forced to none and non-url background-image to none, and backdrop-filter is not mentioned on the page, so keep real borders and solid backgrounds there. `forced-color-adjust` is not supported in Safari.
- Baseline wording drifts with time: "Newly available" features become "widely available" 30 months after they reach Baseline (my understanding, not checked on a source today), so backdrop-filter, @property, light-dark and text-wrap-style will flip over the next year.

## Fallback patterns

```css
/* backdrop-filter with solid fallback */
.glass { background: rgb(255 255 255 / .92); }
@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .glass { background: rgb(255 255 255 / .55);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
            backdrop-filter: blur(16px) saturate(160%); }
}
/* SVG refraction: Chromium-only enhancement, never required for legibility */
/* scroll-driven */
@supports (animation-timeline: view()) { .reveal { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; } }
/* relative color / color-mix */
.btn { background: #3b6ef5; }
@supports (color: hsl(from white h s l)) { .btn { background: hsl(from #3b6ef5 h s calc(l - 10)); } }
@supports (color: color-mix(in oklab, red, blue)) { .btn:hover { background: color-mix(in oklab, #3b6ef5, black 15%); } }
/* light-dark */
:root { color-scheme: light dark; --bg: #fff; } @media (prefers-color-scheme: dark) { :root { --bg: #111; } }
@supports (color: light-dark(red, blue)) { :root { --bg: light-dark(#fff, #111); } }
/* corner-shape, field-sizing, anchor */
@supports (corner-shape: squircle) { .card { corner-shape: squircle; } }
@supports (field-sizing: content) { textarea { field-sizing: content; } }
@supports (anchor-name: --a) and (position-area: top) { /* anchored tooltip */ }
/* view transitions */  /* if (document.startViewTransition) {...} else update(); */
@media (prefers-reduced-motion: reduce) { *,::before,::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
@media (forced-colors: active) { .glass { background: Canvas; border: 1px solid CanvasText; backdrop-filter: none; } }
@media (prefers-contrast: more) { .glass { background: Canvas; } }
```

## Unverified items
- MDN Baseline banners for: oklab, relative color syntax, cross-document view transitions, forced-color-adjust, container style/scroll-state queries (page fetch lacked or didn't show them).
- Support for SVG url() filters inside backdrop-filter in any browser (no primary source).
- The "30 months" widely-available rule (from memory).
- Fetched MDN page text was truncated at 100k chars and compat tables did not render; version numbers therefore come from BCD JSON, not the page tables.
