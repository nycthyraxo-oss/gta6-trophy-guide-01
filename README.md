[![make.fun bounty](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun rank](https://make.fun/badge/gta6-trophy-guide-01/nycthyraxo-oss/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![make.fun reward](https://make.fun/badge/gta6-trophy-guide-01/nycthyraxo-oss/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

# Leonida Ledger — GTA VI Trophy Guide & Tracker

An offline web app: a guide and a tracker for all **55 PlayStation 5 trophies** of Grand Theft Auto VI (1 Platinum, 2 Gold, 6 Silver, 46 Bronze; 28 hidden). Every trophy shows its official name, description and grade exactly as PlayStation publishes them, plus a guide written in our own words with its sources cited, short how-to steps, a chapter tag, and a missable flag where it applies.

## What it does

- **Tracker** — tick trophies off; progress is saved in the browser (`localStorage`, key `leonida-ledger-v1`), with a progress bar and counts by grade. Export progress to JSON and import it back; reset clears it.
- **Filters** — text search, grade, kind (story / side / collectible / combat / exploration / robbery / completion), earned vs remaining, and a missable-only toggle.
- **Spoiler setting** — on by default: the 28 hidden trophies show only their grade and "Hidden trophy — earn it to reveal" until you earn them (or turn spoilers off).
- **Platinum roadmap** — five phases built from the official descriptions: Chapter 1 setup (including the one missable meditation), Chapter 2 partner unlocks, Chapters 3–4 robberies, post-story side finales, and the 100% grind, with the save discipline the game demands (no mission replay, no New Game Plus).
- **Missable flag** — only one trophy can be missed: **Positive Mental Attitude** (the Chapter 1 balcony meditation). It is flagged on its card, in the roadmap, and in the filters.
- **Deep links** — `?view=roadmap|guide`, `?grade=`, `?kind=`, `?trophy=<id>`, `?spoilers=off`.
- **Offline** — static files under `app/`, no build step, no dependencies, no network requests at run time. The look is CSS-only and original (deep purple / teal / coral dusk); no Rockstar logo or artwork anywhere.

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `app/` with any static file server. Opening `index.html` directly from `file://` may not load the data file in Chrome — use the server above.

## Approach

One source of truth: `app/data/trophies.json` holds all 55 trophies — official name, description and grade copied verbatim from the kit starter (the official list as Exophase / PSNProfiles listed it on 2026-11-18), plus our own kind taxonomy, hidden and missable flags, chapter, a guide in our own words, steps, and per-trophy sources. `app/app.js` renders everything from that file; `main.ts` keeps the starter's copy-and-dossier logic and adds a check that the data file parses and holds exactly 55 trophies before copying.

Guide facts were researched from Output Lag, GTABase, Playday.one, TrueAchievements, KeenGamer and Press Start, and are cited per trophy. Five trophies have no verified method at launch (In The Beginning…, Capital Offense, Bad Luck, I Guess, The Truth Is Out There, Ten Pin) — their guides say so honestly instead of presenting a guess as fact.

## Validation

- 55 trophies in `app/data/trophies.json`; names, descriptions and grades verified byte-for-byte against the kit starter's official list.
- Grades: 1 Platinum, 2 Gold, 6 Silver, 46 Bronze. Hidden: 28. Missable: 1 (Positive Mental Attitude).
- `main.ts` run twice into two different output dirs; outputs byte-identical (`diff -r` clean).
- `node cli/makefun.mjs check --kit . --repo <repo>` run from the kit directory: passes (transcript checks are the site's, not local).
- Served app checked in headless Chromium: all 55 trophies render, checking a box persists after reload, export downloads JSON, the spoiler toggle hides hidden trophies, filters work, the roadmap renders, and no network requests are made.
- Screenshots: 4 real renders of this code at 1280×800, each ≤ 256 KiB.

## Limitations — where this entry loses

- **5 trophies have unconfirmed methods.** Their guides say so honestly; a guide that invents steps for them would look more complete and be wrong. This entry chooses honesty over coverage there.
- **Depth is limited to launch-week sources.** Steps are short and practical; this is not a video walkthrough and it has no map pins — a richer guide with per-trophy maps would beat it on detail.
- **The kit starter is a simpler checklist.** It loads marginally faster and shows every trophy name at once with no spoiler hiding; this entry trades that for guides, a roadmap, and spoiler protection, so a reader who only wants a bare list may prefer the starter.
- **`file://` opening may not load the data file in Chrome** — serve it with `node serve.ts` as documented.
- Guide facts depend on launch-week reporting; if Rockstar patches trophy behaviour, the guides need updating.
