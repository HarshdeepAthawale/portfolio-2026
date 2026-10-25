# Minecraft portfolio reference analysis

## Screen and interaction map

| Reference screen | Presentation | Rebuilt screen and content |
| --- | --- | --- |
| Title screen | Personal stone wordmark, angled yellow splash, 3 primary buttons, 4 secondary buttons, version and disclaimer | Harshdeep Athawale logo; Experience, Projects, About Me, GitHub, Blog, Skills, LinkedIn |
| Experience | Fixed title/footer, inset dark viewport, internal pixel scrollbar, date/location column, green square bullets, small technology tags | Existing HackerOne, GDG TIET and Iris Intelligence entries, plus TIET education |
| Select Project | Search field, selectable server-style entries, monogram icons, year, truncated description, stack tags, green signal bars, disabled actions until selection | WAF pipeline and deepfake system; search, keyboard selection, Open, GitHub, Cancel and Back |
| About Me | Profile portrait and facts beside warm inventory panels; expandable item slots and purple item tooltips | Existing portrait, bio, Pune location, TIET education, availability, resume and four content-driven slots |
| Contact | Brown-bound, two-page parchment book, email/subject/message, character count and footer actions | Accessible book dialog, compose-in-email-app action and cancel. No external email service is configured or claimed. |
| Skills | Beveled gray enchanting GUI, floating open book, changing galactic glyphs, rising purple particles, diamond-tool category tabs, XP orbs, enchanted-book skills | Four categories grounded in existing education, projects, and stack: Languages, Security & Research, AI & Development, Tools & Infra |
| Blog | Search, selectable article rows, book thumbnails, date and category, selection-gated Open Article | Existing Netflix research and transformer WAF articles with full MDX content retained |
| Project details | Fixed game title, inset dark content, image panels, scrolling viewport, Back control | Full project write-ups, covers, stack tags, source links, and MDX |
| Additional user content | No direct reference counterpart | Existing achievements become an Advancements screen; achievement details, favourites, books, resume, draft previews and 404 now share the game screen frame; admin routes retain their existing editor design |

## Measurements and type

- The reference GUI scales with `--u: clamp(1.5px, min(.2344vw, .375vh), 3.25px)`.
- Main logo: 260 GUI units wide, capped at 92vw; 1600:352 aspect ratio; top offset 4vh.
- Main menu: 200 GUI units, centered on both axes; buttons 20 units tall, 8-unit type, 3-unit vertical gap.
- Secondary row: 20-unit social controls surrounding Blog/Skills; 2-unit gaps and an 8-unit top margin.
- Regular and bold Minecraft OTF faces are self-hosted. Galactic TTF is reserved for enchantment text. Menus use the Minecraft face. Open blog articles intentionally switch to the reference’s Georgia body and system sans-serif headings.
- Screen headings: 24px, with dark 2px text shadows. Work body: 14–15px at 1.65 line height. Tags: 12px. Primary game text is white; secondary text is gray; active/enchantment text is yellow or XP green.
- Stone controls use the reference's nine-patch-like button background stretched across the control. Hover increases brightness and changes text to yellow; pressed state darkens immediately.
- Scrollbars use a #252525 track, #aaa thumb, 14px width and inset dark edges.
- Inventory palette: #c6c6c6 GUI, #b0b0b0 book stage, #514b3b item panels, #29261e borders and white/gray bevels.
- Below 900px, About and Enchant switch to single-column layouts. Fixed screen height plus internal scroll keeps Back and sound controls reachable.

## Motion and lifecycle

- Panorama is a six-texture, inward-facing cube with a 75-degree camera field of view. Horizontal rotation is 0.04 radians/second; vertical drift is `0.05 * sin(time * 0.1)`. Render rate is limited to roughly 30fps and device pixel ratio to 1.5. A still background remains if WebGL is unavailable.
- Terrain navigation follows 12 → 34 → 61 → 84 → 93 → 100%, displaying Loading level, Building terrain, Generating chunks and Ready. It fades over 220ms after navigation commits, with a timeout to prevent a stuck overlay.
- Yellow splash: 1-second scale pulse, 1–1.1, at -20 degrees.
- Open book: 4.6-second vertical/rotation/page-width motion. Enchantment particles rise 84px and fade; glyphs change every 340ms.
- Inventory items bob 3px; XP orbs scale to 1.07. Selecting a skill category flashes purple for 520ms.
- GUI dialogs enter over 140ms from a 6px offset and 0.97 scale.
- Sound begins muted. Click effects and a four-track music queue respond to explicit sound enablement. Volume, mute, and motion preferences persist locally. Music files are not preloaded before use.
- Reduced motion respects the browser preference by default and can be changed in Options. Animated panorama, CSS animation, and smooth movement stop in Reduced mode.

## Integration and scope

The implementation uses the existing Next.js 15 / React 19 / TypeScript stack. Three.js is dynamically loaded only for the shared panorama. Existing JSON content, MDX articles, resume, photos, API routes, analytics and admin features are preserved. The new public design is scoped under `.minecraft-root`, leaving the existing admin palette independent. `/work` continues to display Experience, while `/experience` and `/skills` are added to the sitemap.

This is a local revamp of the existing repository. No changes have been published to the live domain.

## Asset notes

The requested reference's public Minecraft fonts, button textures, panorama faces, game item art, and audio have been saved under `public/minecraft/` so the site does not hotlink them. The user's portrait, project covers, resume, achievement images, and biography remain their own existing assets. No other person's logo, portrait, biography, projects, or social links are used.

