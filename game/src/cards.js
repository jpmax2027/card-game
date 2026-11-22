// The deck: every card Crown Duel can deal, with its suit, cost and effect.
// Suits: ♠ attack, ♣ block, ♥ heal, ♦ special. Values are printed on the card face.
export const SUITS = {
  attack: { glyph: '♠', label: 'Attack' },
  block: { glyph: '♣', label: 'Block' },
  heal: { glyph: '♥', label: 'Heal' },
  special: { glyph: '♦', label: 'Special' },
};

export const CARD_DEFS = [
  { id: 'strike', name: 'Strike', suit: 'attack', cost: 1, damage: 4, copies: 4, flavor: 'A clean cut. Simple, honest, sharp.' },
  { id: 'heavy', name: 'Heavy Blow', suit: 'attack', cost: 2, damage: 7, copies: 2, flavor: 'Slow swing, heavy crown.' },
  { id: 'jab', name: 'Quick Jab', suit: 'attack', cost: 0, damage: 2, copies: 2, flavor: 'Free as a taunt, twice as fast.' },
  { id: 'guard', name: 'Guard', suit: 'block', cost: 1, block: 5, copies: 3, flavor: 'Shield up. Let them tire first.' },
  { id: 'bulwark', name: 'Bulwark', suit: 'block', cost: 2, block: 9, copies: 1, flavor: 'A wall with a heartbeat.' },
  { id: 'mend', name: 'Mend', suit: 'heal', cost: 1, heal: 3, copies: 2, flavor: 'A stitch in time, a breath regained.' },
  { id: 'soothe', name: 'Soothing Light', suit: 'heal', cost: 2, heal: 6, copies: 2, flavor: 'The crown remembers kinder days.' },
  { id: 'fireball', name: 'Fireball', suit: 'special', cost: 2, damage: 6, draw: 1, copies: 2, flavor: 'Burns the foe and feeds your hand.' },
  { id: 'drain', name: 'Soul Drain', suit: 'special', cost: 2, damage: 4, heal: 4, copies: 1, flavor: 'Their strength becomes your own.' },
  { id: 'focus', name: 'Focus', suit: 'special', cost: 0, energy: 1, draw: 1, copies: 1, flavor: 'Breathe. The next card is the one.' },
];

export const DECK_SIZE = CARD_DEFS.reduce((sum, def) => sum + def.copies, 0);
export const HAND_LIMIT = 7;
export const START_HAND = 5;
export const DRAW_PER_TURN = 2;
export const MAX_HP = 30;
export const MAX_ENERGY = 3;

let nextUid = 1;

/** Build a fresh 20-card deck of card instances, each with its own uid. */
export function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < def.copies; i += 1) {
      deck.push({ ...def, uid: nextUid });
      nextUid += 1;
    }
  }
  return deck;
}

/** One-line text of what a card does, for the log and the screen reader. */
export function describeCard(card) {
  const parts = [];
  if (card.damage) parts.push(`deal ${card.damage}`);
  if (card.block) parts.push(`gain ${card.block} block`);
  if (card.heal) parts.push(`heal ${card.heal}`);
  if (card.draw) parts.push(`draw ${card.draw}`);
  if (card.energy) parts.push(`gain ${card.energy} energy`);
  return `${card.name} (${parts.join(', ')})`;
}
