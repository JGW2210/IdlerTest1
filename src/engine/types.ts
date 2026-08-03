/**
 * Every type the simulation touches. Two rules hold throughout:
 *
 *  1. Everything here is JSON-serialisable. The engine never holds a class
 *     instance, a Map, a Set or a function in game state. That is what lets the
 *     whole simulation move behind a worker boundary later without a rewrite,
 *     and what lets a save be a single structured-clone away from durable.
 *  2. Content is data (see src/content). These types describe the shape; the
 *     content packs supply the substance. Adding a twelfth material tier or a
 *     twenty-first skill is authoring, not programming.
 */

// ---------------------------------------------------------------- identifiers

export type SkillId = string
export type ItemId = string
export type RecipeId = string
export type RegionId = string
export type NodeId = string
export type GlyphId = string
export type FoeId = string
export type TechniqueId = string

// -------------------------------------------------------------------- skills

export type SkillKind = 'combat-parent' | 'combat-child' | 'defence' | 'gathering' | 'production' | 'civil'

export interface SkillDef {
  id: SkillId
  name: string
  kind: SkillKind
  /** Combat children name their parent. The parent receives PARENT_XP_SHARE on
   *  top of what the child earns — created, never divided (charter §1.3). */
  parent?: SkillId
  blurb: string
  /** Unlocked from the start, or gated behind a world event / act. */
  hidden?: boolean
}

export interface SkillState {
  xp: number
  level: number
}

// --------------------------------------------------------------------- items

export type ItemCategory = 'material' | 'weapon' | 'armour' | 'accessory' | 'consumable' | 'tablet' | 'relic' | 'tool'

export type EquipSlot =
  | 'mainHand' | 'offHand' | 'head' | 'chest' | 'legs' | 'hands' | 'feet'
  | 'ring1' | 'ring2' | 'neck' | 'charm' | 'tablet1' | 'tablet2'

export type QualityId = 'crude' | 'common' | 'fine' | 'superior' | 'masterwork' | 'legendary'

export interface QualityDef {
  id: QualityId
  name: string
  /** Multiplies every scalar stat on the item (ballot VII-B). */
  mult: number
  /** Legendary rolls an extra affix. */
  affixSlots: number
}

export interface ItemStats {
  attack?: number
  armour?: number
  /** Flat maximum-health bonus. */
  health?: number
  /** Flat maximum-stamina bonus. */
  stamina?: number
  /** Flat maximum-mana bonus. */
  mana?: number
  /** Multiplier on gathering yield for the named skill. */
  gatherSpeed?: number
  /** Additional rune tablets this piece grants. */
  tabletSlots?: number
  /** Additive critical chance, 0..1. */
  crit?: number
}

export interface ItemDef {
  id: ItemId
  name: string
  category: ItemCategory
  /** Material tier 1-12, or 13+ for the non-craftable relic stratum. */
  tier: number
  /** Base trade value of one unit at common quality. */
  value: number
  stack: boolean
  slot?: EquipSlot
  /** Which combat child skill governs this weapon (ballot VI-B: variants live
   *  inside a child, so a sabre and an arming sword are both `blade`). */
  weaponSkill?: SkillId
  /** Speed multiplier — the axis along which weapon variants differ. */
  speed?: number
  stats?: ItemStats
  blurb?: string
}

/** One line in the pack. Equipment carries quality; materials do not. */
export interface ItemStack {
  item: ItemId
  qty: number
  quality?: QualityId
  /** Stable id for a non-stacking instance, so equipping is unambiguous. */
  uid?: string
}

// ------------------------------------------------------------------ crafting

export interface RecipeDef {
  id: RecipeId
  name: string
  skill: SkillId
  levelReq: number
  inputs: { item: ItemId; qty: number }[]
  output: { item: ItemId; qty: number }
  xp: number
  /** Seconds at skill level 1 with no tool bonus. */
  baseTime: number
  /** Alloys are recipes whose output is a material rather than equipment;
   *  flagged so the UI can group the tier-5 branch sensibly. */
  alloy?: boolean
}

// --------------------------------------------------------------------- world

export interface AxialCoord { q: number; r: number }

export type NodeActivity = 'gather' | 'hunt' | 'delve' | 'excavate' | 'trade'

