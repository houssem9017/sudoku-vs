/// <reference lib="dom" />

/* ── Types ── */
interface CellData {
  value: number;
  notes: number[];
  isGiven: boolean;
  isError: boolean;
}

interface GameStateData {
  board: CellData[][];
  solution: number[][];
  difficulty: string;
  status: string;
  mistakes: number;
  maxMistakes: number;
  time: number;
  hintsUsed: number;
  maxHints: number;
  selectedCell: { row: number; col: number } | null;
  notesMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

interface HintInfo {
  row: number;
  col: number;
  value: number;
  explanation: string;
  hintsRemaining: number;
}

/* ── VS Code bridge ── */
declare const acquireVsCodeApi: () => {
  postMessage: (msg: unknown) => void;
  getState: () => unknown;
  setState: (s: unknown) => void;
};
const vscode = acquireVsCodeApi();

/* ── State ── */
let game: GameStateData | null = null;
let selCell: { row: number; col: number } | null = null;
let activeHint: HintInfo | null = null;

/* ── Init ── */
function init() {
  buildUI();
  bindEvents();
  showMenu();
  vscode.postMessage({ type: 'ready' });
}

/* ── Build UI ── */
function buildUI() {
  const root = document.getElementById('root')!;
  root.innerHTML = '';

  const wrap = el('div', 'sudoku-wrap');

  // Header bar
  const bar = el('div', 'sudoku-bar hidden');
  bar.id = 'bar';
  bar.innerHTML = `
    <div class="sudoku-bar-left">
      <span class="sudoku-diff" id="diff"></span>
    </div>
    <div class="sudoku-bar-right">
      <span class="sudoku-mistakes" id="mistakes"></span>
      <span class="sudoku-timer" id="timer">00:00</span>
    </div>
  `;
  wrap.appendChild(bar);

  // Hint banner
  const hintBanner = el('div', 'sudoku-hint-banner hidden');
  hintBanner.id = 'hint-banner';
  hintBanner.innerHTML = `
    <div class="hint-text" id="hint-text"></div>
    <div class="hint-actions">
      <button class="sudoku-mbtn hint-btn" id="hint-apply">Fill</button>
      <button class="sudoku-mbtn hint-btn hint-btn-dismiss" id="hint-dismiss">Dismiss</button>
    </div>
  `;
  wrap.appendChild(hintBanner);

  // Board
  const board = el('div', 'sudoku-board hidden');
  board.id = 'board';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = el('div', 'sudoku-cell');
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);

      const val = el('span', 'cell-value');
      const notes = el('div', 'cell-notes');
      for (let n = 1; n <= 9; n++) {
        const nd = el('span', 'note-digit');
        nd.dataset.note = String(n);
        nd.textContent = String(n);
        notes.appendChild(nd);
      }
      cell.appendChild(val);
      cell.appendChild(notes);
      board.appendChild(cell);
    }
  }
  wrap.appendChild(board);

  // Overlay
  const overlay = el('div', 'sudoku-overlay hidden');
  overlay.id = 'overlay';
  wrap.appendChild(overlay);

  // Toolbar
  const toolbar = el('div', 'sudoku-toolbar hidden');
  toolbar.id = 'toolbar';
  toolbar.innerHTML = `
    <button class="sudoku-tbtn" id="btn-menu" title="Menu (M)"><span class="tbtn-icon">☰</span></button>
    <button class="sudoku-tbtn" id="btn-undo" title="Undo (Ctrl+Z)"><span class="tbtn-icon">↩</span></button>
    <button class="sudoku-tbtn" id="btn-redo" title="Redo (Ctrl+Y)"><span class="tbtn-icon">↪</span></button>
    <button class="sudoku-tbtn" id="btn-erase" title="Erase (Del)"><span class="tbtn-icon">⌫</span></button>
    <button class="sudoku-tbtn" id="btn-notes" title="Notes (N)"><span class="tbtn-icon">✏</span></button>
    <button class="sudoku-tbtn" id="btn-hint" title="Hint (H)"><span class="tbtn-icon">💡</span></button>
    <button class="sudoku-tbtn" id="btn-pause" title="Pause (P)"><span class="tbtn-icon">⏸</span></button>
  `;
  wrap.appendChild(toolbar);

  // Numpad
  const numpad = el('div', 'sudoku-numpad hidden');
  numpad.id = 'numpad';
  for (let n = 1; n <= 9; n++) {
    const btn = el('button', 'sudoku-num');
    btn.dataset.num = String(n);
    btn.textContent = String(n);
    numpad.appendChild(btn);
  }
  wrap.appendChild(numpad);

  // Menu
  const menu = el('div', 'sudoku-menu');
  menu.id = 'menu';
  menu.innerHTML = `
    <button class="sudoku-mbtn" id="m-new">New Game</button>
    <button class="sudoku-mbtn" id="m-cont">Continue Game</button>
    <button class="sudoku-mbtn" id="m-daily">Daily Challenge</button>
    <button class="sudoku-mbtn" id="m-stats">Statistics</button>
  `;
  wrap.appendChild(menu);

  root.appendChild(wrap);
}