The personalized title is a perspective-extruded SVG using the clean MineCrafter regular font by **MadPixel / PurePixel**. The original font and supplied license are retained in `public/minecraft/fonts/`; the supplied license permits noncommercial use with attribution. Font source: https://www.dafont.com/minecrafter.font. Minecraft game materials remain associated with their respective owners. The on-screen unofficial-product disclaimer is retained.

## Verification

- Production compilation, lint checks, TypeScript validation and generation of 31 static pages succeeded.
- HTTP checks returned 200 for home, experience, projects, about, skills, blog, achievements, both project details, a full blog post, the resume PDF, sitemap and admin login.
- Browser review covered the desktop title screen, project filtering and selection, skill category switching, the Options dialog, Reduced motion selection, About inventory expansion, contact validation and Escape focus restoration.
- A 390px embedded viewport was visually checked for the title screen, project menu and enchanting screen.
- The screenshot used for the social preview was captured from the local running site.


## Motion and title fidelity correction

The existing home tab was paused by its saved Reduced-motion setting. Changing Options in another tab previously left that homepage stale; storage events now synchronize all open portfolio tabs. A regression check covers that exact scenario and exercises the actual panorama component with a controlled clock, verifying reference-speed rotation, Reduced/Full transitions, visibility pausing and cleanup. Run `node --test scripts/minecraft-regression.test.cjs`.

The original title used block stone lettering with separate shaded side and bottom faces. The earlier cracked font cut large gaps through letter silhouettes and flattened the depth. `scripts/generate-minecraft-logo.py` now generates clean solid faces with perspective, extruded geometry, subtle surface fractures, and the original-style counters. The yellow splash is fixed to `CSE@TIET` as requested.

The correction passed a fresh production build and the three existing motion regression checks. The running homepage returned 200 with the `CSE@TIET` splash and updated logo. Live playback could not be rechecked after the correction because browser control was disabled in Work settings; the earlier browser inspection did confirm the affected tab was in Reduced mode, and Full was selected there before browser access was disabled.


## Full page spacing and typography audit — 26 October 2026

This pass compared the reference’s HTML, its delivered CSS and JavaScript, and the supplied screen recording. The table records measured reference values implemented in the local site, rather than estimates from the screenshots.

| Area | Corrections |
| --- | --- |
| Shared frame | 20px top / 16px side and bottom padding; 24px/32px heading with a 16px bottom gap; 16px gap above Back; extra 19 GUI units below mobile actions only. Inner world combines the reference’s 40% panorama shade and 65% page shade (79% effective black). |
| Home splash | Restored the original centered anchor: left 88% / top 68% on desktop and left 64% / top 76% below 640px, with separate -50% translation so the rotating pulse does not cancel it. Kept the user’s exact CSE@TIET text. |
| Experience | 980px content width, 180px date column, 24px column gap, 20px vertical row padding; exact title/body/tag sizes, gray location text, green square bullets; short dates prevent column overflow. |
| Projects | Full-width outer panel, 540px search, 1040px list, 80px/64px icons, 24px/20px titles, 16px/14px descriptions, 16px/12px row padding, four signal bars and reference selection states. |
| About | 1180px frame, 300px sidebar, 14px grid gap, 16px inset; corrected profile/fact/slot sizes, per-item animation timing, tooltip position and expanded note spacing. Retained the user’s requested waist-up portrait. |
| Contact | 400px parchment pages with 28px horizontal inset, 26px field gap, 29px ruled lines, pixel feather, two compact actions and stacking below 720px. Uses the user’s email app because no send-email service is configured. |
| Skills | 320px book column, 168px book stage, 200px book, 18px grid gap, 48px category slots and 46px skill slots; original five particle trajectories and delays. Long-label tooltips sit outside the scrolling grid so they are not clipped. |
| Blog list | 640px search, 850px list, 80px/64px covers, 96px/82px minimum row height, exact title/description/meta sizes, hover play marker and selection-gated actions. |
| Blog articles | 1080px outer panel, 788px text column, 46px/22px horizontal inset, Georgia 18px/1.85 body, system sans-serif title/headings and original mobile overrides. Articles scroll with the document and retain the fixed world background. |
| Project details | Small centered heading, full-width scroll viewport, square dark content cards, natural-ratio covers, 14px body text and a compact 88-unit Back button. |
| Options | 420px GUI, 20px inset, 20px heading, 32px flat bevelled toggles, correct selected purple/yellow state, volume steps of 5%, original track loudness gains and shuffled queue. |
| Additional routes | Favourites, books, resume, achievement details, draft previews and 404 use the same heading, footer, pixel font, panel borders and scrolling conventions. Content and editing APIs are retained. |

Experience, Projects and About now use the same Lenis wheel smoothing as the reference (lerp 0.16), with native keyboard/touch scrolling, resize synchronization and cleanup. Reduced motion switches those panes back to native scrolling. Escape uses each screen’s actual parent route, so an article goes back to Blog and a project goes back to Projects.

Live browser access is disabled in Work settings during this pass. Earlier browser screenshots are not claimed as verification of these final edits. This pass can verify the source measurements, production build, HTTP output and motion regressions; a new side-by-side rendered inspection remains unavailable until browser control is enabled.

The expanded regression suite also exercises the real smooth-scroll component with controlled Lenis and resize observers: wheel inertia uses the measured 0.16 lerp, native input synchronizes the current position, Reduced destroys the animator and subscriptions, and Full can restart it. All four regression checks pass.

Final handoff verification: the production build including the final splash fit, preview article flow, 404 and Options icon fixes completed with exit code 0; compilation, lint/types and all 31 static pages succeeded. Claude continuation notes are in `.claude/CLAUDE_HANDOFF.md`.
