# Ashcombe — Design Charter & Decision Ballot

> Working title. An idle/incremental fantasy RPG that begins with one villager
> and ends with a realm. Web app.

This document does two things:

1. **Scrutinises** the brief — where it is strong, where it contains hidden
   tensions, and what it does not yet specify but must.
2. **Puts twelve decisions to a ballot.** Each has options coded `I-A`, `I-B`,
   and so on. One is marked *Recommended* with reasoning. Nothing below is
   built yet; this is the fork in the road.

---

## Part 1 — Scrutiny of the brief

### 1.1 What is already strong

- **The setting arc is genuinely good.** Villager → landed figure → ruler is a
  natural fit for incremental progression, because the *unit of play* changes
  as you grow: first you swing the pick, then you own the mine, then you tax
  the valley that contains it. Most idle games only scale numbers. This scales
  *verbs*. That is rarer and much more satisfying.
- **Runes as the magic system** is the most distinctive thing in the brief and
  is currently underspecified — which is an opportunity, not a flaw. See §1.4.
- **The map as the primary expansion view** is the right instinct. In idle
  games the strongest progression signal is *spatial*, not numeric: a map that
  visibly fills in outperforms a number that visibly rises.
- **Parent/child combat skills with shared parent XP** is a sound structure and
  is doing real work — it lets you reward specialisation without punishing
  experimentation. It needs one correction, in §1.3.

### 1.2 The central tension: "idle" vs "in-depth"

These pull in opposite directions and the brief contains both. Idle rewards
absence; depth rewards attention. Every successful game in this space picks a
specific reconciliation, and that choice determines the entire architecture:

| Reconciliation | Example | Consequence |
| --- | --- | --- |
| One action at a time, everything else is menus | Melvor Idle, RuneScape | Simple, proven; a civilisation layer sits awkwardly on top |
| You never act — you assign workers | Kittens Game, Anno-likes | Scales to civilisation beautifully; the *character* dissolves |
| You configure runs and dispatch them | Loop Hero, IdleOn dungeons | Excellent for dungeons and loadouts; weak for steady economy |
| One **focused** action + N **background** slots | *(proposed)* | The background slots literally become your civilisation |

The fourth is the one I would build. It is the only option where the
civilisation layer is not bolted on: your first hired apprentice *is* your
second skill slot. Growth of the realm and growth of throughput are the same
mechanic wearing two costumes. See **Ballot I**.

**Corollary — the active/passive split the brief asks for.** Focused work runs
at 100% rate and rolls rare drops; background work runs at a reduced rate
(~35%, improvable) and rolls only common yields. That single asymmetry is
enough to make attention worth paying without making absence feel punished.
Target ratio: an attentive hour should be worth roughly **1.8×** an idle hour —
enough to reward presence, not enough to demand it.

### 1.3 The skill system — one correction and one warning

**The correction.** As written, "an overarching skill with shared exp" can be
read as XP being *split* between parent and child. Do not do this. Splitting
makes every weapon swap feel like a tax and players will pick one weapon at
hour two and never look at the others — the exact opposite of what a wide
weapon roster is for. Instead: the child receives **100%** and the parent
receives an **additional 30%** on top, created rather than divided. Then:

- **Parent level** grants universal properties: accuracy, stamina economy,
  attack-speed floor, and *Mastery Points* spent in a tree shared by all its
  children.
- **Child level** grants weapon-specific properties: scaling coefficients,
  crit behaviour, status application, and that weapon's **Techniques**.
- **Parent gates child**: a child may not exceed `parentLevel + 10`. This is
  the quiet engine of breadth — to push your favourite weapon higher you must
  raise the parent, and the cheapest way to raise the parent is to spend some
  time on its siblings. Breadth becomes a strategy, not a chore.

**The warning — count the bars.** Five combat parents at the granularity the
brief implies (sword, sabre, axe, mace, dagger, rapier, …) lands at roughly
**30 combat skills** before a single gathering skill exists. Total north of 45.
That is not automatically wrong — RuneScape ships 23, Melvor ~20 — but 45 bars
on a screen reads as homework rather than opportunity, and each one needs
content at every tier or it becomes a dead limb. The lever is *children per
parent*, and it is **Ballot VI**.