/* ── Event bindings ── */
function bindEvents() {
  byId('board').addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest('.sudoku-cell') as HTMLElement | null;
    if (!cell) { return; }
    // Dismiss hint if user clicks elsewhere
    if (activeHint) { dismissHint(); }
    const r = +cell.dataset.row!;
    const c = +cell.dataset.col!;
    selCell = { row: r, col: c };
    post('selectCell', r, c);
    renderBoard();
  });

  document.querySelectorAll('.sudoku-num').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (activeHint) { dismissHint(); }
      post('input', +(btn as HTMLElement).dataset.num!);
    });
  });

  byId('btn-menu').addEventListener('click', () => post('menu'));
  byId('btn-undo').addEventListener('click', () => post('undo'));
  byId('btn-redo').addEventListener('click', () => post('redo'));
  byId('btn-erase').addEventListener('click', () => { if (activeHint) { dismissHint(); } post('erase'); });
  byId('btn-notes').addEventListener('click', () => post('toggleNotes'));
  byId('btn-hint').addEventListener('click', () => post('hint'));
  byId('btn-pause').addEventListener('click', () => post('pause'));

  byId('m-new').addEventListener('click', () => post('newGame'));
  byId('m-cont').addEventListener('click', () => post('continueGame'));
  byId('m-daily').addEventListener('click', () => post('dailyChallenge'));
  byId('m-stats').addEventListener('click', () => post('statistics'));

  // Hint banner buttons
  byId('hint-apply').addEventListener('click', () => {
    if (!activeHint) { return; }
    const { row, col, value } = activeHint;
    post('applyHint', { row, col, value });
    clearHint();
  });
  byId('hint-dismiss').addEventListener('click', () => dismissHint());

  document.addEventListener('keydown', onKey);

  window.addEventListener('message', (ev) => {
    const msg = ev.data;
    if (msg.type === 'gameState') {
      const prevBoard = game ? game.board : null;
      game = msg.payload as GameStateData;
      if (game.selectedCell) { selCell = game.selectedCell; }
      showGame();
      render();
      if (prevBoard) { checkCompletions(prevBoard, game.board); }
    } else if (msg.type === 'welcome') {
      showMenu();
    } else if (msg.type === 'statistics') {
      showStats(msg.payload);
    } else if (msg.type === 'hint') {
      showHint(msg.payload as HintInfo);
    } else if (msg.type === 'hintLimitReached') {
      showHintLimitReached();
    }
  });
}

/* ── Hint logic ── */
function showHint(h: HintInfo) {
  activeHint = h;
  const banner = byId('hint-banner');
  const text = byId('hint-text');
  text.innerHTML = `<strong>Hint</strong> (${h.hintsRemaining} left): ${h.explanation}`;
  banner.classList.remove('hidden');
  // Highlight the hinted cell
  renderBoard();
}

function dismissHint() {
  activeHint = null;
  byId('hint-banner').classList.add('hidden');
  renderBoard();
}

