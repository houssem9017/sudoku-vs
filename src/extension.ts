import * as vscode from 'vscode';
import { SudokuViewProvider } from './webview/provider';
import { generatePuzzle, generateDailyChallenge } from './puzzle/generator';
import { findHint } from './puzzle/solver';
import { createGameState, applyMove, undo, redo, eraseCell, applyHint, togglePause, getBoardValues } from './game/state';
import { getKeyMap, mapKeyToNumber } from './game/keymap';
import { loadStatistics, saveStatistics, recordGameEnd } from './game/statistics';
import { GameState } from './game/types';
import { Board, CellValue, Difficulty } from './puzzle/types';

let provider: SudokuViewProvider;
let currentGame: GameState | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  provider = new SudokuViewProvider(context.extensionUri);

  // Set up the message handler BEFORE registering the provider
  provider.setMessageHandler((message) => handleWebviewMessage(context, message));

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SudokuViewProvider.viewId, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'sudoku-vs.newGame';
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand('sudoku-vs.newGame', () => handleNewGame(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('sudoku-vs.continueGame', () => handleContinueGame(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('sudoku-vs.dailyChallenge', () => handleDailyChallenge(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('sudoku-vs.statistics', () => handleStatistics(context))
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('sudoku-vs.settings', () => handleSettings())
  );

  // Always show the menu on load; don't auto-restore a saved game
  provider.showWelcome();

  updateStatusBar();
}

// ─── Webview message handler (direct, no command indirection) ───

function handleWebviewMessage(context: vscode.ExtensionContext, message: { type: string; payload?: unknown }) {
  switch (message.type) {
    case 'ready':
      // Webview loaded — if we have a game, send it
      if (currentGame) {
        provider.updateGameState(currentGame);
      }
      break;
    case 'newGame':
      handleNewGame(context);
      break;
    case 'continueGame':
      handleContinueGame(context);
      break;
    case 'dailyChallenge':
      handleDailyChallenge(context);
      break;
    case 'statistics':
      handleStatistics(context);
      break;
    case 'settings':
      handleSettings();
      break;
    case 'menu':
      // User wants to go back to the main menu — pause the game
      if (currentGame && currentGame.status === 'playing') {
        currentGame = togglePause(currentGame);
        stopTimer();
        saveGame(context);
      }
      provider.showWelcome();
      break;
    default:
      handleGameAction(context, message.type, message.payload);
      break;
  }
}

function handleGameAction(context: vscode.ExtensionContext, action: string, payload: unknown) {
  if (!currentGame) { return; }

  const config = vscode.workspace.getConfiguration('sudoku-vs');
  const inputProfile = config.get<string>('inputProfile', 'default');
  const customMap = config.get<Record<string, string>>('customKeyMap');
  const keymap = getKeyMap(inputProfile, customMap);

  const args = (payload as unknown[]) ?? [];

  switch (action) {
    case 'selectCell': {
      const [row, col] = args as [number, number];
      currentGame = { ...currentGame, selectedCell: { row, col } };
      provider.updateGameState(currentGame);
      break;
    }
    case 'input': {
      const [raw] = args;
      if (!currentGame.selectedCell) { return; }
      // Numpad sends a number directly; keyboard sends a key string
      let num: number | null;
      if (typeof raw === 'number') {
        num = (raw >= 1 && raw <= 9) ? raw : null;
      } else {
        num = mapKeyToNumber(String(raw), keymap);
      }
      if (num === null) { return; }
      const { row, col } = currentGame.selectedCell;
      if (currentGame.board[row][col].isGiven) { return; }
      currentGame = applyMove(currentGame, row, col, num as CellValue, currentGame.notesMode);
      provider.updateGameState(currentGame);
      saveGame(context);
      updateStatusBar();
      if (currentGame.status === 'won' || currentGame.status === 'lost') {
        stopTimer();
        handleGameEnd(context);
      }
      break;
    }
    case 'erase': {
      if (!currentGame.selectedCell) { return; }
      const { row, col } = currentGame.selectedCell;
      currentGame = eraseCell(currentGame, row, col);
      provider.updateGameState(currentGame);
      saveGame(context);
      break;
    }
    case 'toggleNotes': {
      currentGame = { ...currentGame, notesMode: !currentGame.notesMode };
      provider.updateGameState(currentGame);
      break;
    }
    case 'undo': {
      currentGame = undo(currentGame);
      provider.updateGameState(currentGame);
      saveGame(context);
      break;
    }
    case 'redo': {
      currentGame = redo(currentGame);
      provider.updateGameState(currentGame);
      saveGame(context);
      break;
    }
    case 'hint': {
      // Check hint limit
      if (currentGame.hintsUsed >= currentGame.maxHints) {
        provider.postMessage({ type: 'hintLimitReached' });
        break;
      }
      const boardValues = getBoardValues(currentGame.board);
      const hint = findHint(boardValues, currentGame.solution);
      if (hint) {
        // Increment hint counter
        currentGame = { ...currentGame, hintsUsed: currentGame.hintsUsed + 1 };
        // Send hint info to webview — it will highlight the cell and show explanation
        provider.postMessage({
          type: 'hint',
          payload: {
            row: hint.cell.row,
            col: hint.cell.col,
            value: hint.value,
            explanation: hint.explanation,
            hintsRemaining: currentGame.maxHints - currentGame.hintsUsed,
          },
        });
        // Select the hinted cell
        currentGame = { ...currentGame, selectedCell: { row: hint.cell.row, col: hint.cell.col } };
        provider.updateGameState(currentGame);
        saveGame(context);
      }
      break;
    }
    case 'applyHint': {
      // User confirmed they want to fill the hinted cell
      const { row, col, value } = (payload as { row: number; col: number; value: number });
      currentGame = applyHint(currentGame, row, col, value as CellValue);
      provider.updateGameState(currentGame);
      saveGame(context);
      if (currentGame.status === 'won') {
        stopTimer();
        handleGameEnd(context);
      }
      break;
    }
    case 'pause': {
      currentGame = togglePause(currentGame);
      provider.updateGameState(currentGame);
      if (currentGame.status === 'paused') { stopTimer(); } else { startTimer(); }
      break;
    }
  }
}

// ─── Command handlers ───

function handleNewGame(context: vscode.ExtensionContext) {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'extreme'];
  const labels = ['Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];

  vscode.window.showQuickPick(
    difficulties.map((d, i) => ({ label: labels[i], difficulty: d })),
    { placeHolder: 'Select difficulty' }
  ).then((selection) => {
    if (!selection) { return; }
    const config = vscode.workspace.getConfiguration('sudoku-vs');
    const maxMistakes = config.get<number>('maxMistakes', 3);
    const puzzleData = generatePuzzle(selection.difficulty);
    currentGame = createGameState(puzzleData.puzzle, puzzleData.solution, puzzleData.difficulty, maxMistakes);
    provider.updateGameState(currentGame);
    saveGame(context);
    startTimer();
    updateStatusBar();
  });
}

function handleContinueGame(context: vscode.ExtensionContext) {
  const savedGame = context.globalState.get<SerializedGameState>('sudoku-vs.currentGame');
  if (savedGame) {
    currentGame = deserializeGameState(savedGame);
    if (currentGame) {
      provider.updateGameState(currentGame);
      if (currentGame.status === 'playing') { startTimer(); }
      updateStatusBar();
    }
  } else {
    vscode.window.showInformationMessage('No saved game found. Start a new game!');
    handleNewGame(context);
  }
}

function handleDailyChallenge(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('sudoku-vs');
  const maxMistakes = config.get<number>('maxMistakes', 3);
  const puzzleData = generateDailyChallenge(new Date());
  currentGame = createGameState(puzzleData.puzzle, puzzleData.solution, puzzleData.difficulty, maxMistakes);
  provider.updateGameState(currentGame);
  saveGame(context);
  startTimer();
  updateStatusBar();
}

function handleStatistics(context: vscode.ExtensionContext) {
  const stats = loadStatistics(context);
  provider.showStatistics(stats);
}

function handleSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'sudoku-vs');
}

function handleGameEnd(context: vscode.ExtensionContext) {
  if (!currentGame) { return; }
  const stats = loadStatistics(context);
  const result = recordGameEnd(stats, currentGame);
  saveStatistics(context, result.stats);
  if (currentGame.status === 'won') {
    vscode.window.showInformationMessage(`Congratulations! You won in ${formatTime(currentGame.time)}!`);
  } else {
    vscode.window.showInformationMessage('Game over! Too many mistakes.');
  }
  updateStatusBar();
}

// ─── Helpers ───

function saveGame(context: vscode.ExtensionContext) {
  if (!currentGame) { return; }
  context.globalState.update('sudoku-vs.currentGame', serializeGameState(currentGame));
}

function startTimer() {
  stopTimer();
  // Send an immediate tick so the webview gets the first second right away
  if (currentGame && currentGame.status === 'playing') {
    currentGame = { ...currentGame, time: currentGame.time + 1 };
    provider.updateGameState(currentGame);
    updateStatusBar();
  }
  timerInterval = setInterval(() => {
    if (currentGame && currentGame.status === 'playing') {
      currentGame = { ...currentGame, time: currentGame.time + 1 };
      provider.updateGameState(currentGame);
      updateStatusBar();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function updateStatusBar() {
  if (currentGame && (currentGame.status === 'playing' || currentGame.status === 'paused')) {
    statusBarItem.text = `Sudoku ${formatTime(currentGame.time)}`;
    statusBarItem.tooltip = `Sudoku VS - ${currentGame.difficulty} - Mistakes: ${currentGame.mistakes}/${currentGame.maxMistakes}`;
  } else {
    statusBarItem.text = 'Sudoku';
    statusBarItem.tooltip = 'Click to start a new game';
  }
  statusBarItem.show();
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Serialization ───

interface SerializedCell { value: number; notes: number[]; isGiven: boolean; isError: boolean }
interface SerializedGameState {
  board: SerializedCell[][]; puzzle: number[][]; solution: number[][];
  difficulty: Difficulty; status: string; mistakes: number; maxMistakes: number;
  time: number; hintsUsed: number; maxHints: number;
  selectedCell: { row: number; col: number } | null;
  notesMode: boolean; historyIndex: number;
}

function serializeGameState(state: GameState): SerializedGameState {
  return {
    board: state.board.map(row => row.map(cell => ({
      value: cell.value, notes: Array.from(cell.notes), isGiven: cell.isGiven, isError: cell.isError,
    }))),
    puzzle: state.puzzle, solution: state.solution, difficulty: state.difficulty,
    status: state.status, mistakes: state.mistakes, maxMistakes: state.maxMistakes,
    time: state.time, hintsUsed: state.hintsUsed, maxHints: state.maxHints, selectedCell: state.selectedCell,
    notesMode: state.notesMode, historyIndex: state.historyIndex,
  };
}

function deserializeGameState(data: SerializedGameState): GameState {
  return {
    board: data.board.map(row => row.map(cell => ({
      value: cell.value as CellValue, notes: new Set(cell.notes),
      isGiven: cell.isGiven, isError: cell.isError,
    }))),
    puzzle: data.puzzle as unknown as Board,
    solution: data.solution as unknown as Board,
    difficulty: data.difficulty, status: data.status as GameState['status'],
    mistakes: data.mistakes, maxMistakes: data.maxMistakes, time: data.time,
    hintsUsed: data.hintsUsed, maxHints: data.maxHints, selectedCell: data.selectedCell,
    notesMode: data.notesMode, history: [], historyIndex: data.historyIndex,
    startTime: Date.now(), pausedAt: null,
  };
}

export function deactivate() { stopTimer(); }