### 1.4 Runes deserve to be more than a spell list

"Elemental runes" plus "magical configurations" in the loadout is the seed of
something much better than a hotbar. The strongest version treats runic arts as
a **grammar**: a spell is a composed sentence, not a purchase.

```
[ELEMENT] + [FORM] + [MODIFIER × n] + [TRIGGER]
   Frost   +  Nova  +  Linger, Split  +  On Block
```

Every part is a glyph you must *find* — via Archaeology, dungeon depths, ruined
libraries, tutors in distant towns, or paid experimentation. Cost, cast time,
and effect are **computed** from the components rather than authored per spell,
which means a few dozen glyphs generate thousands of legitimate spells and the
player's cleverness, not the loot table, is the limiting factor.

This is also the answer to "magical configurations" in the loadout: you inscribe
composed spells onto **Rune Tablets**, and tablets are equipment. Runic Arts
level determines glyphs-per-tablet; gear determines tablets-equipped.

It is the single best differentiator available in this brief. **Ballot V.**

### 1.5 What the brief does not yet specify (and must)

These are unglamorous and they decide whether the game works:

1. **Offline progression.** The defining question of the genre. How long does
   the game run without you, at what rate, and how are *random* outcomes
   resolved when nobody is watching? → **Ballot II**
2. **The long arc / reset.** Idle games need a loop longer than "get the next
   tier". Without one, content burns down and stops. But a map and a realm
   resist resetting. → **Ballot III**, and note the setting hands us an
   unusually elegant answer.
3. **Combat resolution.** Nothing in the brief says what actually happens when
   swords meet. This determines whether Techniques are *decisions* or
   *decorations*. → **Ballot IV**
4. **Number scale.** Damage in the hundreds, or in the `1e30`s? Grounded
   numbers keep the RPG fiction; exponential numbers give the idle dopamine.
   You cannot have both feels at once. → **Ballot IX**
5. **Obsolescence.** A pure tier ladder means Tier 9 deletes Tiers 1–8, along
   with the regions, recipes and skills attached to them. Roughly two thirds of
   the content you build dies on contact with the next tier. → **Ballot VII**

### 1.6 Things I would add to the brief

- **Archaeology should yield knowledge, not ore.** If it drops materials it is
  just slower mining. Make it the primary source of *glyphs, recipes, map
  fragments and relic locations*. It becomes the skill that unlocks other
  skills, which is a far better reason for it to exist.
- **A Legacy layer.** The feudal setting offers the most thematically perfect
  prestige mechanic in any genre: **succession**. Your character ages, retires
  or falls, and an heir inherits a fraction of what was built plus permanent
  bloodline traits. The realm and the map persist; the person resets. It is
  narratively motivated rather than a fourth-wall "prestige" button.
- **Insight** as a second currency. Earned by doing things for the first time,
  reading, excavating and experimenting. Spent on glyph experiments, recipe
  discovery and Mastery respecs. It gives *exploration* an economy of its own,
  separate from gold and materials.
- **Commissions.** Timed requests from villagers, guilds and neighbouring lords
  ("40 steel nails by dusk"). They are the cheapest possible content
  multiplier: they reuse every existing system, they give the return-to-game
  ritual a shape, and later they become the diplomacy layer's verb.
- **Terrain that matters.** If a hex is just a button, the map is a menu with
  extra steps. Regions should have *properties* — depth, danger, seasonality,
  ore richness, sacredness — that make choosing where to work a decision.

### 1.7 Balance principles I would commit to up front

1. **Something unlocks every 30–90 seconds early on**, stretching to every
   10–15 minutes deep in. Unlocks, not just increments — a new verb, region,
   recipe, glyph or slot.
2. **No dead resources.** Every material has a sink at every tier it exists in.
   If bronze stops being consumed, bronze stops being interesting.
3. **The return ritual should present three decisions, not thirty.** What
   greets you after eight hours away is the most important screen in the game.
4. **Soft caps, never walls.** Progress should slow smoothly and visibly, and
   always show what would speed it back up.
5. **Never punish the wrong build.** Respec should exist and cost Insight, not
   pride.

---

## Part 2 — The Ballot

