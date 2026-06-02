import { Board, CellValue, Difficulty, Notes } from '../puzzle/types';

export interface CellState {
  value: CellValue;
  notes: Set<number>;
  isGiven: boolean;
  isError: boolean;
}

export type GameBoard = CellState[][];

export interface GameMove {
  row: number;
  col: number;
  previousValue: CellValue;
  newValue: CellValue;
  previousNotes: Set<number>;
  newNotes: Set<number>;
  wasNote: boolean;
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost';

export interface GameState {
  board: GameBoard;
  puzzle: Board;
  solution: Board;
  difficulty: Difficulty;
  status: GameStatus;
  mistakes: number;
  maxMistakes: number;
  time: number; // seconds
  hintsUsed: number;
  maxHints: number;
  selectedCell: { row: number; col: number } | null;
  notesMode: boolean;
  history: GameMove[];
  historyIndex: number;
  startTime: number;
  pausedAt: number | null;
}

export interface GameStatistics {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  byDifficulty: Record<Difficulty, {
    played: number;
    won: number;
    bestTime: number;
    totalTime: number;
    averageTime: number;
  }>;
  currentStreak: number;
  bestStreak: number;
  dailyChallengesCompleted: number;
  dailyStreak: number;
  lastDailyDate: string | null;
  achievements: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameStatistics, gameState?: GameState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: 'First Win',
    description: 'Win your first game',
    icon: '🏆',
    condition: (stats) => stats.gamesWon >= 1,
  },
  {
    id: 'speed_runner',
    name: 'Speed Runner',
    description: 'Finish a game in under 5 minutes',
    icon: '⚡',
    condition: (_stats, gameState) => gameState !== undefined && gameState.status === 'won' && gameState.time < 300,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Win a game with no mistakes',
    icon: '💎',
    condition: (_stats, gameState) => gameState !== undefined && gameState.status === 'won' && gameState.mistakes === 0,
  },
  {
    id: 'daily_master',
    name: 'Daily Master',
    description: 'Complete 30 daily challenges',
    icon: '📅',
    condition: (stats) => stats.dailyChallengesCompleted >= 30,
  },
  {
    id: 'streak_5',
    name: 'On Fire',
    description: 'Win 5 games in a row',
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 5,
  },
  {
    id: 'ten_wins',
    name: 'Sudoku Veteran',
    description: 'Win 10 games',
    icon: '🎖️',
    condition: (stats) => stats.gamesWon >= 10,
  },
  {
    id: 'expert_win',
    name: 'Expert Solver',
    description: 'Win an Expert difficulty game',
    icon: '🧠',
    condition: (_stats, gameState) => gameState !== undefined && gameState.status === 'won' && gameState.difficulty === 'expert',
  },
  {
    id: 'extreme_win',
    name: 'Extreme Champion',
    description: 'Win an Extreme difficulty game',
    icon: '👑',
    condition: (_stats, gameState) => gameState !== undefined && gameState.status === 'won' && gameState.difficulty === 'extreme',
  },
];

export const DEFAULT_STATS: GameStatistics = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  byDifficulty: {
    easy: { played: 0, won: 0, bestTime: 0, totalTime: 0, averageTime: 0 },
    medium: { played: 0, won: 0, bestTime: 0, totalTime: 0, averageTime: 0 },
    hard: { played: 0, won: 0, bestTime: 0, totalTime: 0, averageTime: 0 },
    expert: { played: 0, won: 0, bestTime: 0, totalTime: 0, averageTime: 0 },
    extreme: { played: 0, won: 0, bestTime: 0, totalTime: 0, averageTime: 0 },
  },
  currentStreak: 0,
  bestStreak: 0,
  dailyChallengesCompleted: 0,
  dailyStreak: 0,
  lastDailyDate: null,
  achievements: [],
};
