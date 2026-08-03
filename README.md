# IdlerTest1 — *Ashcombe* (working title)

An idle/incremental fantasy RPG for the web. You begin as one villager in a
Camelot-style feudal holding with a borrowed pick and a handful of elemental
runes; you end running a realm.

```bash
npm install
npm run dev        # play it
npm test           # 67 engine tests
npm run typecheck
npm run build
```

Live at **https://jgw2210.github.io/IdlerTest1/** (deployed from `main`).

## Status

The **framework** is built and runs: the tick engine, offline catch-up, the
skill system, the material ladder, the rune grammar, the gambit combat resolver,
the map, Archaeology and decipherment, surveying, succession, and persistence
all work end to end. It is a working skeleton with real content in it, not a
finished game — see *What is not built yet* below.

## The map

Ninety-one regions across five rings. Rings 0–3 (37 regions) are hand-authored;
rings 4–5 (54) are the **Outlands**, generated from a fixed world seed into six
named marches — so they validate, save and load exactly like authored content.

Rings 3–5 **intersperse** settled ground with wilds rather than drawing a hard
frontier, and the mix thins outward: ring 3 is 72% settled, ring 4 is even, ring
5 is 80% wilderness. Distance is the wilderness you cross to reach the next
place worth reaching.

| Ring | Holding | Foreign | Wild |
| --- | --- | --- | --- |
| 0–2 | 19 | — | — |
| 3 | 13 | — | 5 |
| 4 | — | 12 | 12 |
| 5 | — | 6 | 24 |

## The six powers

Out past ring three are other peoples, three holds each. Every power has three
things nobody else has: a **metal** that cannot be gathered anywhere (Rimesteel,
Emberglass, Bogsilver, Wardstone, Tidesteel, Moonsilver), a **tongue** their
holds are named from, and **words** — glyphs only they will teach.

That last one matters: seven glyphs are flagged tutor-exclusive and no
excavation at any depth will ever produce them. Digging gives you the words the
ground happened to keep; tutors give you the words a people chose to. The rune
grammar is therefore partly *geographic* — you cannot compose with the Hollow
Court's vocabulary until you have reached them and earned their patience.

Reaching a hold pays four ways: their goods on the market's yield table, their
glyphs for Insight (its only sink), a forward base that extends how far a survey
can push, and — at full standing — the hold itself.

Standing is earned by working their ground, not by a bar that fills on its own.

Three levels of zoom, because "granular" had to mean two different things:

| | |
| --- | --- |
| **The chart** | where in the world — hexes, drawn on vellum |
| **The locale** | where in the valley — an inset plan with sites placed on it |
| **The site** | how deep — layers you descend through |

The chart is not a viewport. It is a **sheet your character is drawing**. Ground
nobody has walked is blank paper, and how well a place is drawn depends on its
own `surveyed` value *and* on Cartography level — outlines and names at 1, terrain
symbols at 10, hachured relief and site marks at 22, roads at 34, compass rose
at 46, ruled border and marginalia at 58. The sheet also fits what has been
drawn rather than the whole world, so the view draws back as you explore and the
world visibly widens.

## Archaeology → Inscription → Runes → Cartography

Archaeology no longer drops materials with extra steps. Dig sites have **strata**
— deeper is older — and older strata yield older tablets. Inscription then opens
a tablet, and what comes out feeds a different system each time:

- a **glyph**, so the rune grammar gains a word (Second Age tablets reach level
  22, Elder 46, First Age everything — the deepest words need the deepest digs)
- a **lore** entry, so the setting explains itself
- a **map fragment**, which inks in a region your survey has not reached

That chain is why the depth layers exist at all.

## War

Claiming a hold at full standing already worked, so war needed a reason to
exist. Two of the six powers are **implacable** — the Cor Hen and the Hollow
Court will not treat at any standing, and the only way in is through. The rest
have an **aggression** rating and muster against ground *you* hold, so war is
mostly not your idea.

**Companies** are raised from the levy your held regions can bear (prosperity
and loyalty feed it) and armed from your own forge. Arms tier is the dominant
term in a company's power — thirty men in steel are worth nearly three times
thirty men with farm tools — which finally makes the metal ladder an industry
rather than a way to make one sword.

**Battles fight themselves** from a plan written in the same conditional
language as personal combat: *IF we have lost 60% THEN withdraw*. Stances that
need a role they do not have fall through to the next rule, so a plan that says
*flank* with no horse does not silently stall.