> **Resolved.** The ballot returned
> `I-B · II-A · III-A · IV-A · V-A · VI-B · VII-B · VIII-A · IX-A · X-A · XI-A · XII-C`.
> Every recommendation below carried except **XII**, where Dark Arcane Slate was
> chosen over the Assay Ledger look of the ballot page — the right call for a
> screen people sit in front of for hours rather than read once. The options are
> kept as written so the reasoning behind each choice stays legible.

Twelve decisions. Codes are `Article-Option`.

### Ballot I — Shape of the core loop
- **I-A · Single Focus.** One action at a time. Everything else is menus.
- **I-B · Focus & Retinue.** *(Recommended)* One focused action at full rate
  plus N background slots at reduced rate. Slots are the master progression
  currency; hiring a villager to fill one is how the civilisation layer begins.
- **I-C · Full Assignment.** You never act directly; you allocate population to
  jobs. Scales superbly, but the character stops being a character.
- **I-D · Expedition.** You configure loadouts and dispatch timed runs.

### Ballot II — Offline progression
- **II-A · Deterministic accrual, 12h cap.** *(Recommended)* Offline yields are
  computed at expected value; rare drops resolve as fractional accumulators so
  they are fair and instant. Cap raisable to 36h via upgrades.
- **II-B · Seeded re-simulation.** Replay the real tick stream on a seeded RNG
  and show the player a summary reel of what happened. Most faithful, slowest.
- **II-C · Unlimited at 50%.** No cap; permanent halved rate while away.
- **II-D · Banked Hours.** Short 4h cap, but unspent time banks into a pool you
  later spend at 100% on a chosen activity.

### Ballot III — The long arc
- **III-A · Bloodline & Succession.** *(Recommended)* Characters age. On
  retirement or death an heir inherits a percentage plus permanent bloodline
  traits chosen from what the parent achieved. Map, realm and unlocked
  knowledge persist. Prestige, motivated by the setting.
- **III-B · No reset.** One continuous climb. Requires enormous content volume.
- **III-C · Ages of the Realm.** The realm advances an Age; technology and
  production reset for large multipliers; the map persists.
- **III-D · Both.** Legacy for the character, Ages for the realm, on different
  cadences.

### Ballot IV — Combat resolution
- **IV-A · Gambit auto-battler.** *(Recommended)* Combat resolves on its own,
  driven by a player-authored priority list of conditional rules
  (`IF target.hp < 30% AND stamina > 25 → Execute`). Techniques become genuine
  decisions; theorycrafting *is* the gameplay; fully idle-compatible.
- **IV-B · Auto with interrupts.** Auto by default, but banked charges let you
  intervene manually for burst windows and boss mechanics.
- **IV-C · Turn-based dungeons only.** Auto in the world, tactical turn-based
  inside dungeons.
- **IV-D · Pure stat check.** Fastest to build, shallowest to play.

### Ballot V — The rune / magic system
- **V-A · Rune Grammar.** *(Recommended)* Element + Form + Modifiers + Trigger
  compose into spells with computed cost and effect. Glyphs are discovered.
  Spells are inscribed onto equippable Rune Tablets.
- **V-B · Socket Matrix.** A grid you slot runes into; adjacency, rows and
  shapes grant bonuses. Spatial puzzle rather than linguistic one.
- **V-C · Mana Circuit.** Route mana through a board; power is a function of
  path length and purity. Most novel, most complex to teach.
- **V-D · Spellbook + reagents.** Traditional authored spells; runes are
  consumable fuel. Simplest, least distinctive.
- *Note: A and B compose cleanly — Grammar decides what a spell **is**, Matrix
  decides how strong it is. My preference is A now, B as a later layer.*

### Ballot VI — Combat skill breadth
- **VI-A · Full granularity.** 5–6 children per parent, ~30 combat skills.
- **VI-B · Three per parent.** *(Recommended)* 5 parents × 3 children = 20
  combat skills, each with a real technique tree, plus weapon *variants* inside
  a child that change stats without adding a bar.
- **VI-C · Parents only.** Weapons carry lightweight proficiency counters that
  unlock techniques but are not levelled skills.
- **VI-D · Three plus a Style.** As B, plus a specialisation chosen at parent
  level 50 that reshapes the whole parent tree.

