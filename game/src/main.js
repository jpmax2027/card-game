// Bootstrap: wires the table to the rules — clicks, keys, the enemy's animated turn,
// the title and end overlays, and the ?shot= scenes used for the screenshots.
import { makeRng } from './rng.js';
import { PHASE_LOST, PHASE_PLAY, PHASE_TITLE, PHASE_WON, createGame, nextTurn, playCard, startEnemyTurn, startPlayerTurn } from './state.js';
import { playEnemyTurn } from './ai.js';
import { floatNumber, hideEnd, hideTitle, render, shakeRow, showBanner, showEnd, showTitle } from './render.js';
import { sfx, toggleMuted } from './audio.js';
import { stageShot } from './shots.js';

let game = null;
let busy = false;
const ENEMY_STEP_MS = 650;

function newSeed() {
  return (Date.now() % 2147483647) + 1;
}

function startNewGame() {
  game = createGame(makeRng(newSeed()), newSeed());
  game.phase = PHASE_PLAY;
  startPlayerTurn(game);
  hideEnd();
  hideTitle();
  render(game, onCardClick);
  showBanner('Your turn');
  sfx.turn();
}

function onCardClick(index) {
  if (!game || busy || game.phase !== PHASE_PLAY || game.active !== 'player') return;
  const card = game.player.hand[index];
  if (!card || card.cost > game.player.energy) return;
  const el = document.querySelector(`.card[data-uid="${card.uid}"]`);
  if (el) el.classList.add('playing');
  busy = true;
  setTimeout(() => {
    const report = playCard(game, 'player', index);
    busy = false;
    if (!report) {
      render(game, onCardClick);
      return;
    }
    sfx.play();
    if (report.lifeLost > 0) {
      floatNumber('enemy', `-${report.lifeLost}`, 'dmg');
      shakeRow('enemy');
      sfx.hit();
    }
    if (report.absorbed > 0) floatNumber('enemy', `blocked ${report.absorbed}`, 'blk');
    if (report.healed > 0) {
      floatNumber('player', `+${report.healed}`, 'heal');
      sfx.heal();
    }
    if (report.blocked > 0) {
      floatNumber('player', `+${report.blocked} block`, 'blk');
      sfx.block();
    }
    render(game, onCardClick);
    if (game.phase === PHASE_WON) return endGame();
    if (game.phase === PHASE_LOST) return endGame();
  }, 260);
}

function endTurn() {
  if (!game || busy || game.phase !== PHASE_PLAY || game.active !== 'player') return;
  busy = true;
  startEnemyTurn(game);
  render(game, onCardClick);
  const reports = playEnemyTurn(game);
  let step = 0;
  const stepFn = () => {
    if (step < reports.length) {
      const report = reports[step];
      step += 1;
      if (report.lifeLost > 0) {
        floatNumber('player', `-${report.lifeLost}`, 'dmg');
        shakeRow('player');
        sfx.hit();
      }
      if (report.absorbed > 0) floatNumber('player', `blocked ${report.absorbed}`, 'blk');
      if (report.healed > 0) {
        floatNumber('enemy', `+${report.healed}`, 'heal');
        sfx.heal();
      }
      if (report.blocked > 0) {
        floatNumber('enemy', `+${report.blocked} block`, 'blk');
        sfx.block();
      }
      render(game, onCardClick);
      if (game.phase === PHASE_LOST) {
        busy = false;
        return endGame();
      }
      setTimeout(stepFn, ENEMY_STEP_MS);
      return;
    }
    nextTurn(game);
    busy = false;
    render(game, onCardClick);
    showBanner(`Turn ${game.turn} — your move`);
    sfx.turn();
  };
  setTimeout(stepFn, ENEMY_STEP_MS);
}

function endGame() {
  render(game, onCardClick);
  if (game.phase === PHASE_WON) sfx.win();
  if (game.phase === PHASE_LOST) sfx.lose();
  setTimeout(() => showEnd(game), 450);
}

function showHelp(show) {
  document.getElementById('helpOverlay').classList.toggle('hidden', !show);
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') ?? 7) || 7;
  if (shot) {
    const staged = stageShot(shot, seed);
    game = staged.game;
    hideTitle();
    if (staged.screen === PHASE_WON || staged.screen === PHASE_LOST) {
      render(game, onCardClick);
      showEnd(game);
    } else if (staged.screen === 'title') {
      render(game, onCardClick);
      showTitle();
    } else {
      render(game, onCardClick);
      showBanner('Your turn');
    }
    document.body.classList.add('shot');
    return;
  }

  game = createGame(makeRng(newSeed()), newSeed());
  render(game, onCardClick);
  showTitle();

  document.getElementById('playBtn').addEventListener('click', startNewGame);
  document.getElementById('againBtn').addEventListener('click', startNewGame);
  document.getElementById('menuBtn').addEventListener('click', () => {
    game = createGame(makeRng(newSeed()), newSeed());
    render(game, onCardClick);
    hideEnd();
    showTitle();
  });
  document.getElementById('endTurnBtn').addEventListener('click', endTurn);
  document.getElementById('restartBtn').addEventListener('click', () => {
    if (game.phase === PHASE_TITLE) return;
    startNewGame();
  });
  document.getElementById('howBtn').addEventListener('click', () => showHelp(true));
  document.getElementById('closeHelpBtn').addEventListener('click', () => showHelp(false));
  document.getElementById('soundBtn').addEventListener('click', (event) => {
    const muted = toggleMuted();
    event.currentTarget.textContent = muted ? 'Sound: off' : 'Sound: on';
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'h' || event.key === 'H') return showHelp(true);
    if (event.key === 'Escape') return showHelp(false);
    if (event.key === 'r' || event.key === 'R') {
      if (game.phase === PHASE_WON || game.phase === PHASE_LOST) return startNewGame();
      return;
    }
    if (game.phase !== PHASE_PLAY || game.active !== 'player' || busy) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      return endTurn();
    }
    const number = Number(event.key);
    if (number >= 1 && number <= game.player.hand.length) onCardClick(number - 1);
  });
}

boot();
