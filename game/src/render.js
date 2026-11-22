// The table: turns game state into DOM — hands, life bars, energy, log and overlays.
// Animations are CSS classes; floating numbers are spawned here and removed by the browser.
import { SUITS, describeCard } from './cards.js';
import { PHASE_LOST, PHASE_PLAY, PHASE_WON, score } from './state.js';

const $ = (id) => document.getElementById(id);

export function hpPercent(fighter) {
  return Math.max(0, Math.round((fighter.hp / fighter.maxHp) * 100));
}

function energyPips(fighter, max) {
  let pips = '';
  for (let i = 0; i < max; i += 1) pips += i < fighter.energy ? '◆' : '◇';
  return `${pips} ${fighter.energy}`;
}

function cardElement(card, index, playable, onPlay) {
  const suit = SUITS[card.suit];
  const el = document.createElement('div');
  el.className = `card suit-${card.suit} ${playable ? 'playable' : 'unplayable'}`;
  el.dataset.uid = String(card.uid);
  const mainValue = card.damage ?? card.block ?? card.heal ?? '';
  const mainWord = card.damage ? 'DMG' : card.block ? 'BLOCK' : card.heal ? 'HEAL' : card.energy ? 'ENERGY' : 'DRAW';
  el.innerHTML = `<span class="cost">${card.cost}</span><span class="suit">${suit.glyph}</span>` +
    `<div class="name">${card.name}</div>` +
    `<div class="big">${mainValue}<small> ${mainWord}</small></div>` +
    `<div class="kind">${suit.label} · ${card.cost} energy</div>` +
    `<div class="flavor">${card.flavor}</div>` +
    `<span class="key">${index + 1}</span>`;
  el.title = describeCard(card);
  if (playable) el.addEventListener('click', () => onPlay(index));
  return el;
}

function renderFighter(prefix, fighter, maxEnergy) {
  $(`${prefix}HpFill`).style.width = `${hpPercent(fighter)}%`;
  $(`${prefix}HpText`).textContent = `${fighter.hp} / ${fighter.maxHp} ♥`;
  $(`${prefix}HpFill`).parentElement.classList.toggle('low', fighter.hp <= 8);
  const blockEl = $(`${prefix}Block`);
  blockEl.textContent = fighter.block > 0 ? `Block ${fighter.block}` : '';
  $(`${prefix}Energy`).textContent = `Energy ${energyPips(fighter, maxEnergy)}`;
  $(`${prefix}DeckCount`).textContent = String(fighter.deck.length);
}

/** Full re-render of the table for the current state. `onPlay` fires when a card is clicked. */
export function render(game, onPlay) {
  $('turnLabel').textContent = `Turn ${game.turn}`;
  $('scoreLabel').textContent = `Score ${score(game)}`;
  $('roundLabel').textContent = game.phase === PHASE_PLAY ? 'Duel in progress' : game.phase === PHASE_WON ? 'You won!' : game.phase === PHASE_LOST ? 'You lost' : 'At the table';
  renderFighter('enemy', game.enemy, 3);
  renderFighter('player', game.player, 3);
  $('playerDiscardCount').textContent = String(game.player.discard.length);

  const enemyHand = $('enemyHand');
  enemyHand.innerHTML = '';
  for (let i = 0; i < game.enemy.hand.length; i += 1) {
    const back = document.createElement('div');
    back.className = 'mini-card';
    enemyHand.appendChild(back);
  }

  const hand = $('hand');
  hand.innerHTML = '';
  game.player.hand.forEach((card, index) => {
    const playable = game.phase === PHASE_PLAY && game.active === 'player' && card.cost <= game.player.energy;
    hand.appendChild(cardElement(card, index, playable, onPlay));
  });

  const logEl = $('log');
  logEl.innerHTML = '';
  for (const entry of game.log.slice(-6)) {
    const line = document.createElement('div');
    line.className = `log-line ${entry.kind}`;
    line.textContent = entry.text;
    logEl.appendChild(line);
  }
  const latest = logEl.lastElementChild;
  if (latest) latest.classList.add('latest');

  $('endTurnBtn').disabled = !(game.phase === PHASE_PLAY && game.active === 'player');
  $('endTurnBtn').textContent = game.active === 'enemy' ? 'King’s turn…' : 'End turn ';
  if (game.active === 'player' && game.phase === PHASE_PLAY) {
    const kbd = document.createElement('kbd');
    kbd.textContent = 'Space';
    $('endTurnBtn').appendChild(kbd);
  }
  const intent = $('enemyIntent');
  intent.textContent = game.phase === PHASE_PLAY ? (game.active === 'enemy' ? '— plotting his move…' : '— waiting for you') : '';
  $('status').textContent = `You have ${game.player.hp} life, King Roderick has ${game.enemy.hp}. Turn ${game.turn}.`;
}

export function showBanner(text) {
  const banner = $('banner');
  banner.textContent = text;
  banner.classList.remove('hidden', 'pop');
  void banner.offsetWidth;
  banner.classList.add('pop');
}

/** A floating number over a fighter row: damage (red), healing (green) or block (blue). */
export function floatNumber(target, text, kind) {
  const row = target === 'player' ? $('playerRow') : $('enemyRow');
  const layer = $('fxLayer');
  const rowRect = row.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-num ${kind}`;
  el.textContent = text;
  el.style.left = `${rowRect.left - layerRect.left + rowRect.width / 2 - 30}px`;
  el.style.top = `${rowRect.top - layerRect.top + 8}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

export function shakeRow(target) {
  const row = target === 'player' ? $('playerRow') : $('enemyRow');
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
}

export function showEnd(game) {
  const overlay = $('endOverlay');
  const won = game.phase === PHASE_WON;
  $('endGlyph').textContent = won ? '♛' : '♚';
  const title = $('endTitle');
  title.textContent = won ? 'VICTORY' : 'DEFEAT';
  title.classList.toggle('lose', !won);
  $('endText').textContent = won
    ? 'King Roderick falls. The crown is yours — the throne, the glory, the whole deck.'
    : 'King Roderick keeps his throne… this time. Shuffle up and challenge him again.';
  $('endStats').innerHTML =
    `<span>Score<b>${score(game)}</b></span>` +
    `<span>Turns<b>${game.turn}</b></span>` +
    `<span>Damage dealt<b>${game.stats.damageDealt}</b></span>` +
    `<span>Cards played<b>${game.stats.cardsPlayed}</b></span>`;
  overlay.classList.remove('hidden');
}

export function hideEnd() {
  $('endOverlay').classList.add('hidden');
}

export function showTitle() {
  $('titleOverlay').classList.remove('hidden');
}

export function hideTitle() {
  $('titleOverlay').classList.add('hidden');
}