function clearHint() {
  activeHint = null;
  byId('hint-banner').classList.add('hidden');
}

function showHintLimitReached() {
  const banner = byId('hint-banner');
  byId('hint-text').innerHTML = `<strong>No hints remaining!</strong> You've used all 3 hints for this game.`;
  banner.classList.remove('hidden');
  // Auto-dismiss after 3 seconds
  setTimeout(() => { banner.classList.add('hidden'); }, 3000);
}

/* ── Completion animations ── */
function checkCompletions(prev: CellData[][], curr: CellData[][]) {
  // Find which cells changed from empty to filled
  const changedCells: { r: number; c: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (prev[r][c].value === 0 && curr[r][c].value !== 0) {
        changedCells.push({ r, c });
      }
    }
  }
  if (changedCells.length === 0) { return; }

  // Animate each changed cell
  for (const { r, c } of changedCells) {
    const cell = getCell(r, c);
    if (cell) {
      cell.classList.add('cell-fill-anim');
      setTimeout(() => cell.classList.remove('cell-fill-anim'), 400);
    }
  }

  // Check if any row, column, or box was just completed
  for (const { r, c } of changedCells) {
    // Check row r
    if (isRowComplete(curr, r)) { animateRow(r); }
    // Check col c
    if (isColComplete(curr, c)) { animateCol(c); }
    // Check box
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    if (isBoxComplete(curr, br, bc)) { animateBox(br, bc); }
  }
}

function isRowComplete(board: CellData[][], r: number): boolean {
  for (let c = 0; c < 9; c++) { if (board[r][c].value === 0) { return false; } }
  return true;
}
function isColComplete(board: CellData[][], c: number): boolean {
  for (let r = 0; r < 9; r++) { if (board[r][c].value === 0) { return false; } }
  return true;
}
function isBoxComplete(board: CellData[][], br: number, bc: number): boolean {
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c].value === 0) { return false; }
    }
  }
  return true;
}

function animateRow(r: number) {
  for (let c = 0; c < 9; c++) {
    const cell = getCell(r, c);
    if (cell) {
      cell.classList.add('line-complete-anim');
      setTimeout(() => cell.classList.remove('line-complete-anim'), 1200);
    }
  }
}
function animateCol(c: number) {
  for (let r = 0; r < 9; r++) {
    const cell = getCell(r, c);
    if (cell) {
      cell.classList.add('line-complete-anim');
      setTimeout(() => cell.classList.remove('line-complete-anim'), 1200);
    }
  }
}
function animateBox(br: number, bc: number) {
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      const cell = getCell(r, c);
      if (cell) {
        cell.classList.add('line-complete-anim');
        setTimeout(() => cell.classList.remove('line-complete-anim'), 1800);
      }
    }
  }
}

/* ── Board celebration animation ── */
function startCelebration(type: 'won' | 'lost') {
  const board = byId('board');
  const cells = board.querySelectorAll('.sudoku-cell');
  const glow = type === 'won' ? 'rgba(78,201,176,0.5)' : 'rgba(244,135,113,0.4)';
  cells.forEach((cell, i) => {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const delay = (row + col) * 0.04 + Math.random() * 0.1;
    (cell as HTMLElement).style.setProperty('--cell-delay', `${delay}s`);
    (cell as HTMLElement).style.setProperty('--celebrate-glow', glow);
    cell.classList.add('cell-celebrate');
  });
}

function stopCelebration() {
  const board = byId('board');
  board.querySelectorAll('.sudoku-cell').forEach((cell) => {
    cell.classList.remove('cell-celebrate');
    (cell as HTMLElement).style.removeProperty('--cell-delay');
    (cell as HTMLElement).style.removeProperty('--celebrate-glow');
  });
}

function getCell(r: number, c: number): HTMLElement | null {
  return document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
}

