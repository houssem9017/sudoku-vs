import { Board, CellValue, Difficulty } from '../puzzle/types';
import { GameBoard, GameMove, GameState, CellState } from './types';

export function createGameBoard(puzzle: Board): GameBoard {
  const board: GameBoard = [];
  for (let r = 0; r < 9; r++) {
    board[r] = [];
    for (let c = 0; c < 9; c++) {
      board[r][c] = {
        value: puzzle[r][c],
        notes: new Set<number>(),
        isGiven: puzzle[r][c] !== 0,
        isError: false,
      };
    }
  }
  return board;
}

export function createGameState(
  puzzle: Board,
  solution: Board,
  difficulty: Difficulty,
  maxMistakes: number
): GameState {
  return {
    board: createGameBoard(puzzle),
    puzzle,
    solution,
    difficulty,
    status: 'playing',
    mistakes: 0,
    maxMistakes,
    time: 0,
    hintsUsed: 0,
    maxHints: 3,
    selectedCell: null,
    notesMode: false,
    history: [],
    historyIndex: -1,
    startTime: Date.now(),
    pausedAt: null,
  };
}

export function cloneBoard(board: GameBoard): GameBoard {
  return board.map(row =>
    row.map(cell => ({
      ...cell,
      notes: new Set(cell.notes),
    }))
  );
}

export function applyMove(state: GameState, row: number, col: number, value: CellValue, isNote: boolean): GameState {
  if (state.status !== 'playing') {return state;}
  if (state.board[row][col].isGiven) {return state;}

  const cell = state.board[row][col];
  const previousValue = cell.value;
  const previousNotes = new Set(cell.notes);

  let newBoard = cloneBoard(state.board);
  let mistakes = state.mistakes;

  if (isNote) {
    if (value === 0) {
      // Clear all notes
      newBoard[row][col].notes = new Set();
    } else {
      if (newBoard[row][col].notes.has(value)) {
        newBoard[row][col].notes.delete(value);
      } else {
        newBoard[row][col].notes.add(value);
      }
    }
    newBoard[row][col].value = 0;
  } else {
    newBoard[row][col].value = value;
    newBoard[row][col].notes = new Set();

    // Check if correct
    if (value !== 0 && value !== state.solution[row][col]) {
      newBoard[row][col].isError = true;
      mistakes++;
    } else {
      newBoard[row][col].isError = false;
    }

    // Remove this value from notes in same row, col, box
    if (value !== 0 && value === state.solution[row][col]) {
      for (let c = 0; c < 9; c++) {
        newBoard[row][c].notes.delete(value);
      }
      for (let r = 0; r < 9; r++) {
        newBoard[r][col].notes.delete(value);
      }
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          newBoard[r][c].notes.delete(value);
        }
      }
    }
  }

  const move: GameMove = {
    row,
    col,
    previousValue,
    newValue: value,
    previousNotes,
    newNotes: new Set(newBoard[row][col].notes),
    wasNote: isNote,
  };

  // Truncate future history
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(move);

  // Check win/loss
  let status: GameState['status'] = state.status;
  if (mistakes >= state.maxMistakes && state.maxMistakes > 0) {
    status = 'lost';
  } else if (checkWin(newBoard, state.solution)) {
    status = 'won';
  }

  return {
    ...state,
    board: newBoard,
    mistakes,
    status,
    history,
    historyIndex: history.length - 1,
  };
}

function checkWin(board: GameBoard, solution: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c].value !== solution[r][c]) {return false;}
    }
  }
  return true;
}

export function undo(state: GameState): GameState {
  if (state.historyIndex < 0) {return state;}

  const move = state.history[state.historyIndex];
  const newBoard = cloneBoard(state.board);

  newBoard[move.row][move.col].value = move.previousValue;
  newBoard[move.row][move.col].notes = new Set(move.previousNotes);

  return {
    ...state,
    board: newBoard,
    historyIndex: state.historyIndex - 1,
  };
}

export function redo(state: GameState): GameState {
  if (state.historyIndex >= state.history.length - 1) {return state;}

  const move = state.history[state.historyIndex + 1];
  const newBoard = cloneBoard(state.board);

  newBoard[move.row][move.col].value = move.newValue;
  newBoard[move.row][move.col].notes = new Set(move.newNotes);

  return {
    ...state,
    board: newBoard,
    historyIndex: state.historyIndex + 1,
  };
}

export function eraseCell(state: GameState, row: number, col: number): GameState {
  if (state.status !== 'playing') {return state;}
  if (state.board[row][col].isGiven) {return state;}

  const cell = state.board[row][col];
  if (cell.value === 0 && cell.notes.size === 0) {return state;}

  return applyMove(state, row, col, 0, false);
}

export function applyHint(state: GameState, row: number, col: number, value: CellValue): GameState {
  if (state.status !== 'playing') {return state;}

  const newBoard = cloneBoard(state.board);
  newBoard[row][col].value = value;
  newBoard[row][col].notes = new Set();
  newBoard[row][col].isError = false;

  // Remove notes
  for (let c = 0; c < 9; c++) {
    newBoard[row][c].notes.delete(value);
  }
  for (let r = 0; r < 9; r++) {
    newBoard[r][col].notes.delete(value);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      newBoard[r][c].notes.delete(value);
    }
  }

  let status: GameState['status'] = state.status;
  if (checkWin(newBoard, state.solution)) {
    status = 'won';
  }

  return {
    ...state,
    board: newBoard,
    hintsUsed: state.hintsUsed + 1,
    status,
  };
}

export function togglePause(state: GameState): GameState {
  if (state.status === 'playing') {
    return { ...state, status: 'paused', pausedAt: Date.now() };
  } else if (state.status === 'paused') {
    return { ...state, status: 'playing', pausedAt: null };
  }
  return state;
}

export function getBoardValues(board: GameBoard): Board {
  return board.map(row => row.map(cell => cell.value));
}
