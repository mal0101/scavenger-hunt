/* Shared frontend API response shapes.
 *
 * These mirror the JSON bodies returned by the backend REST endpoints and are
 * shared across pages to avoid duplicating inline interfaces. Keep them in sync
 * with `app/api/**` route handlers.
 */

/* ── Auth ── */

export interface MeResponse {
  success: boolean;
  data?: {
    user?: {
      id: string;
      username: string;
      role: string;
      nickname: string | null;
    };
  };
  timestamp?: string;
}

/* ── Player: active game ── */

export interface ActiveGameView {
  id: string;
  title: string;
  status: string;
  current_round: number;
  round_count: number;
  team_count: number;
  current_round_id: string | null;
}

/* ── Player: /players/me ── */

export interface PlayerTeamView {
  id: string;
  name: string;
  invite_code: string;
  total_score: number;
  eliminated?: boolean;
}

export interface PlayerMeView {
  id: string;
  nickname: string | null;
  total_score: number;
  passed_challenges?: number;
  team_rank?: number | null;
  team: PlayerTeamView | null;
}

/* ── Player: scan history ── */

export interface ScanLogEntry {
  id: string;
  index_label: string;
  points_earned: number;
  scanned_at: string;
  location_name?: string | null;
}

/* ── Player: /teams/me ── */

export interface TeamMemberView {
  id: string;
  user_id: string;
  username: string;
  nickname: string | null;
  total_score: number;
  status: string;
  is_captain: boolean;
  is_me: boolean;
}

export interface PlayerTeamDetail {
  id: string;
  name: string;
  invite_code: string;
  total_score: number;
  eliminated: boolean;
  game_id: string;
  captain_id: string | null;
  is_captain: boolean;
  member_count: number;
  members: TeamMemberView[];
}

/* ── Mentor: /admin/games ── */

export interface MentorGameCard {
  id: string;
  title: string;
  description: string | null;
  status: string;
  max_rounds: number;
  round_duration: number;
  elimination_pct: number;
  current_round: number;
  team_count: number;
  round_count: number;
  created_at: string;
}

export interface MentorGameTeam {
  id: string;
  name: string;
  total_score: number;
  eliminated: boolean;
  member_count: number;
  rank: number;
}

export interface MentorGameRound {
  id: string;
  round_number: number;
  status: string;
  started_at: string | null;
}

export interface MentorGameIndex {
  id: string;
  label: string;
  description: string | null;
  points: number;
  location_name: string | null;
  enigma_type: string | null;
  hint: string | null;
  sequence_order: number;
}

export interface MentorGameDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  max_rounds: number;
  round_duration: number;
  elimination_pct: number;
  team_count: number;
  current_round?: number;
  teams?: MentorGameTeam[];
  rounds: MentorGameRound[];
  indexes: MentorGameIndex[];
}

/* ── Mentor: /admin/teams ── */

export interface MentorTeamEntry {
  id: string;
  name: string;
  invite_code: string;
  game_id: string;
  game_title: string;
  total_score: number;
  eliminated: boolean;
  member_count: number;
}

/* ── Mentor: /admin/indexes ── */

export interface MentorIndexEntry {
  id: string;
  game_id: string;
  game_title: string;
  label: string;
  points: number;
  location_name: string | null;
  enigma_type: string | null;
  display_code: string | null;
  question: string | null;
  hint: string | null;
  sequence_order: number;
  scan_count: number;
}

/* ── Mentor: shared ── */

export interface MiniGame {
  id: string;
  title: string;
  elimination_pct?: number;
}