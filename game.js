// ===================================
// PRESS YOUR LUCK — game.js
// ===================================

// ─── PRIZE TABLE ────────────────────────────────────────────────────────────
const PRIZES = [
  // Money prizes
  { type: 'money', icon: '💵', label: '$500',   value: 500,  weight: 8 },
  { type: 'money', icon: '💰', label: '$1,000', value: 1000, weight: 7 },
  { type: 'money', icon: '💰', label: '$2,500', value: 2500, weight: 5 },
  { type: 'money', icon: '💎', label: '$5,000', value: 5000, weight: 3 },
  { type: 'money', icon: '🏆', label: '$10,000',value:10000, weight: 1 },
  // Spin prizes
  { type: 'spin',  icon: '🔄', label: '+1 SPIN', value: 0,  extra: '+1 Spin', weight: 5 },
  { type: 'spin',  icon: '⭐', label: '$500 + SPIN', value: 500, extra: '+1 Spin', weight: 4 },
  { type: 'spin',  icon: '🌟', label: '$1,000 + SPIN', value: 1000, extra: '+1 Spin', weight: 2 },
  // Bonus prizes
  { type: 'bonus', icon: '✈️', label: 'VACATION!', value: 3000, extra: 'Trip to Hawaii', weight: 1 },
  { type: 'bonus', icon: '🚗', label: 'CAR!',      value: 8000, extra: 'New Car!',       weight: 1 },
  { type: 'bonus', icon: '🎁', label: 'BIG PRIZE', value: 2000, extra: 'Mystery Gift',   weight: 2 },
  // Whammies (bad!) — weighted at ~70% of total pool
  { type: 'whammy', icon: '😈', label: 'WHAMMY!', value: 0,  weight: 91 },
];

// Build weighted pool
const PRIZE_POOL = [];
PRIZES.forEach(p => {
  for (let i = 0; i < p.weight; i++) PRIZE_POOL.push(p);
});

const BOARD_SIZE = 18;

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  players: [
    { name: 'PLAYER 1', cash: 0, spins: 5, whammies: 0 },
    { name: 'PLAYER 2', cash: 0, spins: 5, whammies: 0 },
  ],
  currentPlayer: 0,
  spinning: false,
  spinInterval: null,
  activeCell: 0,
  roundsLeft: 2,   // each player gets 2 rounds
  roundsUsed: [0, 0],
  gameOver: false,
};

// ─── DOM REFS ────────────────────────────────────────────────────────────────
const boardEl       = document.getElementById('board');
const stopBtn       = document.getElementById('stopBtn');
const passBtn       = document.getElementById('passBtn');
const turnInfoEl    = document.getElementById('turnInfo');
const popupOverlay  = document.getElementById('popupOverlay');
const popupEl       = document.getElementById('popup');
const popupIcon     = document.getElementById('popupIcon');
const popupTitle    = document.getElementById('popupTitle');
const popupMsg      = document.getElementById('popupMsg');
const popupBtn      = document.getElementById('popupBtn');
const gameoverOverlay= document.getElementById('gameoverOverlay');
const gameoverWinner = document.getElementById('gameoverWinner');
const gameoverScores = document.getElementById('gameoverScores');
const restartBtn    = document.getElementById('restartBtn');

// ─── BUTTON STATE HELPER ─────────────────────────────────────────────────────
function setStopBtn(mode) {
  // mode: 'spin' | 'stop' | 'disabled'
  if (mode === 'spin') {
    stopBtn.disabled = false;
    stopBtn.innerHTML = '<span class="btn-icon">🎰</span><span>SPIN!</span>';
    stopBtn.style.background = 'linear-gradient(135deg, #1a6b1a, #22c55e)';
    stopBtn.style.boxShadow = '0 4px 20px rgba(34,197,94,0.5)';
  } else if (mode === 'stop') {
    stopBtn.disabled = false;
    stopBtn.innerHTML = '<span class="btn-icon">🛑</span><span>STOP!</span>';
    stopBtn.style.background = 'linear-gradient(135deg, var(--red-dark), var(--red))';
    stopBtn.style.boxShadow = '0 4px 20px rgba(230,57,70,0.5)';
  } else {
    stopBtn.disabled = true;
    stopBtn.innerHTML = '<span class="btn-icon">🛑</span><span>STOP!</span>';
    stopBtn.style.background = 'linear-gradient(135deg, var(--red-dark), var(--red))';
    stopBtn.style.boxShadow = '0 4px 20px rgba(230,57,70,0.5)';
  }
}

// ─── INIT BOARD ──────────────────────────────────────────────────────────────
let boardPrizes = [];

