export const GAME_CONSTANTS = {
  DEFAULT_MAX_ROUNDS: 3,
  DEFAULT_ROUND_DURATION: 1800,
  DEFAULT_ELIMINATION_PCT: 0.2,
  DEFAULT_INDEX_POINTS: 25,
  MAX_TEAMS_PER_GAME: 100,
  PLAYERS_PER_TEAM: 4,
  OTP_EXPIRY_SECONDS: 300,
  OTP_RATE_LIMIT_SECONDS: 60,
  ACCESS_TOKEN_EXPIRY: 900,
  REFRESH_TOKEN_EXPIRY: 604800,
  MAX_SCANS_PER_MINUTE: 10,
  SSE_HEARTBEAT_INTERVAL: 25000,
  TIMER_SYNC_INTERVAL: 1000,
} as const;

export const GAME_STATES = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  ELIMINATING: "ELIMINATING",
  FINISHED: "FINISHED",
} as const;

export const ROUND_STATUS = {
  LOCKED: "locked",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export const NAV_ITEMS = {
  player: [
    { label: "DOCK", icon: "anchor", href: "/dock" },
    { label: "LOGS", icon: "history_edu", href: "/logs" },
    { label: "SCAN", icon: "qr_code_scanner", href: "/scan" },
    { label: "VAULT", icon: "lock_open", href: "/vault" },
  ],
  mentor: [
    { label: "Dashboard", icon: "dashboard", href: "/mentor/dashboard" },
    { label: "Games", icon: "sports_esports", href: "/mentor/games" },
    { label: "Indexes", icon: "qr_code", href: "/mentor/indexes" },
    { label: "Teams", icon: "group", href: "/mentor/teams" },
    { label: "Settings", icon: "settings", href: "/mentor/settings" },
  ],
} as const;