All four stakes are live:

- companies die and stay dead
- a lost assault can kill your commander, opening succession early — the heir
  inherits the war, the companies and the grudges
- marching on one power costs standing with every power watching
- a failed defence loses the region outright, and a muster arriving where you
  raised nobody takes it unopposed

Musters are telegraphed with roughly twenty minutes' warning and only *checked*
every fifteen simulated minutes, so a twelve-hour catch-up cannot roll an
invasion per tick or take ground while you were asleep without ever showing you
it was coming.

## Decisions taken

All twelve articles of the ballot in [`docs/DESIGN-CHARTER.md`](docs/DESIGN-CHARTER.md)
are resolved. The charter records the reasoning; this is the outcome.

| # | Decision | Chosen |
| --- | --- | --- |
| I | Core loop | **Focus & Retinue** — one focused action at full rate plus background slots at 35% |
| II | Offline | **Deterministic accrual**, 12h cap, fractional carry so nothing rounds away |
| III | Long arc | **Bloodline & Succession** — the person resets, the world does not |
| IV | Combat | **Gambit auto-battler** — a player-authored priority list |
| V | Magic | **Rune Grammar** — Element + Form + Modifiers + Trigger, computed |
| VI | Skill breadth | **Three children per parent** — 20 combat skills, variants inside a child |
| VII | Materials | **Ladder × Alloy × Quality** |
| VIII | Map | **Hex regions containing activity nodes** |
| IX | Numbers | **Grounded** — no scientific notation anywhere |
| X | Civilisation | **Continuous** — no mode switch |
| XI | Stack | **React + TypeScript + Vite**, IndexedDB, content-as-data |
| XII | Look | **Dark Arcane Slate** — near-black stone, rune-glow, gold leaf |

## How it is put together

```
src/
  engine/     pure, DOM-free, deterministic — the simulation
    rng.ts        seeded streams; fractional expectation settling
    curves.ts     every tuning constant and curve in one file
    types.ts      all game state, JSON-serialisable throughout
    skills.ts     additive parent xp, child level gating
    runes.ts      spell composition and resolution
    combat.ts     the gambit resolver
    inventory.ts  stacking, equipping, quality-adjusted stats, sorting
    tick.ts       the fixed-step simulation
    offline.ts    catch-up (the same engine, longer stride)
    save.ts       IndexedDB, ordered migrations, export/import
  content/    data packs — skills, materials, items, recipes, regions, glyphs, foes
  state/      the only bridge between engine and React
  ui/         components
```

Two properties are load-bearing and worth preserving:

1. **The engine never touches the DOM, a clock, or anything unserialisable.**
   That is why offline catch-up is not a separate formula to keep in sync — it
   is the same code with a longer stride — and why the simulation can move
   behind a worker boundary later without a rewrite.
2. **Content is data.** All 250+ items and their recipes are generated from a
   thirteen-row material ladder. Adding a tier or a weapon shape is authoring,
   not programming. `validateContent()` catches the referential typos the
   compiler cannot, in tests always and at boot in dev.

## What is not built yet

Honest list, roughly in the order I would do them:

- **Prosperity and loyalty are static.** They feed the levy but nothing grows or
  erodes them, so a held region never improves or rebels.
- **Companies do not recover.** A mauled company stays mauled; there is no
  reinforcing it short of disbanding and raising afresh.
- **The six trade metals still have no smithing lines.** They arm companies now,
  which is a use, but nothing is forged *from* them.
- **Insight has one sink.** Tutors spend it; nothing else does.
- **No siege distinction.** Engines are a stance modifier rather than a real
  siege system, and holds have no walls to speak of.
- **The worker boundary.** The engine is worker-ready but currently runs on the
  main thread via a fixed-timestep rAF loop.
- Mastery trees, affixes on Legendary rolls, commissions, retinue training,
  and consumables being consumable.

## Files

| File | What it is |
| --- | --- |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Every design question put to a poll and what was chosen, across all five rounds |
| [`docs/DESIGN-CHARTER.md`](docs/DESIGN-CHARTER.md) | Scrutiny of the brief, the twelve-article ballot, and reference specs |
| [`docs/ballot.html`](docs/ballot.html) | The ballot as a laid-out page, with an interactive rune composer |
