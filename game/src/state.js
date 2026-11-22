// The rules engine: fighters, turns, damage, block, healing and the win/loss check.
// Pure logic — no DOM here — so the same code drives live play and screenshot staging.
import { buildDeck, describeCard, DRAW_PER_TURN, HAND_LIMIT, MAX_ENERGY, MAX_HP, START_HAND } from './cards.js';
import { shuffle } from './rng.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

function makeFighter(name) {
  return { name, hp: MAX_HP, maxHp: MAX_HP, block: 0, energy: MAX_ENERGY, deck: [], hand: [], discard: [] };
}

/** A fresh game: two shuffled decks, hands drawn, player to move. */
export function createGame(rng, seed) {
  const game = {
    seed,
    phase: PHASE_TITLE,
    turn: 1,
    active: 'player',
    player: makeFighter('You'),
    enemy: makeFighter('King Roderick'),
    log: [],
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, heals: 0, blocks: 0 },
    rng,
  };
  for (const fighter of [game.player, game.enemy]) {
    fighter.deck = shuffle(buildDeck(), rng);
    drawCards(game, fighter, START_HAND);
  }
  addLog(game, 'The duel begins. King Roderick shuffles his deck.');
  return game;
}

export function addLog(game, text, kind) {
  game.log.push({ text, kind: kind ?? '' });
  if (game.log.length > 40) game.log.shift();
}

export function score(game) {
  return game.stats.damageDealt + (game.phase === PHASE_WON ? 100 : 0) + game.stats.cardsPlayed * 2;
}

function reshuffleIfNeeded(game, fighter) {
  if (fighter.deck.length === 0 && fighter.discard.length > 0) {
    fighter.deck = shuffle(fighter.discard, game.rng);
    fighter.discard = [];
    addLog(game, `${fighter.name} reshuffle${fighter.name === 'You' ? '' : 's'} the discard pile into the deck.`);
  }
}

/** Draw up to `count` cards, respecting the hand limit. */
export function drawCards(game, fighter, count) {
  for (let i = 0; i < count; i += 1) {
    reshuffleIfNeeded(game, fighter);
    if (fighter.deck.length === 0 || fighter.hand.length >= HAND_LIMIT) return;
    fighter.hand.push(fighter.deck.pop());
  }
}

/** Block absorbs damage first; the rest hits life. Returns the life lost. */
export function dealDamage(game, target, amount, sourceName) {
  const absorbed = Math.min(target.block, amount);
  target.block -= absorbed;
  const lifeLost = amount - absorbed;
  target.hp = Math.max(0, target.hp - lifeLost);
  if (sourceName === 'You') game.stats.damageDealt += lifeLost;
  if (target.name === 'You') game.stats.damageTaken += lifeLost;
  return { absorbed, lifeLost };
}

export function healFighter(game, fighter, amount) {
  const healed = Math.min(amount, fighter.maxHp - fighter.hp);
  fighter.hp += healed;
  if (fighter.name === 'You') game.stats.heals += healed;
  return healed;
}

/** Apply one card's effect. Caller must have checked cost and turn. Returns a report for the UI. */
export function playCard(game, who, handIndex) {
  const fighter = who === 'player' ? game.player : game.enemy;
  const foe = who === 'player' ? game.enemy : game.player;
  const card = fighter.hand[handIndex];
  if (!card || fighter.energy < card.cost) return null;
  fighter.energy -= card.cost;
  fighter.hand.splice(handIndex, 1);
  fighter.discard.push(card);
  game.stats.cardsPlayed += 1;
  const report = { card, who, damage: 0, absorbed: 0, lifeLost: 0, healed: 0, blocked: 0, drew: 0 };
  if (card.damage) {
    const hit = dealDamage(game, foe, card.damage, fighter.name);
    report.damage = card.damage;
    report.absorbed = hit.absorbed;
    report.lifeLost = hit.lifeLost;
  }
  if (card.block) {
    fighter.block += card.block;
    game.stats.blocks += card.block;
    report.blocked = card.block;
  }
  if (card.heal) report.healed = healFighter(game, fighter, card.heal);
  if (card.energy) fighter.energy = Math.min(MAX_ENERGY + 2, fighter.energy + card.energy);
  if (card.draw) {
    const before = fighter.hand.length;
    drawCards(game, fighter, card.draw);
    report.drew = fighter.hand.length - before;
  }
  addLog(game, `${fighter.name} played ${describeCard(card)}.`, card.damage ? 'dmg' : card.heal ? 'heal' : card.block ? 'blk' : '');
  checkEnd(game);
  return report;
}

function checkEnd(game) {
  if (game.enemy.hp <= 0) {
    game.phase = PHASE_WON;
    addLog(game, 'King Roderick falls. The crown is yours!');
  } else if (game.player.hp <= 0) {
    game.phase = PHASE_LOST;
    addLog(game, 'You fall. The King keeps his throne… this time.');
  }
}

/** Start the player's turn: fresh block fades, energy refills, cards drawn. */
export function startPlayerTurn(game) {
  game.active = 'player';
  game.player.block = 0;
  game.player.energy = MAX_ENERGY;
  drawCards(game, game.player, DRAW_PER_TURN);
  if (game.phase === PHASE_PLAY) addLog(game, `Turn ${game.turn} — your move.`);
}

/** Start the enemy's turn: fresh block fades, energy refills, cards drawn. */
export function startEnemyTurn(game) {
  game.active = 'enemy';
  game.enemy.block = 0;
  game.enemy.energy = MAX_ENERGY;
  drawCards(game, game.enemy, DRAW_PER_TURN);
  if (game.phase === PHASE_PLAY) addLog(game, `King Roderick takes his turn…`);
}

/** End the enemy turn and open the next player turn. */
export function nextTurn(game) {
  game.turn += 1;
  startPlayerTurn(game);
}