/* ── Keyboard ── */
function onKey(e: KeyboardEvent) {
  if (!game) { return; }
  const k = e.key;

  if (/^[1-9]$/.test(k)) {
    e.preventDefault();
    if (activeHint) { dismissHint(); }
    post('input', +k);
    return;
  }

  const ck: Record<string, number> = { a:1, z:2, e:3, q:4, s:5, d:6, w:7, x:8, c:9 };
  const lower = k.toLowerCase();
  if (ck[lower]) { e.preventDefault(); if (activeHint) { dismissHint(); } post('input', ck[lower]); return; }

  if (selCell) {
    const { row: r, col: c } = selCell;
    let moved = false;
    if ((k === 'ArrowUp'    || k === 'w') && r > 0) { selCell = { row: r-1, col: c }; moved = true; }
    if ((k === 'ArrowDown'  || k === 's') && r < 8) { selCell = { row: r+1, col: c }; moved = true; }
    if ((k === 'ArrowLeft'  || k === 'a') && c > 0) { selCell = { row: r, col: c-1 }; moved = true; }
    if ((k === 'ArrowRight' || k === 'd') && c < 8) { selCell = { row: r, col: c+1 }; moved = true; }
    if (moved) {
      e.preventDefault();
      if (activeHint) { dismissHint(); }
      post('selectCell', selCell.row, selCell.col);
      renderBoard();
    }
  }

  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); if (activeHint) { dismissHint(); } post('erase'); }
  if (k === 'n' || k === 'N') { post('toggleNotes'); }
  if (e.ctrlKey && k === 'z') { e.preventDefault(); post('undo'); }
  if (e.ctrlKey && k === 'y') { e.preventDefault(); post('redo'); }
  if (k === 'h' || k === 'H') { post('hint'); }
  if (k === 'p' || k === 'P' || k === 'Escape') { post('pause'); }
  if (k === 'm' || k === 'M') { post('menu'); }
  // Enter to apply hint
  if (k === 'Enter' && activeHint) {
    e.preventDefault();
    const { row, col, value } = activeHint;
    post('applyHint', { row, col, value });
    clearHint();
  }
}

/* ── Post to extension host ── */
function post(type: string, ...args: unknown[]) {
  vscode.postMessage({ type, payload: args });
}

/* ── View switching ── */
function showMenu() {
  byId('menu').classList.remove('hidden');
  byId('board').classList.add('hidden');
  byId('toolbar').classList.add('hidden');
  byId('numpad').classList.add('hidden');
  byId('bar').classList.add('hidden');
  byId('hint-banner').classList.add('hidden');
  byId('overlay').classList.add('hidden');
  stopCelebration();
  game = null;
  selCell = null;
  activeHint = null;
}

function showGame() {
  byId('menu').classList.add('hidden');
  byId('board').classList.remove('hidden');
  byId('toolbar').classList.remove('hidden');
  byId('numpad').classList.remove('hidden');
  byId('bar').classList.remove('hidden');
}

/* ── Count placed numbers ── */
function countPlaced(): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (!game) { return counts; }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = game.board[r][c].value;
      if (v >= 1 && v <= 9) { counts[v]++; }
    }
  }
  return counts;
}

/* ── Render ── */
function render() {
  if (!game) { return; }
  renderBoard();
  renderBar();
  renderToolbar();
  renderNumpad();
  renderOverlay();
}

