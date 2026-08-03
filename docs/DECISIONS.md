# Decisions log

Every design question put to a poll, and what was chosen. Kept here because
chat scrolls and this does not.

The twelve-article ballot and the reasoning behind each option live in
[`DESIGN-CHARTER.md`](DESIGN-CHARTER.md); this file is the record of outcomes,
including the rounds that came after the charter was written.

---

## Round 1 — the mechanical spine

| Article | Chosen | What it means |
| --- | --- | --- |
| **I-B** | Focus & Retinue | One focused action at full rate plus background slots at 35%. Retinue slots are the master progression currency. |
| **IV-A** | Gambit auto-battler | Combat resolves itself from a player-authored priority list. |
| **V-A** | Rune Grammar | Element + Form + Modifiers + Trigger, with cost and effect computed from the parts. |
| **VI-B** | Three children per parent | 20 combat skills. Weapon variants live inside a child and add no bar. |

## Round 2 — feel and long arc

| Article | Chosen | What it means |
| --- | --- | --- |
| **III-A** | Bloodline & Succession | Characters age; an heir inherits 25% plus a trait. The person resets, the world does not. |
| **VII-B** | Ladder × Alloy × Quality | Tier for access, alloys for profile, quality so old strata stay competitive. |
| **IX-A** | Grounded numbers | Hundreds to low millions. No scientific notation anywhere. |
| **XII-C** | Dark Arcane Slate | Near-black stone, rune-glow, gold leaf. Chosen over the Assay Ledger look of the ballot page itself. |

## Proceeded on the recommendation (not polled)

| Article | Chosen |
| --- | --- |
| **II-A** | Deterministic offline accrual, 12h cap, fractional carry |
| **VIII-A** | Hex regions containing activity nodes |
| **X-A** | Continuous village→realm, no mode switch |
| **XI-A** | React + TypeScript + Vite, IndexedDB, content-as-data |

## Round 3 — the map

| Question | Chosen |
| --- | --- |
| Map scale | **Authored rings 0–3, procedural Outlands in 4–5** — *your amendment to the recommended option, which had authored only 0–2* |
| Sub-areas | **Locale map plus depth** — an inset plan per hex, and layers you descend through inside each site |
| Map look | **The chart you are drawing** — vellum, blank where nobody has walked, detail keyed to Cartography level |
| Glyph discovery | **Strata → tablets → decipherment** — Archaeology feeds Inscription feeds the rune grammar and the map |

## Round 4 — the far map

*Prompted by your amendment: "intersperse rings 3–5 with both territories and
Outland areas".*

| Question | Chosen |
| --- | --- |
| Who is out there | **Foreign powers** — distinct peoples with their own metals, tongues and magic |
| The mix | **Thinning gradient** — ring 3 mostly settled, ring 4 even, ring 5 mostly wild |
| Payoff | **All four** — tutors and glyph trade, a forward base, unique goods, and standing toward an eventual claim |

## Round 5 — war

| Question | Chosen |
| --- | --- |
| Armies | **Companies you raise and equip** — levy from held ground, armed from your own forge |
| Battles | **Battle plans, like gambits** — the same conditional language at army scale |
| Casus belli | **Some will never treat, and some want your land** — two implacable powers; the rest muster against you |
| Stakes | **All four** — companies die permanently, your character can fall, standing collapses across the board, regions are lost and must be retaken |

---

## Amendments made outside a poll

- **Rings 3–5 interspersed.** Originally rings 4–5 were uniformly Outland,
  making a hard frontier. Now settled ground frays into wilds across all three
  outer rings.
- **Deploy from `main` to GitHub Pages**, so the build can be reviewed on a
  phone.
