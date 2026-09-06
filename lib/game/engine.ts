import { GAME_STATES, ROUND_STATUS } from "@/lib/utils/constants";

export type GameStatus = (typeof GAME_STATES)[keyof typeof GAME_STATES];
export type RoundStatus = (typeof ROUND_STATUS)[keyof typeof ROUND_STATUS];

export interface GameStateTransition {
  from: GameStatus;
  to: GameStatus;
  action: string;
}

const VALID_TRANSITIONS: GameStateTransition[] = [
  { from: "PENDING", to: "ACTIVE", action: "start" },
  { from: "ACTIVE", to: "ELIMINATING", action: "eliminate" },
  { from: "ELIMINATING", to: "ACTIVE", action: "next_round" },
  { from: "ELIMINATING", to: "FINISHED", action: "finish" },
  { from: "FINISHED", to: "PENDING", action: "reset" },
];

export type GameAction =
  | "start"
  | "eliminate"
  | "next_round"
  | "finish"
  | "reset";

export function canTransition(currentState: GameStatus, action: string): boolean {
  return VALID_TRANSITIONS.some(
    (t) => t.from === currentState && t.action === action
  );
}

export function getTargetState(
  currentState: GameStatus,
  action: string
): GameStatus | null {
  const transition = VALID_TRANSITIONS.find(
    (t) => t.from === currentState && t.action === action
  );
  return transition?.to ?? null;
}

export function calculateScanScore(
  basePoints: number,
  remainingTime: number,
  totalTime: number
): number {
  if (totalTime <= 0) return basePoints;
  const timeMultiplier = 1 + (remainingTime / totalTime) * 0.5;
  return Math.round(basePoints * timeMultiplier);
}

export function calculateEliminationThreshold(
  sortedScores: number[],
  eliminationPct: number
): number {
  if (sortedScores.length === 0) return 0;
  const idx = Math.floor(sortedScores.length * eliminationPct);
  return sortedScores[Math.min(idx, sortedScores.length - 1)];
}

export function getEliminatedTeams(
  teams: Array<{ id: string; total_score: number }>,
  eliminationPct: number
): string[] {
  if (teams.length <= 1) return [];

  const sorted = [...teams].sort((a, b) => b.total_score - a.total_score);
  const threshold = calculateEliminationThreshold(
    sorted.map((t) => t.total_score),
    eliminationPct
  );

  const eliminated = sorted.filter((t) => t.total_score < threshold);
  if (eliminated.length === 0 && sorted.length > 1) {
    return [sorted[sorted.length - 1].id];
  }

  return eliminated.map((t) => t.id);
}
