export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Board = CellValue[][];
export type Notes = Set<number>[][];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';

export interface PuzzleData {
  puzzle: Board;
  solution: Board;
  difficulty: Difficulty;
  givens: number;
}

export interface CellPosition {
  row: number;
  col: number;
}