/**
 * One workable layer of a site. Sites have depth: a mine has galleries, a barrow
 * has floors, a dig has strata. Descending is a progression track *inside* a
 * place, so a region you unlocked at level 12 still has something to offer at 60.
 *
 * `Assignment.node` always names a layer, never a site, so the engine only ever
 * has one kind of thing to work on.
 */
export interface SiteLayer {
  id: NodeId
  name: string
  levelReq: number
  /** Seconds per action at level 1. */
  baseTime: number
  xp: number
  /** Weighted yield table. Rolled per completed action. */
  yields: { item: ItemId; qty: [number, number]; weight: number }[]
  /** Foes present on `hunt` and `delve` sites. */
  foes?: FoeId[]
  /**
   * Excavation only: how old this layer is, in ages. Deeper strata are older,
   * and older strata yield older tablets — which carry the rarer glyphs.
   */
  strata?: number
  blurb?: string
}

export type SiteIcon =
  | 'village' | 'town' | 'mine' | 'tree' | 'field' | 'cave' | 'ruin'
  | 'water' | 'camp' | 'tower' | 'barrow' | 'shrine' | 'market'

export interface SiteDef {
  id: string
  name: string
  activity: NodeActivity
  skill: SkillId
  /** Position within the region's locale inset, both axes 0..1. */
  pos: { x: number; y: number }
  icon: SiteIcon
  layers: SiteLayer[]
  blurb?: string
}

export type Terrain =
  | 'village' | 'forest' | 'mountain' | 'plains' | 'cavern' | 'town' | 'ruin'
  | 'marsh' | 'coast' | 'moor' | 'waste' | 'unknown'

export interface RegionDef {
  id: RegionId
  name: string
  coord: AxialCoord
  terrain: Terrain
  /** 0 = safe. Feeds combat difficulty and, in Act II, garrison requirements. */
  danger: number
  sites: SiteDef[]
  /** Cartography level a survey needs before this region can be found. */
  scoutLevelReq?: number
  /** Ring 4+ regions are generated rather than authored; flagged so the UI can
   *  say so and so the chart can draw them in a less certain hand. */
  outland?: boolean
  /** Named province, for the outer rings. */
  province?: string
  blurb?: string
}

export interface RegionState {
  discovered: boolean
  /** Held regions contribute to the realm layer (ballot X-A). */
  held: boolean
  loyalty: number
  prosperity: number
  /** How thoroughly this region has been surveyed, 0..1. Drives how much detail
   *  the chart renders for it — a half-surveyed hex is drawn in a vaguer hand. */
  surveyed: number
}

/** A deciphered inscription. The lore log is Archaeology's other reward. */
export interface LoreEntry {
  id: string
  title: string
  text: string
  /** Simulated seconds at which it was read. */
  foundAt: number
}

// ---------------------------------------------------------------------- runes

export type GlyphKind = 'element' | 'form' | 'modifier' | 'trigger'

export interface GlyphDef {
  id: GlyphId
  name: string
  kind: GlyphKind
  /** The word this glyph contributes to a spell's true name. */
  root: string
  /** Multiplicative contributions. Elements and modifiers scale; forms set the base. */
  power: number
  cost: number
  cast: number
  /** Plain-English clause, composed into the spell description. */
  clause: string
  /** Runic Arts level needed to inscribe with this glyph. */
  levelReq: number
}

/**
 * A spell is a composed sentence, not a purchase (ballot V-A). Cost, cast time
 * and power are derived from the components — so a few dozen glyphs generate
 * thousands of legitimate spells.
 */
export interface Spell {
  uid: string
  name: string
  element: GlyphId
  form: GlyphId
  modifiers: GlyphId[]
  trigger: GlyphId
}

export interface SpellResolved extends Spell {
  trueName: string
  description: string
  power: number
  manaCost: number
  castTime: number
  glyphCount: number
}

// -------------------------------------------------------------------- combat

export interface FoeDef {
  id: FoeId
  name: string
  level: number
  health: number
  attack: number
  armour: number
  /** Seconds between the foe's swings. */
  speed: number
  xp: number
  drops: { item: ItemId; qty: [number, number]; chance: number }[]
  blurb?: string
}

export interface TechniqueDef {
  id: TechniqueId
  name: string
  skill: SkillId
  levelReq: number
  staminaCost: number
  /** Multiplier on a normal attack. */
  damageMult: number
  /** Seconds before it may be used again. */
  cooldown: number
  blurb: string
}

