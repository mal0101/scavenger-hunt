export interface GameType {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "ACTIVE" | "ELIMINATING" | "FINISHED";
  max_rounds: number;
  round_duration: number;
  elimination_pct: number;
  created_by: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoundType {
  id: string;
  game_id: string;
  round_number: number;
  score_threshold: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface IndexType {
  id: string;
  round_id: string;
  label: string;
  description: string | null;
  points: number;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  qr_signature: string;
  created_at: string;
}

export type GameStatus = "PENDING" | "ACTIVE" | "ELIMINATING" | "FINISHED";

export interface GameStateChangeRequest {
  action: "start" | "eliminate" | "finish";
}

export interface LeaderboardEntryType {
  teamId: string;
  teamName: string;
  score: number;
  rank: number;
  playerCount: number;
  status: "ACTIVE" | "ELIMINATED";
}

export interface TeamTelemetry {
  teamId: string;
  teamName: string;
  totalScore: number;
  rank: number;
  playerCount: number;
  lastScanAt: string | null;
  lastScanIndex: string | null;
  status: "ACTIVE" | "ELIMINATED";
}
