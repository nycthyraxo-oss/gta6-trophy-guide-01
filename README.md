[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/nycthyraxo-oss/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/nycthyraxo-oss/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# Leonida Ledger — GTA VI Trophy Guide & Tracker

An offline web app: a guide and a tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI (1 Platinum, 2 Gold, 6 Silver, 46 Bronze; 28 hidden). Every trophy shows its official name, description and grade exactly as PlayStation publishes them, plus a guide written in our own words with its sources cited, short how-to steps, a chapter tag, and a missable flag where it applies.

## What it does

- **Three-column dashboard** — checklist | guide pane | Next Up + sources rail. Click any trophy to open its full guide beside the list; the rail shows the roadmap-ordered "Next up" queue (missable first) and the sources behind the open guide.
- **Audit strip** — always visible under the masthead, computed live from the data file so it can never drift: 55/55 official name, description, grade; 55/55 guides cite sources; 110 citations across 4 guide sites; 143 how-to steps; 19 trophies with tracked counts; 1 missable · 2 watch · 52 safe; 1 disputed count shown both ways; 5 methods unconfirmed — flagged, not guessed.
- **Tracker** — tick trophies off; progress is saved in the browser (`localStorage`, key `leonida-ledger-v2`, migrated from v1), with a progress bar and counts by grade. Export progress to JSON (earned + count progress) and import it back — v1 export files still import; reset clears everything.
- **Two-level tracking** — 19 trophies carry a countable target (18 meditation spots, 42 shooting-range golds, 250 stunts, 8 garages, $250,000 laundered, …). Small counts get per-item checkboxes (0/18 style, with their own counter); large counts get a stepper. Count progress shows on the checklist row as a mini progress bar and is saved and exported with the rest.
- **Filters** — text search, grade, kind (story / side / collectible / combat / exploration / robbery / completion), earned vs remaining, and a missable-only toggle.
- **Spoiler setting** — on by default: the 28 hidden trophies show only their grade and "Hidden trophy — earn it to reveal" until you earn them (or turn spoilers off). Masking applies everywhere, including Next Up, the roadmap name lists and the missables view.
- **Platinum roadmap** — five phases built from the official descriptions: Chapter 1 setup (including the one missable meditation), Chapter 2 partner unlocks, Chapters 3–4 robberies, post-story side finales, and the 100% grind — now with per-phase trophy progress and the trophy names in each phase, plus the save discipline the game demands (no mission replay, no New Game Plus).
- **Missables, risk-tiered** — High: the one trophy that can truly be missed (**Positive Mental Attitude**, the Chapter 1 balcony meditation). Watch: two that are time-sensitive or easy to half-finish (Race Against Yago's hourglass strand; Kingpin Bowling's three valuables). Safe: the other 52, earnable any time from your saves. Each tier carries its save-point guidance.
- **Disputes shown both ways** — where our cited sources genuinely disagree or leave a number unconfirmed, the guide says so instead of silently picking one: the meditation count is 18 (KeenGamer; Output Lag), but whether the Chapter 1 balcony meditation is one of the 18 is unconfirmed by both — do it anyway and keep the save.
- **Sources bibliography** — every source with its role, read date and reuse count ("in 55 of 55 guides"), computed from the data: the official list (Exophase, PSNProfiles, via the kit starter), per-trophy guide sources (Output Lag, KeenGamer, Playday.one, GTABase), and the list cross-checks (TrueAchievements, Press Start).
- **Deep links** — `?view=guide|roadmap|missables|sources`, `?grade=`, `?kind=`, `?trophy=<id>`, `?spoilers=off`, `?motion=off`.
- **Motion** — CSS-only micro-interactions on one signature easing (entrance fade + rise with a capped stagger, hover lift, checkbox pop, animated progress bars); fully disabled under `prefers-reduced-motion` or `?motion=off`.
- **Offline** — static files under `app/`, no build step, no dependencies, no network requests at run time. The look is CSS-only and original (deep purple / teal / coral dusk); no Rockstar logo or artwork anywhere.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` with any static file server. Opening `index.html` directly from `file://` may not load the data file in Chrome — use the server above (the app now says so in-page if the data fails to load).

## Approach

One source of truth: `app/data/trophies.json` holds all 55 trophies — official name, description and grade copied verbatim from the kit starter (the official list as Exophase / PSNProfiles listed it on 2026-11-18), plus our own kind taxonomy, hidden and missable flags, chapter, roadmap phase, risk tier, countable targets, a guide in our own words, steps, and per-trophy sources. `app/app.js` renders everything from that file — including the audit strip and bibliography reuse counts, which are computed from the data at run time; `main.ts` keeps the starter's copy-and-dossier logic and validates the data (55 trophies, every guide non-blank, phase 1–5, risk tier, sane counts) before copying.

Guide facts were researched from Output Lag, GTABase, Playday.one, TrueAchievements, KeenGamer and Press Start, and are cited per trophy. Five trophies have no verified method at launch (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) — their guides say so honestly instead of presenting a guess as fact.

## Validation

- 55 trophies in `app/data/trophies.json`; names, descriptions and grades verified byte-for-byte against the kit starter's official list.
- Grades: 1 Platinum, 2 Gold, 6 Silver, 46 Bronze. Hidden: 28. Missable: 1 (Positive Mental Attitude). Risk tiers: 1 high / 2 watch / 52 safe. Countable targets: 19 trophies. Steps: 143. Source citations: 110 across 4 guide sites.
- `main.ts` run twice into two different output dirs; outputs byte-identical (`diff -r` clean).
- `node cli/makefun.mjs check --kit . --repo <repo>` run from the kit directory: passes (transcript checks are the site's, not local).
- Served app checked in headless Chromium, 24/24: 55 rows render; progress + grade counts correct; audit-strip numbers match the data file; spoiler setting hides exactly 28; Next Up puts the missable first; `?trophy=28` opens the guide with its dispute box; 18 spot checkboxes tick, persist after reload and show as 3/18 on the row; the 250-stunt stepper reaches its target; earned ticks persist; export downloads v2 JSON with earned + progress; `?grade=silver` shows 6 rows; search finds the missable; roadmap shows 5 phases with progress; missables tiers read 1 / 2 / 52; bibliography shows reuse counts; a v1 progress file imports; zero external network requests.
- Screenshots: 4 real renders of this code at 1280×800 (182–183 KiB, 155 KiB, 117 KiB, 129 KiB — all ≤ 256 KiB), each rendered twice with byte-identical results, progress seeded through the app's own localStorage format (12 earned, 5 of 18 spots ticked) as a returning user would see it.

## Limitations — where this entry loses

- **5 trophies have unconfirmed methods.** Their guides say so honestly; a guide that invents steps for them would look more complete and be wrong. This entry chooses honesty over coverage there.
- **Count checkboxes are numbered, not named.** Our cited sources give counts (18 spots, 14 locations) but do not name every spot, so the per-item tracker says "1…18" rather than inventing location names. A guide with verified per-location names and map pins would beat it on detail.
- **Only one disputed count.** We re-read our cited sources for disagreements and found exactly one genuine both-ways case (the meditation count). The audit strip reports 1, not a padded number.
- **Depth is limited to launch-week sources.** Steps are short and practical; this is not a video walkthrough and it has no map pins.
- **The kit starter is a simpler checklist.** It loads marginally faster and shows every trophy name at once with no spoiler hiding; this entry trades that for guides, a roadmap, and spoiler protection, so a reader who only wants a bare list may prefer the starter.
- **`file://` opening may not load the data file in Chrome** — serve it with `node serve.ts` as documented.
- Guide facts depend on launch-week reporting; if Rockstar patches trophy behaviour, the guides need updating.