### Ballot VII — Material progression shape
- **VII-A · Pure ladder.** T1→T12, each strictly better.
- **VII-B · Ladder × Alloy × Quality.** *(Recommended)* Tier controls access;
  **alloys** within a tier give distinct stat profiles (this is the brief's
  "special steel variants", promoted to a real system); **quality**
  (Crude→Legendary) keeps old tiers alive because a Masterwork Steel blade can
  out-perform a Crude Mithral one.
- **VII-C · Ladder + affixes.** Random rolled properties, Diablo-style.
- **VII-D · Ladder + full random loot.** Maximum chase, minimum craft identity.

### Ballot VIII — The map
- **VIII-A · Hex regions containing nodes.** *(Recommended)* Hexes carry
  terrain, ownership, danger and prosperity for the war/diplomacy layer; each
  contains 1–4 activity nodes for the character layer. Serves both acts.
- **VIII-B · Node graph.** Points and connecting roads only. Cheapest, cleanest.
- **VIII-C · Painted map with hotspots.** Prettiest, least systematic.
- **VIII-D · Fine tile grid.** Full 4X. Heavy.

### Ballot IX — Number scale
- **IX-A · Grounded.** *(Recommended)* Damage in the hundreds to low millions
  across the whole game; progression expressed through tiers, unlocks and
  breadth rather than exponents. Keeps the RPG fiction intact.
- **IX-B · Big-number idle.** Runs to `1e30+` with scientific notation.
- **IX-C · Split.** Grounded combat, exponential realm economy.

### Ballot X — The civilisation transition
- **X-A · Continuous.** *(Recommended)* Retinue slot → workshop → hamlet →
  town → realm. No mode switch; the same systems widen.
- **X-B · Chapter gate.** Act II opens a distinct realm-management screen.
- **X-C · Parallel.** Both layers run from early on, feeding each other.

### Ballot XI — Stack and persistence
- **XI-A · React + TypeScript + Vite.** *(Recommended)* Deterministic tick
  engine in a Web Worker, Zustand store, all content as validated data packs,
  IndexedDB saves with versioned migrations and export/import. Canvas map, DOM
  UI. No backend initially; the save is the player's.
- **XI-B · Svelte + TypeScript.** Leaner runtime, smaller ecosystem.
- **XI-C · Vanilla TypeScript.** Maximum control, slowest UI iteration.
- **XI-D · Any of the above + cloud saves** from day one.

### Ballot XII — Visual direction
- **XII-A · Illuminated Charter.** Parchment, iron-gall ink, heraldic tinctures,
  drop capitals.
- **XII-B · Guild Assay Ledger.** Cold slate and limestone, verdigris accent,
  ruled columns, struck-brass for the mythic strata. *(The look of the ballot
  page itself.)*
- **XII-C · Dark Arcane Slate.** Near-black stone, rune-glow, gold leaf.
- **XII-D · Woodcut.** High-contrast engraved line art, one spot colour.

---

## Part 3 — Reference specifications

These are what I would build *if the recommended options carry*. They exist so
the ballot is concrete rather than abstract, and are revisable in every part.

### 3.1 Skill roster (Ballot VI-B)

**Combat parents and children (20)**

| Parent | Children |
| --- | --- |
| One-Handed | Blade · Haft · Point |
| Two-Handed | Greatblade · Greathaft · Polearm |
| Ranged | Bow · Crossbow · Thrown |
| Martial Arts | Striking · Grappling · Focus |
| Sorcery | Evocation · Weaving · Warding |

Weapon *variants* live inside a child: a sabre and an arming sword are both
Blade, differing in speed, reach and scaling, adding no extra bar.

**Defensive (3)** — Guarding · Evasion · Vitality
**Gathering (5)** — Mining · Forestry · Foraging · Fishing · Archaeology
**Production (6)** — Smithing · Alchemy · Cooking · Leatherworking · Woodworking · Inscription
**Civil (6)** — Construction · Farming · Commerce · Statecraft · Cartography · Beast Handling

Forty tracked tracks, presented as **25 cards** with children nested inside
their parent. Civil skills are the ones that unlock in Act II and give the
realm layer somewhere to grow.

### 3.2 Curves

