// King Roderick's brain: a greedy but sensible turn — heal when hurt, hit hard when
// he can, guard what is left. Returns the hand indexes to play, in order.
import { playCard } from './state.js';

/** Value of playing a card now, for the AI's greedy pick. */
function valueOf(game, card) {
  let value = 0;
  if (card.damage) value += card.damage * 2;
  if (card.block) value += card.block * (game.player.hp <= 8 ? 1.2 : 0.8);
  if (card.heal) value += game.enemy.hp <= 12 ? card.heal * 3 : card.heal * 0.5;
  if (card.draw) value += 2;
  if (card.energy) value += 3;
  if (card.cost === 0) value += 1;
  return value - card.cost * 1.5;
}

/** Play the AI's whole turn at once (the UI replays the reports one by one). */
export function playEnemyTurn(game) {
  const reports = [];
  for (;;) {
    if (game.phase !== 'play') break;
    let bestIndex = -1;
    let bestValue = 0;
    for (let i = 0; i < game.enemy.hand.length; i += 1) {
      const card = game.enemy.hand[i];
      if (card.cost > game.enemy.energy) continue;
      const value = valueOf(game, card);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;
    const report = playCard(game, 'enemy', bestIndex);
    if (report) reports.push(report);
  }
  return reports;
}

/** A decent human heuristic, used only to stage the screenshots: hit hard, guard, heal. */
export function autoplayPlayerTurn(game) {
  const reports = [];
  for (;;) {
    if (game.phase !== 'play') break;
    let bestIndex = -1;
    let bestValue = 0;
    for (let i = 0; i < game.player.hand.length; i += 1) {
      const card = game.player.hand[i];
      if (card.cost > game.player.energy) continue;
      let value = 0;
      if (card.damage) value += card.damage * 2;
      if (card.block) value += game.player.hp <= 10 ? card.block * 1.5 : card.block * 0.6;
      if (card.heal) value += game.player.hp <= 12 ? card.heal * 3 : card.heal * 0.4;
      if (card.draw) value += 2;
      if (card.energy) value += 3;
      if (card.cost === 0) value += 1;
      value -= card.cost * 1.2;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }
    if (bestIndex === -1) break;
    const report = playCard(game, 'player', bestIndex);
    if (report) reports.push(report);
  }
  return reports;
}

/** A careless player: plays nothing, so the King wins — stages the loss screenshot. */
export function idlePlayerTurn() {
  return [];
}