/**
 * One rule in the gambit list (ballot IV-A). Combat resolves itself by walking
 * the list top to bottom and firing the first rule whose condition holds — so
 * techniques are decisions the player authored, not decorations.
 */
export type GambitCondition =
  | { kind: 'always' }
  | { kind: 'foeHealthBelow'; pct: number }
  | { kind: 'foeHealthAbove'; pct: number }
  | { kind: 'selfHealthBelow'; pct: number }
  | { kind: 'staminaAbove'; value: number }
  | { kind: 'manaAbove'; value: number }

export type GambitAction =
  | { kind: 'attack' }
  | { kind: 'technique'; technique: TechniqueId }
  | { kind: 'spell'; spell: string }
  | { kind: 'flee' }

export interface GambitRule {
  uid: string
  enabled: boolean
  condition: GambitCondition
  action: GambitAction
}

export interface CombatLogEntry {
  t: number
  text: string
  kind: 'hit' | 'crit' | 'taken' | 'spell' | 'technique' | 'death' | 'reward' | 'info'
}

export interface CombatState {
  foe: FoeId
  foeHealth: number
  foeMaxHealth: number
  /** Seconds until the foe's next swing. */
  foeCooldown: number
  /** Seconds until the player may act. */
  selfCooldown: number
  cooldowns: Record<TechniqueId, number>
  log: CombatLogEntry[]
}

// ----------------------------------------------------------------- activities

/**
 * The core loop (ballot I-B). One focused assignment runs at full rate and rolls
 * rare yields; retinue assignments run in the background at RETINUE_RATE and
 * roll only common ones. Retinue slots are the master progression currency —
 * hiring a villager to fill one is how the civilisation layer begins.
 */
export interface Assignment {
  /**
   * `survey` walks the frontier and inks in a new region; `decipher` opens a
   * sealed tablet. Both are ordinary timed work so the retinue can be set to
   * them and offline catch-up handles them without a special case.
   */
  kind: 'node' | 'recipe' | 'survey' | 'decipher' | 'idle'
  /** A site *layer* id, never a site id. */
  node?: NodeId
  region?: RegionId
  recipe?: RecipeId
  /** Which sealed tablet a `decipher` assignment is working on. */
  tablet?: ItemId
  /** Seconds accumulated toward the next completion. */
  progress: number
}

export interface RetinueMember {
  uid: string
  name: string
  /** Multiplies this member's contribution; improves as they are trained. */
  skill: number
  assignment: Assignment
}

// ---------------------------------------------------------------------- save

export interface Character {
  name: string
  /** Years. Drives the succession arc (ballot III-A). */
  age: number
  health: number
  stamina: number
  mana: number
}

export interface Legacy {
  /** How many forebears have passed the holding on. */
  generation: number
  /** Permanent bloodline traits earned by what each forebear actually did. */
  traits: string[]
  /** Multiplier applied to all XP, compounding across generations. */
  xpBonus: number
}

export interface GameState {
  version: number
  seed: number
  /** Advances with every RNG draw so a reload does not rewind luck. */
  rngCounter: number
  /** Monotonic source of instance ids. Lives on the save rather than in a module
   *  so a reload cannot re-issue a uid an existing item already holds. */
  uidCounter: number
  /** Total simulated seconds since the save was created. */
  elapsed: number
  /** Wall-clock ms of the last persisted tick, for offline catch-up. */
  lastSeen: number

  character: Character
  legacy: Legacy

  skills: Record<SkillId, SkillState>
  inventory: ItemStack[]
  equipment: Partial<Record<EquipSlot, ItemStack>>
  coin: number
  insight: number

  focus: Assignment
  retinue: RetinueMember[]

  regions: Record<RegionId, RegionState>

  knownGlyphs: GlyphId[]
  /** Deciphered inscriptions, newest last. */
  lore: LoreEntry[]
  /** Regions revealed by a tablet's map fragment rather than by survey. */
  mapFragments: RegionId[]
  spells: Spell[]
  gambits: GambitRule[]
  combat: CombatState | null

  /** Fractional drop expectations carried between settlements (see rng.ts). */
  dropCarry: Record<string, number>

  unlockedTechniques: TechniqueId[]
  log: { t: number; text: string }[]
}