```
xpToLevel(L)     = round(80 · L^2.2)          // L2 ≈ 80, L50 ≈ 448k cumulative
actionTime(s)    = base · (1 − min(0.60, lvl·0.005)) · toolSpeed
materialPower(T) = 10 · 1.75^(T−1)
materialCost(T)  = 2.30^(T−1)
```

Power rising at 1.75× while cost rises at 2.30× means each tier is a real
upgrade that takes progressively longer to reach — the shape that reads as
"earned" rather than "given". Targets: first unlock inside 60 seconds, out of
the village by ~2 hours, first succession at ~18 hours, months of content
beyond.

### 3.3 Material strata (Ballot VII-B)

| Tier | Metal | Note |
| --- | --- | --- |
| T1 | Copper | Tutorial metal |
| T2 | Bronze | First alloy — teaches the alloy verb |
| T3 | Iron | |
| T4 | Steel | |
| T5 | Blacksteel · Sunsteel · Frostiron | The brief's "special steel variants" — three co-equal alloys with distinct profiles, not a ladder |
| T6 | Argentine (silverbound) | First metal that holds enchantment |
| T7 | Mithral | |
| T8 | Adamant | |
| T9 | Orichalcum | |
| T10 | Voidiron | Requires magical forging |
| T11 | Meteoric / Starfall | Sourced from map events, not mines |
| T12 | Aurelith | Endgame craft ceiling |

**Relic strata — not craftable at any level.** Dragonbone, Heartwood of the
First Oak, Sanguine Crystal, Fae-glass, Angelsteel, Chronite. Sources: dungeon
depths, ruin excavations, world bosses, and high-Inscription transmutation.
These are the brief's "rewards and treasures beyond the top crafting tier".

**Quality multipliers** — Crude 0.80 · Common 1.00 · Fine 1.15 · Superior 1.30
· Masterwork 1.50 · Legendary 1.75 + one affix slot. Rolled from smithing level
relative to recipe tier, tool quality, and optional Focus expenditure.

### 3.4 Rune grammar (Ballot V-A)

- **Elements (6 at start)** — Fire · Frost · Storm · Stone · Gale · Gloam.
  Later: Blood, Void, Aether, Verdant.
- **Forms** — Bolt · Nova · Beam · Ward · Brand (damage over time) · Sigil
  (ground effect) · Chain · Weave (buff).
- **Modifiers** — Amplify · Split · Pierce · Linger · Hasten · Echo · Siphon ·
  Empower.
- **Triggers** — On Cast · On Hit · On Kill · On Block · Below 30% HP · Every N
  seconds.

Cost, cast time and power are derived from the component set. Runic Arts level
raises glyphs-per-tablet; equipment raises tablets-equipped. Glyph acquisition
is Archaeology's primary output.

### 3.5 Opening map (Ballot VIII-A)

Home hex **Ashcombe** (village), ringed by six:

- **Tanglewood** — forestry, foraging, a wolf den
- **Greyhollow Mine** — mining, depth levels gating tiers
- **The Fallow** — plains, farming, herbs, bandits
- **Barrowdeep** — cave/dungeon, first relic source
- **Aldermarch** — neighbouring town, commerce, tutors, commissions
- **Stonewatch Ruin** — archaeology, first glyphs

Ring 2 (twelve hexes) sits under fog, revealed by Cartography and scouting.
Each region carries terrain, danger, richness, ownership, loyalty and
prosperity — the last three inert until Act II, then the substrate of the
diplomacy and war layer.

### 3.6 Proposed architecture (Ballot XI-A)

```
src/
  engine/      pure, DOM-free, deterministic
    tick.ts       fixed 200ms simulation step
    rng.ts        seeded streams keyed by (saveSeed, counter)
    skills.ts     xp, levels, parent/child gating
    combat.ts     gambit resolver
    craft.ts      recipes, alloys, quality rolls
    economy.ts    production and consumption rates
    offline.ts    catch-up
  content/     validated data packs — items, recipes, skills, regions, runes, foes
  state/       store and selectors
  ui/          components
  workers/     sim.worker.ts
```

Two non-negotiables: **the simulation never touches the DOM** (so offline
catch-up is simply the same engine run fast), and **content is data, not code**
(so twelve tiers and forty skills are authored, not programmed).

---

*Nothing here is committed until the ballot returns. Override freely — the
recommendations are opinions with reasons attached, not conclusions.*
