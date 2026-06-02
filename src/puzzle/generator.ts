import { Board, CellValue, Difficulty, PuzzleData } from './types';

function createEmptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(0) as CellValue[]);
}

function isValid(board: Board, row: number, col: number, num: CellValue): boolean {
  for (let c = 0; c < 9; c++) {
    if (board[row][c] === num) {return false;}
  }
  for (let r = 0; r < 9; r++) {
    if (board[r][col] === num) {return false;}
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === num) {return false;}
    }
  }
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function solveSudoku(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9] as CellValue[]);
        for (const num of nums) {
          if (isValid(board, r, c, num)) {
            board[r][c] = num;
            if (solveSudoku(board)) {return true;}
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSolvedBoard(): Board {
  const board = createEmptyBoard();
  solveSudoku(board);
  return board;
}

function countSolutions(board: Board, limit: number = 2): number {
  let count = 0;

  function solve(): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, r, c, num as CellValue)) {
              board[r][c] = num as CellValue;
              if (solve()) {return true;}
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    count++;
    return count >= limit;
  }

  solve();
  return count;
}

function hasUniqueSolution(board: Board): boolean {
  const copy = board.map(r => [...r]);
  return countSolutions(copy, 2) === 1;
}

interface DifficultyConfig {
  minGivens: number;
  maxGivens: number;
  maxAttempts: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy:   { minGivens: 40, maxGivens: 50, maxAttempts: 100 },
  medium: { minGivens: 32, maxGivens: 39, maxAttempts: 100 },
  hard:   { minGivens: 26, maxGivens: 31, maxAttempts: 150 },
  expert: { minGivens: 22, maxGivens: 26, maxAttempts: 200 },
  extreme:{ minGivens: 17, maxGivens: 23, maxAttempts: 300 },
};

export function generatePuzzle(difficulty: Difficulty): PuzzleData {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const solution = generateSolvedBoard();
  const puzzle = solution.map(r => [...r]);

  // Create list of all positions and shuffle
  const positions: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions);

  // Target number of givens
  const targetGivens = Math.floor(
    config.minGivens + Math.random() * (config.maxGivens - config.minGivens + 1)
  );

  // Remove cells while maintaining unique solution
  let currentGivens = 81;
  for (const [r, c] of shuffledPositions) {
    if (currentGivens <= targetGivens) {break;}

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (hasUniqueSolution(puzzle)) {
      currentGivens--;
    } else {
      puzzle[r][c] = backup;
    }
  }

  return {
    puzzle,
    solution,
    difficulty,
    givens: currentGivens,
  };
}

export function generateDailyChallenge(date: Date): PuzzleData {
  // Seed-based generation using date
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const seed = hashString(dateStr);

  // Use seed to generate a deterministic puzzle
  const savedRng = Math.random;
  let s = seed;
  Math.random = () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };

  // Pick difficulty based on day of week
  const dayOfWeek = date.getDay();
  const difficulties: Difficulty[] = ['easy', 'medium', 'medium', 'hard', 'hard', 'expert', 'extreme'];
  const difficulty = difficulties[dayOfWeek];

  const result = generatePuzzle(difficulty);

  // Restore
  Math.random = savedRng;

  return result;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}
