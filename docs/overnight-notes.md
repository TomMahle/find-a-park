> **About this file:** handoff notes that Claude Code wrote at the end of the
> unattended overnight build (about 22:05 on 2026-10-13), for me to read in
> the morning. They were originally kept outside the repo, as the text below
> says; they're included here unedited apart from this preface (and automatic
> whitespace formatting), so details
> like test counts and "not fixed" items reflect that moment. Later changes
> are in the git history and the README.

# Morning notes: Find a Park

These notes are for you, not for the submission. They live outside the repo
so they don't end up in the zip.

## Where things are

- **Code:** `find-a-park/` here, and on GitHub as the `build` branch of
  https://github.com/TomMahle/find-a-park (private). I did not merge to `main`.
- **Run it:** `cd find-a-park && pnpm dev` → http://localhost:3000
- **Checks:** `pnpm check` (types, lint, format, 49 unit tests) and
  `pnpm test:e2e` (79 browser tests run on desktop + phone, about 15 s after
  the build). Both pass locally, the map-heavy suites passed 3× in a row with
  no flakes, and **CI is green on the `build` branch** (check + e2e on Linux).
- **Screenshots:** `find-a-park/docs/screenshots/` (`pnpm screenshots` regenerates them).

## Things only you can decide

1. **The time limit.** The brief says 90 min–2 h in total. From the commit log:
   - The scaffold went in at 20:28 and setup was done by about 20:40 with you.
   - The overnight build ran from about 21:05 to about 22:05.
   - The unredacted logs will show all of this.
   - The README's "Time spent" is blank for you to fill in honestly. If unsure
     how unattended agent time counts, ask the recruiter.
2. **The README is a draft in my voice.** Rewrite it in yours, especially:
   - **"How I checked it":** they'll ask you about it.
   - **"Review":** your own notes.
   - **"AI use"** and **"Time spent"**: both left blank for you.
3. **Transcripts.** The brief requires the _full, unredacted_ logs from every
   tool.
   - Export this session from the app; I can help.
   - I also used four subagents (docs research, accessibility audit, code
     review, a fresh-eyes README check). This transcript contains their
     _reports_, but each also has its own internal transcript. To be safe, include those too, or ask the recruiter. I can
     help you find them.

## Decisions I made on your behalf (check you agree)

- **City:** "New York City" with a fictional parks listing; the data is
  NYC-shaped, and the footer says it's sample data.
- **Search is the only optional feature built.** It searches name, address and
  amenities, not descriptions, to avoid false matches. No filters, no "near
  me", no "open now".
- **Libraries:** zod was dropped for small hand-written normalizers (easier to
  review for a dozen fields).
- **Cedar Hill's coordinates are left as given** but flagged in the README:
  they're exactly NYC City Hall's, which looks like a placeholder.
- **The "you were here" highlight:** the park whose popup was open when you left
  stays highlighted when you come Back. It began as a side effect of how
  react-leaflet tears down popups; I kept it because focus also returns to
  that park. Easy to remove if you don't like it.
- **Real 404s over Next's instant-navigation check** on the details route
  (`export const instant = false`, explained in a comment).
- **Kept Next 16's `cacheComponents` default** (it keeps the list state when
  you go Back) and worked around what it breaks in Leaflet.

## Bugs found, and how (good material for "how did you check the AI's work")

| Bug                                                                          | Found by                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Map crashed after visiting a park and pressing Back (`<Activity>`)           | Docs agent warned, I confirmed in the browser                      |
| Focus didn't enter the popup (portal renders after `popupopen`)              | My browser testing                                                 |
| Focus didn't enter the popup on the _second_ open                            | My browser testing                                                 |
| Escape didn't close popups                                                   | My browser testing                                                 |
| Focus went to `<body>` after closing a popup on phones                       | My browser testing                                                 |
| Dark-mode popup text unreadable (Leaflet CSS loads after ours)               | My browser testing                                                 |
| "Show on map : Park" (stray pause) in button names                           | A failing Playwright test                                          |
| Overlapping markers at the city view on phones (WCAG 2.5.8)                  | axe; accepted under the "equivalent control" exception, documented |
| Popup link 3.5:1 contrast in dark mode (axe passed!)                         | Reviewing screenshots by eye                                       |
| Test stub tile was semi-transparent blue, not blank                          | Reviewing screenshots by eye                                       |
| Back replayed the last "Show on map"                                         | Code-review agent                                                  |
| "Show on map" left the park off-center                                       | Code-review agent, then my trace showed the cause                  |
| Pins drawn ~4px off their location (CSS cascade)                             | Both review agents, confirmed in the browser                       |
| Focus stranded after navigation (Next leaves it to the app)                  | Accessibility agent, confirmed in the browser                      |
| Map container unnamed, focus ring clipped; dark-mode ring invisible on tiles | Accessibility agent                                                |
| Selection stuck on a park hidden by search                                   | Code-review agent; my first fix was wrong, and a test caught it    |
| README overclaimed (test counts, 44px targets, "static", CI coverage)        | Fresh-clone README agent                                           |

Reviewer claims I checked and found **wrong or overstated**:

- "The pin is 7px left of its location": it was centered horizontally; only
  the vertical offset was real.
- "Leaflet's link color fails": it had already been fixed by then.

## Code I'd read most closely before the interview

1. `src/components/stable-map-container.tsx`: why it exists, and its eviction
   limitation (the comment explains both).
2. `src/components/park-map.tsx`, especially `ShowOnMap` (nonce guard, `moveend`),
   `PopupFocusManager`, `MapKeyboardSupport` and `enhanceMarkerElement`. The
   focus handling is the subtlest code in the app.
3. `src/lib/parks/normalize.ts`: the "never invent data" policy in one place.
4. `src/components/route-focus.tsx`: focus after navigation.
5. `src/components/park-explorer.tsx`: `updateQuery` clearing the selection.

## Not fixed (and why)

- **Leaflet's zoom buttons come after all 12 markers in Tab order.** Changing
  Leaflet's DOM order is invasive; the list is the primary keyboard path.
- **No loading feedback when opening a park.** Pages are static and fast
  locally; it might matter on slow networks.
- **No CSP or security headers.** Listed in the README's next steps.
- **Screen reader behavior is untested on real VoiceOver/NVDA.** I tested the
  semantics, not the actual speech. Worth 10 minutes with VoiceOver
  (Cmd+F5) before the interview.
- **No real phone or Safari testing**: only Chromium at phone sizes.

## Dev-environment notes

- Twice the dev server served a stale `globals.css`: once a file watcher
  missed a write (a restart fixed it), and once I wrongly ran an edit and a
  build in parallel. If CSS looks stale, restart `pnpm dev`.