function renderBoard() {
  if (!game) { return; }
  const cells = document.querySelectorAll('.sudoku-cell');
  cells.forEach((cell) => {
    const r = +(cell as HTMLElement).dataset.row!;
    const c = +(cell as HTMLElement).dataset.col!;
    const d = game!.board[r][c];
    const valEl = cell.querySelector('.cell-value') as HTMLElement;
    const notesEl = cell.querySelector('.cell-notes') as HTMLElement;

cell.classList.remove('given', 'user', 'error', 'selected', 'highlighted', 'same-number', 'hint-highlight');

    if (d.value !== 0) {
      valEl.textContent = String(d.value);
      valEl.style.display = 'block';
      notesEl.style.display = 'none';
    } else {
      valEl.textContent = '';
      valEl.style.display = 'none';
      notesEl.style.display = 'grid';
    }

    cell.classList.add(d.isGiven ? 'given' : 'user');
    if (d.isError) { cell.classList.add('error'); }

    const noteSet = new Set(d.notes);
    notesEl.querySelectorAll('.note-digit').forEach((nd) => {
      const el = nd as HTMLElement;
      const n = +el.dataset.note!;
      if (noteSet.has(n)) {
        el.classList.add('active');
        el.style.visibility = 'visible';
      } else {
        el.classList.remove('active');
        el.style.visibility = 'hidden';
      }
    });

    // Hint highlight
    if (activeHint && activeHint.row === r && activeHint.col === c) {
      cell.classList.add('hint-highlight');
    }

    if (selCell && selCell.row === r && selCell.col === c) {
      cell.classList.add('selected');
    }

    if (selCell) {
      const sr = selCell.row, sc = selCell.col;
      if (sr === r || sc === c || (Math.floor(sr/3) === Math.floor(r/3) && Math.floor(sc/3) === Math.floor(c/3))) {
        cell.classList.add('highlighted');
      }
      const selVal = game!.board[sr][sc].value;
      if (selVal !== 0 && d.value === selVal) {
        cell.classList.add('same-number');
      }
    }
  });
}

function renderBar() {
  if (!game) { return; }
  byId('diff').textContent = game.difficulty;
  byId('mistakes').textContent = `${game.mistakes}/${game.maxMistakes}`;
  byId('timer').textContent = fmt(game.time);
}

function renderToolbar() {
  if (!game) { return; }
  byId('btn-notes').classList.toggle('active', game.notesMode);
  byId('btn-undo').classList.toggle('disabled', !game.canUndo);
  byId('btn-redo').classList.toggle('disabled', !game.canRedo);
  byId('btn-pause').querySelector('.tbtn-icon')!.textContent = game.status === 'paused' ? '▶' : '⏸';
  // Hint button: show remaining count and disable when exhausted
  const hintBtn = byId('btn-hint');
  const hintsLeft = game.maxHints - game.hintsUsed;
  hintBtn.classList.toggle('disabled', hintsLeft <= 0);
  hintBtn.querySelector('.tbtn-icon')!.textContent = hintsLeft > 0 ? '💡' : '🚫';
}

function renderNumpad() {
  if (!game) { return; }
  const placed = countPlaced();
  const notesMode = game.notesMode;
  document.querySelectorAll('.sudoku-num').forEach((btn) => {
    const n = +(btn as HTMLElement).dataset.num!;
    const count = placed[n];
    btn.textContent = count >= 9 ? '·' : String(n);
    (btn as HTMLButtonElement).disabled = (count >= 9 && !notesMode);
    btn.classList.toggle('num-complete', count >= 9 && !notesMode);
  });
}

function renderOverlay() {
  if (!game) { return; }
  const ov = byId('overlay');
  ov.className = 'sudoku-overlay';
  if (game.status === 'won') {
    ov.classList.add('won');
    ov.innerHTML = `<div class="overlay-box"><div class="overlay-title">You Won!</div><div class="overlay-sub">Time: ${fmt(game.time)}</div><div class="overlay-buttons"><button class="sudoku-mbtn" id="ov-new">New Game</button><button class="sudoku-mbtn" id="ov-menu">Return to Menu</button></div></div>`;
    ov.classList.remove('hidden');
    byId('ov-new').addEventListener('click', () => post('newGame'));
    byId('ov-menu').addEventListener('click', () => post('menu'));
    startCelebration('won');
  } else if (game.status === 'lost') {
    ov.classList.add('lost');
    ov.innerHTML = `<div class="overlay-box"><div class="overlay-title">Game Over</div><div class="overlay-sub">Time: ${fmt(game.time)} — Too many mistakes</div><div class="overlay-buttons"><button class="sudoku-mbtn" id="ov-new">Try Again</button><button class="sudoku-mbtn" id="ov-menu">Return to Menu</button></div></div>`;
    ov.classList.remove('hidden');
    byId('ov-new').addEventListener('click', () => post('newGame'));
    byId('ov-menu').addEventListener('click', () => post('menu'));
    startCelebration('lost');
  } else if (game.status === 'paused') {
    ov.innerHTML = `<div class="overlay-box"><div class="overlay-title">Paused</div><button class="sudoku-mbtn" id="ov-resume">Resume</button></div>`;
    ov.classList.remove('hidden');
    byId('ov-resume').addEventListener('click', () => post('pause'));
  } else {
    ov.classList.add('hidden');
    stopCelebration();
  }
}

