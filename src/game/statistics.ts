import * as vscode from 'vscode';
import { GameStatistics, DEFAULT_STATS, ACHIEVEMENTS } from './types';
import { GameState } from './types';

export function loadStatistics(context: vscode.ExtensionContext): GameStatistics {
  const data = context.globalState.get('sudoku-vs.statistics') as GameStatistics | undefined;
  if (data) {
    return data;
  }
  return { ...DEFAULT_STATS };
}

export function saveStatistics(
  context: vscode.ExtensionContext,
  stats: GameStatistics
): Thenable<void> {
  return context.globalState.update('sudoku-vs.statistics', stats);
}

export function recordGameEnd(stats: GameStatistics, gameState: GameState): { stats: GameStatistics; newAchievements: string[] } {
  const newStats = { ...stats };
  const newAchievements: string[] = [];

  newStats.gamesPlayed++;

  const diff = gameState.difficulty;
  const diffStats = { ...newStats.byDifficulty[diff] };
  diffStats.played++;

  if (gameState.status === 'won') {
    newStats.gamesWon++;
    diffStats.won++;
    diffStats.totalTime += gameState.time;
    diffStats.averageTime = diffStats.totalTime / diffStats.won;
    if (diffStats.bestTime === 0 || gameState.time < diffStats.bestTime) {
      diffStats.bestTime = gameState.time;
    }
    newStats.currentStreak++;
    if (newStats.currentStreak > newStats.bestStreak) {
      newStats.bestStreak = newStats.currentStreak;
    }
  } else {
    newStats.gamesLost++;
    newStats.currentStreak = 0;
  }

  newStats.byDifficulty[diff] = diffStats;

  for (const achievement of ACHIEVEMENTS) {
    if (!newStats.achievements.includes(achievement.id)) {
      if (achievement.condition(newStats, gameState)) {
        newStats.achievements = [...newStats.achievements, achievement.id];
        newAchievements.push(achievement.id);
      }
    }
  }

  return { stats: newStats, newAchievements };
}

export function recordDailyChallenge(stats: GameStatistics, date: Date): GameStatistics {
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const newStats = { ...stats };

  newStats.dailyChallengesCompleted++;

  if (newStats.lastDailyDate) {
    const last = new Date(newStats.lastDailyDate);
    const diffDays = Math.floor((date.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newStats.dailyStreak++;
    } else if (diffDays > 1) {
      newStats.dailyStreak = 1;
    }
  } else {
    newStats.dailyStreak = 1;
  }

  newStats.lastDailyDate = dateStr;
  return newStats;
}
