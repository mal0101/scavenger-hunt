export interface User {
  id: string;
  username: string;
  phone_number?: string | null;
  nickname: string | null;
  role: "PLAYER" | "MENTOR";
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  user_id: string;
  game_id: string;
  team_id: string | null;
  total_score: number;
  status: "ACTIVE" | "ELIMINATED";
  joined_at: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  game_id: string;
  total_score: number;
  captain_id: string | null;
  created_at: string;
  player_count?: number;
}

export interface Game {
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

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface GameIndex {
  id: string;
  game_id: string;
  round_id: string | null;
  label: string;
  description: string | null;
  points: number;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  enigma_type: string | null;
  created_at: string;
}

export interface Scan {
  id: string;
  player_id: string;
  index_id: string;
  points_earned: number;
  scanned_at: string;
  gps_lat: number | null;
  gps_lng: number | null;
}

export interface LeaderboardEntry {
  teamId: string;
  teamName?: string;
  score: number;
  rank: number;
  playerCount?: number;
}
