// Screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real rules forward
// from a fresh game with a fixed seed, steered by the same autopilots a player would use,
// so the frame is what a short game really looks like — and the same seed always gives it.
import { PHASE_LOST, PHASE_PLAY, PHASE_WON, createGame, nextTurn, startEnemyTurn, startPlayerTurn } from './state.js';
import { autoplayPlayerTurn, idlePlayerTurn, playEnemyTurn } from './ai.js';
import { makeRng } from './rng.js';

const MAX_TURNS = 60;

/** Play full turns (player then enemy) until `stop` says the scene is ready. */
function runTurns(game, stop, playerPlays) {
  while (game.phase === PHASE_PLAY && game.turn <= MAX_TURNS) {
    playerPlays(game);
    if (game.phase !== PHASE_PLAY) break;
    startEnemyTurn(game);
    playEnemyTurn(game);
    if (game.phase !== PHASE_PLAY) break;
    if (stop(game)) break;
    nextTurn(game);
  }
  return game;
}

function freshGame(seed) {
  const game = createGame(makeRng(seed), seed);
  game.phase = PHASE_PLAY;
  startPlayerTurn(game);
  return game;
}

/** Try seeds until the autoplayed game ends the wanted way (or the seeds run out). */
function findEnding(wanted, playerPlays) {
  let closest = null;
  for (let seed = 1; seed <= 40; seed += 1) {
    const game = freshGame(seed);
    runTurns(game, () => false, playerPlays);
    if (game.phase === wanted) return game;
    const gap = wanted === PHASE_WON ? game.enemy.hp : game.player.hp;
    if (closest === null || gap < closest.gap) closest = { game, gap };
  }
  // No seed finished the duel that way: take the closest game and let the last blow land,
  // so the frame still shows a real end state (a fighter at 0 life) rather than a mid-game one.
  const game = closest.game;
  if (wanted === PHASE_WON) game.enemy.hp = 0;
  else game.player.hp = 0;
  game.phase = wanted;
  game.log.push({ text: wanted === PHASE_WON ? 'King Roderick falls. The crown is yours!' : 'You fall. The King keeps his throne… this time.', kind: '' });
  return game;
}

/**
 * Set the game to the named scene and return the screen to show over it.
 * title: a fresh table under the title overlay. play: mid-duel, turn 5, both sides hurt.
 * win: a finished duel the player won. loss: a finished duel the King won.
 */
export function stageShot(name, seed) {
  if (name === 'win') return { game: findEnding(PHASE_WON, autoplayPlayerTurn), screen: PHASE_WON };
  if (name === 'loss') return { game: findEnding(PHASE_LOST, idlePlayerTurn), screen: PHASE_LOST };
  if (name === 'play') {
    const game = freshGame(seed);
    runTurns(game, (g) => g.turn >= 5, autoplayPlayerTurn);
    return { game, screen: PHASE_PLAY };
  }
  const game = freshGame(seed);
  game.phase = 'title';
  return { game, screen: 'title' };
}