function buildBoard() {
  boardEl.innerHTML = '';
  boardPrizes = [];

  // Guarantee between 4 and 8 whammies on the board
  const whammyCount = 4 + Math.floor(Math.random() * 5); // 4-8
  const whammyPrize = PRIZES.find(p => p.type === 'whammy');
  const nonWhammyPool = PRIZE_POOL.filter(p => p.type !== 'whammy');
  const whammies = Array(whammyCount).fill(whammyPrize);
  const others = shuffle([...nonWhammyPool]).slice(0, BOARD_SIZE - whammyCount);
  const arrangement = shuffle([...whammies, ...others]);

  for (let i = 0; i < BOARD_SIZE; i++) {
    const prize = arrangement[i];
    boardPrizes.push(prize);

    const cell = document.createElement('div');
    cell.className = `cell type-${prize.type}`;
    cell.id = `cell-${i}`;

    const iconDiv = document.createElement('div');
    iconDiv.className = 'cell-icon';
    iconDiv.textContent = prize.icon;

    const labelDiv = document.createElement('div');
    labelDiv.className = 'cell-label';
    labelDiv.textContent = prize.label;

    cell.appendChild(iconDiv);
    cell.appendChild(labelDiv);

    if (prize.extra) {
      const extraDiv = document.createElement('div');
      extraDiv.className = 'cell-extra';
      extraDiv.textContent = prize.extra;
      cell.appendChild(extraDiv);
    }

    boardEl.appendChild(cell);
  }
}

