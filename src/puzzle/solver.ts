import { Board, CellValue, CellPosition } from './types';

export function getCandidates(board: Board, row: number, col: number): Set<number> {
  const candidates = new Set<number>([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  if (board[row][col] !== 0) {return new Set();}

  for (let c = 0; c < 9; c++) {
    candidates.delete(board[row][c]);
  }
  for (let r = 0; r < 9; r++) {
    candidates.delete(board[r][col]);
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      candidates.delete(board[r][c]);
    }
  }

  return candidates;
}

export function getAllCandidates(board: Board): Set<number>[][] {
  const result: Set<number>[][] = [];
  for (let r = 0; r < 9; r++) {
    result[r] = [];
    for (let c = 0; c < 9; c++) {
      result[r][c] = getCandidates(board, r, c);
    }
  }
  return result;
}

export interface HintResult {
  cell: CellPosition;
  value: number;
  explanation: string;
}

export function findHint(board: Board, solution: Board): HintResult | null {
  // First try naked singles
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        if (candidates.size === 1) {
          const value = [...candidates][0];
          return {
            cell: { row: r, col: c },
            value,
            explanation: `Row ${r + 1}, Column ${c + 1} has only one possible value: ${value}.`,
          };
        }
      }
    }
  }

  // Try hidden singles in rows
  for (let r = 0; r < 9; r++) {
    for (let num = 1; num <= 9; num++) {
      const positions: number[] = [];
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const cands = getCandidates(board, r, c);
          if (cands.has(num)) {positions.push(c);}
        }
      }
      if (positions.length === 1) {
        const c = positions[0];
        return {
          cell: { row: r, col: c },
          value: num,
          explanation: `In Row ${r + 1}, ${num} can only go in Column ${c + 1}.`,
        };
      }
    }
  }

  // Try hidden singles in columns
  for (let c = 0; c < 9; c++) {
    for (let num = 1; num <= 9; num++) {
      const positions: number[] = [];
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === 0) {
          const cands = getCandidates(board, r, c);
          if (cands.has(num)) {positions.push(r);}
        }
      }
      if (positions.length === 1) {
        const r = positions[0];
        return {
          cell: { row: r, col: c },
          value: num,
          explanation: `In Column ${c + 1}, ${num} can only go in Row ${r + 1}.`,
        };
      }
    }
  }

  // Fallback: reveal first empty cell
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        return {
          cell: { row: r, col: c },
          value: solution[r][c],
          explanation: `Try placing ${solution[r][c]} at Row ${r + 1}, Column ${c + 1}.`,
        };
      }
    }
  }

  return null;
}

export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {return false;}
    }
  }
  return true;
}

export function isBoardCorrect(board: Board, solution: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0 && board[r][c] !== solution[r][c]) {return false;}
    }
  }
  return true;
}