/* ── Stats overlay ── */
function showStats(s: {
  gamesPlayed: number; gamesWon: number; gamesLost: number;
  currentStreak: number; bestStreak: number;
  dailyChallengesCompleted: number; dailyStreak: number;
  byDifficulty: Record<string, { played: number; won: number; bestTime: number; averageTime: number }>;
}) {
  const ov = byId('overlay');
  const diffs = ['easy', 'medium', 'hard', 'expert', 'extreme'];
  const diffLabels: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert', extreme: 'Extreme' };
  const diffColors: Record<string, string> = { easy: '#4ec9b0', medium: '#dcdcaa', hard: '#ce9178', expert: '#f48771', extreme: '#c586c0' };

  const totalWinRate = s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;

  let diffRows = '';
  for (const d of diffs) {
    const dd = s.byDifficulty[d];
    const wr = dd.played > 0 ? Math.round((dd.won / dd.played) * 100) : 0;
    const best = dd.bestTime > 0 ? fmt(dd.bestTime) : '—';
    const avg = dd.averageTime > 0 ? fmt(Math.round(dd.averageTime)) : '—';
    const color = diffColors[d];
    diffRows += `
      <tr class="stats-diff-row">
        <td class="stats-diff-name" style="color:${color}">${diffLabels[d]}</td>
        <td class="stats-num">${dd.played}</td>
        <td class="stats-num">${dd.won}</td>
        <td class="stats-num stats-wr">${wr}%</td>
        <td class="stats-num">${best}</td>
        <td class="stats-num">${avg}</td>
      </tr>`;
  }

  ov.innerHTML = `<div class="overlay-box stats-overlay">
    <div class="overlay-title">Statistics</div>
    <div class="stats-summary">
      <div class="stat-card"><span class="stat-card-val">${s.gamesPlayed}</span><span class="stat-card-lbl">Played</span></div>
      <div class="stat-card"><span class="stat-card-val stat-card-green">${s.gamesWon}</span><span class="stat-card-lbl">Won</span></div>
      <div class="stat-card"><span class="stat-card-val stat-card-red">${s.gamesLost}</span><span class="stat-card-lbl">Lost</span></div>
      <div class="stat-card"><span class="stat-card-val stat-card-blue">${totalWinRate}%</span><span class="stat-card-lbl">Win Rate</span></div>
      <div class="stat-card"><span class="stat-card-val">${s.currentStreak}</span><span class="stat-card-lbl">Streak</span></div>
      <div class="stat-card"><span class="stat-card-val">${s.bestStreak}</span><span class="stat-card-lbl">Best</span></div>
      <div class="stat-card"><span class="stat-card-val">${s.dailyChallengesCompleted}</span><span class="stat-card-lbl">Daily</span></div>
      <div class="stat-card"><span class="stat-card-val">${s.dailyStreak}</span><span class="stat-card-lbl">Daily Streak</span></div>
    </div>
    <table class="stats-table">
      <thead><tr>
        <th class="stats-th">Difficulty</th><th class="stats-th">Played</th>
        <th class="stats-th">Won</th><th class="stats-th">Win %</th>
        <th class="stats-th">Best</th><th class="stats-th">Average</th>
      </tr></thead>
      <tbody>${diffRows}</tbody>
    </table>
    <button class="sudoku-mbtn" id="stats-close">Close</button>
  </div>`;
  ov.classList.remove('hidden');
  byId('stats-close').addEventListener('click', () => ov.classList.add('hidden'));
}

/* ── Helpers ── */
function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function byId(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function fmt(s: number): string {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

/* ── Go ── */
init();