// ─── BACKGROUND EYES ────────────────────────────────────────────────────────
function buildBgEyes() {
  const container = document.getElementById('bgEyes');
  for (let i = 0; i < 40; i++) {
    const dot = document.createElement('div');
    dot.className = 'eye-dot';
    dot.style.left = Math.random() * 100 + '%';
    dot.style.top  = Math.random() * 100 + '%';
    dot.style.animationDelay = (Math.random() * 3) + 's';
    dot.style.opacity = (Math.random() * 0.12 + 0.04).toString();
    container.appendChild(dot);
  }
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────────
function updateScoreboard() {
  const p = state.players;
  document.getElementById('p1cash').textContent = '$' + p[0].cash.toLocaleString();
  document.getElementById('p2cash').textContent = '$' + p[1].cash.toLocaleString();
  document.getElementById('p1spins').textContent = `Spins: ${p[0].spins}`;
  document.getElementById('p2spins').textContent = `Spins: ${p[1].spins}`;

  document.getElementById('p1card').classList.toggle('active', state.currentPlayer === 0);
  document.getElementById('p2card').classList.toggle('active', state.currentPlayer === 1);
}

function setTurnInfo(msg) {
  turnInfoEl.textContent = msg;
}

function highlightCell(index) {
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
  document.getElementById(`cell-${index}`)?.classList.add('active');
}

// ─── SPIN LOGIC ──────────────────────────────────────────────────────────────
let spinSpeed = 60; // ms per step

function startSpin() {
  if (state.spinning || state.gameOver) return;
  const cp = state.players[state.currentPlayer];
  if (cp.spins <= 0) {
    setTurnInfo('No spins left!');
    return;
  }

  state.spinning = true;
  spinSpeed = 60;
  setStopBtn('stop');
  passBtn.disabled = true;
  setTurnInfo(`${state.players[state.currentPlayer].name} — SPINNING!`);

  state.spinInterval = setInterval(() => {
    state.activeCell = (state.activeCell + 1) % BOARD_SIZE;
    highlightCell(state.activeCell);
  }, spinSpeed);
}

function stopSpin() {
  if (!state.spinning) return;

  // Slow down effect
  clearInterval(state.spinInterval);
  slowDown();
}

function slowDown() {
  let speed = spinSpeed;
  let steps = 0;
  const maxSteps = 10 + Math.floor(Math.random() * 8);

  function tick() {
    state.activeCell = (state.activeCell + 1) % BOARD_SIZE;
    highlightCell(state.activeCell);
    steps++;
    speed = Math.min(speed + 18, 350);

    if (steps < maxSteps) {
      setTimeout(tick, speed);
    } else {
      // Final cell
      state.spinning = false;
      setStopBtn('disabled');
      resolvePrize();
    }
  }
  tick();
}

// ─── PRIZE RESOLUTION ────────────────────────────────────────────────────────
function resolvePrize() {
  const prize = boardPrizes[state.activeCell];
  const cp = state.players[state.currentPlayer];

  cp.spins--;

  if (prize.type === 'whammy') {
    // WHAMMY!
    cp.whammies++;
    const lostCash = cp.cash;
    cp.cash = 0;

    // Rebuild board with new arrangement
    buildBoard();

    updateScoreboard();

    if (cp.whammies >= 4) {
      // 4 whammies = out!
      showPopup(true, prize.icon, 'WHAMMY #4!',
        `${cp.name} hit 4 Whammies and is OUT of the game!\nLost $${lostCash.toLocaleString()}.`,
        () => {
          eliminatePlayer();
        });
    } else {
      showPopup(true, prize.icon, 'WHAMMY!',
        `${cp.name} hit a Whammy!\nAll cash lost! (Whammy #${cp.whammies}/4)\nLost: $${lostCash.toLocaleString()}`,
        () => {
          afterResult();
        });
    }
  } else {
    // Award cash and/or spins
    if (prize.value > 0) cp.cash += prize.value;
    const spinBonus = prize.extra && prize.extra.includes('+1 Spin');
    if (spinBonus) cp.spins++;

    updateScoreboard();

    const extraMsg = prize.extra && !spinBonus ? `\nBonus: ${prize.extra}` : '';
    const spinMsg  = spinBonus ? '\n+1 Spin added!' : '';
    const cashMsg  = prize.value > 0 ? `+$${prize.value.toLocaleString()} added to your bank!` : '';

    showPopup(false, prize.icon, prize.label,
      (cashMsg || 'No cash this time.') + spinMsg + extraMsg,
      () => {
        afterResult();
      });
  }
}

function afterResult() {
  const cp = state.players[state.currentPlayer];

  if (cp.spins <= 0) {
    // Turn over, switch players
    endTurn();
  } else {
    // Player can keep going or pass
    setTurnInfo(`${cp.name} — Spins left: ${cp.spins}. Keep going or pass!`);
    setStopBtn('spin');
    passBtn.disabled = false;
  }
}

function endTurn() {
  const cp = state.players[state.currentPlayer];
  state.roundsUsed[state.currentPlayer]++;

  // Check if both players have used their rounds
  const otherPlayer = 1 - state.currentPlayer;
  const other = state.players[otherPlayer];

  // Switch player
  state.currentPlayer = otherPlayer;

  if (other.spins <= 0) {
    // Both players out of spins — game over
    triggerGameOver();
    return;
  }

  updateScoreboard();
  setTurnInfo(`${other.name}'s turn! Press SPIN! to spin.`);
  setStopBtn('spin');
  passBtn.disabled = true;

  // Auto start
  setTimeout(startSpin, 800);
}

function eliminatePlayer() {
  const cp = state.players[state.currentPlayer];
  const other = state.players[1 - state.currentPlayer];
  cp.spins = 0;
  setTurnInfo(`${cp.name} has been eliminated!`);

  if (other.spins <= 0) {
    triggerGameOver();
  } else {
    state.currentPlayer = 1 - state.currentPlayer;
    updateScoreboard();
    setTurnInfo(`${state.players[state.currentPlayer].name}'s turn!`);
    setStopBtn('spin');
    passBtn.disabled = true;
    setTimeout(startSpin, 800);
  }
}

// ─── PASS SPINS ──────────────────────────────────────────────────────────────
function passSpins() {
  const cp = state.players[state.currentPlayer];
  const other = state.players[1 - state.currentPlayer];
  const passed = cp.spins;
  other.spins += passed;
  cp.spins = 0;

  setTurnInfo(`${cp.name} passed ${passed} spin(s) to ${other.name}!`);
  setStopBtn('disabled');
  passBtn.disabled = true;

  updateScoreboard();

  setTimeout(() => {
    endTurn();
  }, 1200);
}

// ─── POPUP ───────────────────────────────────────────────────────────────────
let popupCallback = null;

function showPopup(isWhammy, icon, title, msg, cb) {
  popupCallback = cb;
  popupIcon.textContent = icon;
  popupTitle.textContent = title;
  popupMsg.textContent = msg;
  popupEl.className = 'popup' + (isWhammy ? ' whammy' : '');
  if (isWhammy) {
    popupEl.classList.add('whammy-shake');
    setTimeout(() => popupEl.classList.remove('whammy-shake'), 700);
  }
  popupOverlay.classList.add('show');
}

popupBtn.addEventListener('click', () => {
  popupOverlay.classList.remove('show');
  if (popupCallback) {
    const cb = popupCallback;
    popupCallback = null;
    setTimeout(cb, 200);
  }
});

// ─── GAME OVER ───────────────────────────────────────────────────────────────
function triggerGameOver() {
  state.gameOver = true;
  setStopBtn('disabled');
  passBtn.disabled = true;

  const p0 = state.players[0];
  const p1 = state.players[1];

  let winnerText;
  if (p0.cash > p1.cash) winnerText = `🏆 ${p0.name} WINS!`;
  else if (p1.cash > p0.cash) winnerText = `🏆 ${p1.name} WINS!`;
  else winnerText = "🤝 IT'S A TIE!";

  gameoverWinner.textContent = winnerText;
  gameoverScores.textContent =
    `${p0.name}: $${p0.cash.toLocaleString()} | ${p1.name}: $${p1.cash.toLocaleString()}`;

  setTimeout(() => {
    gameoverOverlay.classList.add('show');
  }, 400);
}

restartBtn.addEventListener('click', () => {
  location.reload();
});

// ─── CONTROLS ────────────────────────────────────────────────────────────────
stopBtn.addEventListener('click', () => {
  if (state.spinning) {
    stopSpin();
  } else {
    startSpin();
  }
});

passBtn.addEventListener('click', passSpins);

// ─── UTILS ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── BOOTSTRAP ───────────────────────────────────────────────────────────────
function init() {
  buildBgEyes();
  buildBoard();
  updateScoreboard();
  setTurnInfo(`${state.players[0].name}'s turn — Press SPIN! to spin!`);

  // Enable stop button to start
  setStopBtn('spin');
  passBtn.disabled = true;

  // Auto-start first spin after a beat
  setTimeout(startSpin, 1000);
}

init();
