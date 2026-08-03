import type { FoeDef, TechniqueDef } from '@/engine/types'

export const FOES: FoeDef[] = [
  { id: 'wolf', name: 'Grey Wolf', level: 3, health: 55, attack: 9, armour: 2, speed: 2.2, xp: 22,
    drops: [{ item: 'hide', qty: [1, 2], chance: 0.8 }],
    blurb: 'Hunts in threes. You will meet the other two shortly.' },
  { id: 'directWolf', name: 'Tanglewood Direwolf', level: 12, health: 210, attack: 26, armour: 8, speed: 2.6, xp: 140,
    drops: [{ item: 'hide', qty: [2, 4], chance: 1 }, { item: 'kingsfoil', qty: [1, 1], chance: 0.2 }],
    blurb: 'Shoulder-high and entirely unbothered by your reputation.' },
  { id: 'bandit', name: 'Road Bandit', level: 8, health: 130, attack: 18, armour: 6, speed: 2.4, xp: 75,
    drops: [{ item: 'leather', qty: [1, 2], chance: 0.6 }, { item: 'copperOre', qty: [1, 3], chance: 0.3 }],
    blurb: 'Was a farmhand until the levy came through.' },
  { id: 'banditArcher', name: 'Bandit Archer', level: 11, health: 105, attack: 27, armour: 3, speed: 2.0, xp: 110,
    drops: [{ item: 'leather', qty: [1, 2], chance: 0.7 }, { item: 'birchLog', qty: [2, 4], chance: 0.4 }] },
  { id: 'barrowRat', name: 'Barrow Rat', level: 10, health: 90, attack: 15, armour: 4, speed: 1.6, xp: 85,
    drops: [{ item: 'potsherd', qty: [1, 2], chance: 0.5 }],
    blurb: 'Something down there has been feeding them.' },
  { id: 'ghoul', name: 'Barrow Ghoul', level: 22, health: 480, attack: 52, armour: 18, speed: 2.8, xp: 420,
    drops: [{ item: 'shadowash', qty: [1, 2], chance: 0.55 }, { item: 'potsherd', qty: [2, 4], chance: 0.6 }],
    blurb: 'Was buried with honours. Has since revised its opinion of them.' },
  { id: 'barrowWight', name: 'Barrow Wight', level: 38, health: 1500, attack: 118, armour: 44, speed: 3.2, xp: 1900,
    drops: [
      { item: 'shadowash', qty: [2, 4], chance: 0.8 },
      { item: 'sealedTablet', qty: [1, 1], chance: 0.25 },
      { item: 'dragonbone', qty: [1, 1], chance: 0.06 },
    ],
    blurb: 'Still wearing the mail it was buried in, and it has not rusted.' },
]

export const FOE_BY_ID: Record<string, FoeDef> = Object.fromEntries(FOES.map((f) => [f.id, f]))

/**
 * Techniques unlock at level breakpoints on the *child* skill and are the things
 * a gambit rule can fire (ballot IV-A). They are what make the combat trees
 * decisions rather than decorations.
 */
export const TECHNIQUES: TechniqueDef[] = [
  { id: 'lunge', name: 'Lunge', skill: 'blade', levelReq: 5, staminaCost: 12, damageMult: 1.6, cooldown: 6, blurb: 'Commits your weight forward. Hits harder and leaves you open.' },
  { id: 'riposte', name: 'Riposte', skill: 'blade', levelReq: 20, staminaCost: 18, damageMult: 2.1, cooldown: 10, blurb: 'Turns a parry into an answer.' },
  { id: 'bleedingCut', name: 'Bleeding Cut', skill: 'blade', levelReq: 40, staminaCost: 22, damageMult: 2.6, cooldown: 14, blurb: 'Shallow, wide, and slow to stop.' },

  { id: 'sunder', name: 'Sunder', skill: 'haft', levelReq: 5, staminaCost: 16, damageMult: 1.8, cooldown: 8, blurb: 'Aims at the armour rather than around it.' },
  { id: 'crush', name: 'Crush', skill: 'haft', levelReq: 25, staminaCost: 26, damageMult: 2.5, cooldown: 12, blurb: 'Whatever is underneath stops being a shape.' },

  { id: 'backstab', name: 'Backstab', skill: 'point', levelReq: 5, staminaCost: 10, damageMult: 2.2, cooldown: 12, blurb: 'Requires the foe to be looking elsewhere, which is arrangeable.' },
  { id: 'flurry', name: 'Flurry', skill: 'point', levelReq: 22, staminaCost: 20, damageMult: 1.5, cooldown: 5, blurb: 'Four strikes where one was expected.' },

  { id: 'cleave', name: 'Cleave', skill: 'greatblade', levelReq: 5, staminaCost: 20, damageMult: 1.9, cooldown: 9, blurb: 'A single arc through everything in front of you.' },
  { id: 'execute', name: 'Execute', skill: 'greatblade', levelReq: 35, staminaCost: 30, damageMult: 3.4, cooldown: 18, blurb: 'Only worth the stamina on something already failing.' },

  { id: 'overhead', name: 'Overhead Smash', skill: 'greathaft', levelReq: 5, staminaCost: 24, damageMult: 2.3, cooldown: 11, blurb: 'Slow enough to see coming and heavy enough not to matter.' },
  { id: 'braceSet', name: 'Brace and Set', skill: 'polearm', levelReq: 5, staminaCost: 14, damageMult: 1.7, cooldown: 8, blurb: 'Plants the butt and lets the charge do the work.' },

  { id: 'aimedShot', name: 'Aimed Shot', skill: 'bow', levelReq: 5, staminaCost: 14, damageMult: 2.0, cooldown: 9, blurb: 'One breath out, hold, release.' },
  { id: 'volley', name: 'Volley', skill: 'bow', levelReq: 30, staminaCost: 26, damageMult: 1.6, cooldown: 7, blurb: 'Three shafts in the air before the first lands.' },
  { id: 'punchThrough', name: 'Punch-Through Bolt', skill: 'crossbow', levelReq: 5, staminaCost: 18, damageMult: 2.6, cooldown: 14, blurb: 'Plate is a suggestion.' },

  { id: 'palmStrike', name: 'Palm Strike', skill: 'striking', levelReq: 5, staminaCost: 8, damageMult: 1.5, cooldown: 5, blurb: 'Fast enough to interrupt a caster mid-word.' },
  { id: 'throwDown', name: 'Throw Down', skill: 'grappling', levelReq: 5, staminaCost: 15, damageMult: 1.7, cooldown: 10, blurb: 'Ignores armour entirely. The ground does the damage.' },
  { id: 'innerFire', name: 'Inner Fire', skill: 'focus', levelReq: 10, staminaCost: 30, damageMult: 2.8, cooldown: 20, blurb: 'Spends breath as though it were mana.' },
]

export const TECHNIQUE_BY_ID: Record<string, TechniqueDef> = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t]))

export function techniquesFor(skillId: string): TechniqueDef[] {
  return TECHNIQUES.filter((t) => t.skill === skillId)
}
