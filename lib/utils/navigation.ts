export const PLAYER_NAV_ITEMS = [
  { label: "DOCK", icon: "anchor", href: "/dock" },
  { label: "LOGS", icon: "history_edu", href: "/logs" },
  { label: "SCAN", icon: "qr_code_scanner", href: "/scan" },
  { label: "VAULT", icon: "lock_open", href: "/vault" },
] as const;

export const MENTOR_NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/mentor/dashboard" },
  { label: "Games", icon: "sports_esports", href: "/mentor/games" },
  { label: "Indexes", icon: "qr_code", href: "/mentor/indexes" },
  { label: "Teams", icon: "group", href: "/mentor/teams" },
  { label: "Settings", icon: "settings", href: "/mentor/settings" },
] as const;
