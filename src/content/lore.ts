/**
 * What a deciphered tablet says.
 *
 * Lore is Archaeology's second reward and the one that carries the setting. Each
 * entry is tagged with the tablet age that can carry it, so what you read gets
 * older and stranger as you dig deeper — the First Age entries are the ones that
 * explain why any of this is here.
 */

export interface LoreDef {
  id: string
  title: string
  /** Which tablet ages can carry this: 'sealed' | 'elder' | 'first'. */
  age: 'sealed' | 'elder' | 'first'
  text: string
}

export const LORE: LoreDef[] = [
  // ---------------------------------------------------------- Second Age
  {
    id: 'tithe_roll', title: 'A Tithe Roll', age: 'sealed',
    text: 'Forty-one households at Ashcombe, of which nine are in arrears. The reeve notes that the mill is unsound and has been unsound for eleven years. He requests timber. There is no reply recorded.',
  },
  {
    id: 'levy_list', title: 'The Levy List', age: 'sealed',
    text: 'Names, sixty of them, in a clerk\'s hand. Beside fifty-two is a small cross. Beside the rest, nothing at all. The list is not dated and does not say which mark means returned.',
  },
  {
    id: 'first_lesson', title: "A Scribe's First Lesson", age: 'sealed',
    text: 'Cut the element first. Then the form, for the form is the vessel. Modifiers after, and never more than three, for the fourth will find a way out of the stone. The trigger last, and cut it deep. A trigger cut shallow will fire when you sneeze.',
  },
  {
    id: 'mine_ledger', title: 'The Greyhollow Ledger', age: 'sealed',
    text: 'Copper, forty baskets. Tin, nine. Below the third gallery the men will not work past noon, and I have stopped asking why, because the answers do not agree with one another and each man believes his own.',
  },
  {
    id: 'wolf_bounty', title: 'A Bounty Notice', age: 'sealed',
    text: 'Two shillings the wolf, four the direwolf, and for the thing at the bottom of the Tanglewood den, the reeve will discuss terms in person and not in writing.',
  },
  {
    id: 'road_survey', title: 'A Road Survey', age: 'sealed',
    text: 'The old road runs true from Aldermarch to the ford and then bends, for no reason the surveyor can determine, around a field containing nothing. The bend is older than the road.',
  },

  // ------------------------------------------------------------ Elder Age
  {
    id: 'burning_order', title: 'The Order of Burning', age: 'elder',
    text: 'Every hall of the watch to be fired, the stone thrown down, the wells filled. This is not a punishment and the garrisons are not at fault. It is to be done quickly and it is to be done from the outside.',
  },
  {
    id: 'glyph_warning', title: 'A Warning on Glyphs', age: 'elder',
    text: 'The Gloam glyph will take the health it returns from somewhere. Cut it beside Siphon and it takes from the caster, slowly, and the caster does not notice until the second season.',
  },
  {
    id: 'nine_barrows', title: 'Concerning the Barrows', age: 'elder',
    text: 'Eight were opened from within. This is recorded plainly and without comment in three separate hands, which is how I know it is not a story. The ninth has never been opened, and the ninth is the only one with a door.',
  },
  {
    id: 'drowned_charter', title: 'The Drowned Charter', age: 'elder',
    text: 'The city is granted the right of tide, the right of salvage, and the right of the deepest street. The third right is not explained and no other charter in the archive grants it to anyone.',
  },
  {
    id: 'moondial', title: 'On the Moondial', age: 'elder',
    text: 'Sixty stones and it keeps a year of four hundred and eleven days. Either they could not count, which I do not believe of people who could raise those stones, or the year was longer then.',
  },
  {
    id: 'alloy_note', title: "A Smith's Marginal Note", age: 'elder',
    text: 'Steel and shadowash gives blacksteel, and blacksteel does not care what armour you are wearing. Steel and emberstone gives sunsteel, and sunsteel keeps its edge past all reason. Do not attempt both at once. I have seen what comes out.',
  },
  {
    id: 'sundering', title: 'The Sundering of the Fell', age: 'elder',
    text: 'The mountain was cut in a single night and both faces are polished. No tool did this. The people who lived beneath it left within the month and left everything, including the doors, standing open.',
  },

  // ------------------------------------------------------------ First Age
  {
    id: 'first_grammar', title: 'The Grammar Itself', age: 'first',
    text: 'The world is written and can therefore be read, and what can be read can be amended. We did not invent the glyphs. We found them already cut, and we learned which ones the world would answer to. It answered to more of them then.',
  },
  {
    id: 'the_closing', title: 'The Closing', age: 'first',
    text: 'We are sealing it from this side. Let no one record why, because the recording is itself a way in. If you are reading this you have already dug too far, and the only useful advice remaining is to fill it back in.',
  },
  {
    id: 'aurelith', title: 'On Aurelith', age: 'first',
    text: 'The last metal. Past it there is nothing to smelt, only things to find, and the things to find were not made by smiths. A blade of aurelith is the finest object a person can make. That is both a boast and a limit.',
  },
  {
    id: 'chronite_note', title: 'Concerning Chronite', age: 'first',
    text: 'The blade lands slightly before it is thrown. Do not think about this while holding one. Two of my colleagues thought about it carefully and are now difficult to describe.',
  },
  {
    id: 'the_deepest_street', title: 'The Deepest Street', age: 'first',
    text: 'It is dry. It has been under the sea for an age and a half and it is dry, and the lamps along it are lit, and I did not light them and neither did anyone who came down with me.',
  },
  {
    id: 'inheritance', title: 'On Inheritance', age: 'first',
    text: 'What a person learns dies with them. What a bloodline learns does not. We built for the second kind of memory and it is the only thing we built that is still standing.',
  },
]

export const LORE_BY_ID: Record<string, LoreDef> = Object.fromEntries(LORE.map((l) => [l.id, l]))

export function loreForAge(age: LoreDef['age']): LoreDef[] {
  return LORE.filter((l) => l.age === age)
}
