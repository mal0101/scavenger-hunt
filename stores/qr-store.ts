import { create } from "zustand";

interface LeaderboardEntry {
  rank: number;
  team_id: string;
  name: string;
  score: number;
  eliminated: boolean;
}

export interface ScanResultPayload {
  index_label: string;
  game_id: string;
  points_earned: number;
  team_total: number;
  scan_id: string;
  question?: string | null;
  at_risk?: number | null;
}

interface QRState {
  lastScanResult: ScanResultPayload | null;
  scanType: "index" | "trap" | null;
  showScanResult: boolean;
  showScanError: boolean;
  showLeaderboardPreview: boolean;
  showTeamPreview: boolean;
  scanAnimation: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardConnected: boolean;
  timerConnected: boolean;
  setScanResult: (result: ScanResultPayload, type: "index" | "trap") => void;
  clearScanResult: () => void;
  setShowScanResult: (show: boolean) => void;
  setShowScanError: (show: boolean) => void;
  setShowLeaderboardPreview: (show: boolean) => void;
  setShowTeamPreview: (show: boolean) => void;
  setScanAnimation: (animating: boolean) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setLeaderboardConnected: (connected: boolean) => void;
  setTimerConnected: (connected: boolean) => void;
  resetScanUI: () => void;
}

export const useQRStore = create<QRState>((set) => ({
  lastScanResult: null,
  scanType: null,
  showScanResult: false,
  showScanError: false,
  showLeaderboardPreview: false,
  showTeamPreview: false,
  scanAnimation: false,
  leaderboard: [],
  leaderboardConnected: false,
  timerConnected: false,

  setScanResult: (result, type) =>
    set({ lastScanResult: result, scanType: type, showScanResult: true }),
  clearScanResult: () =>
    set({ lastScanResult: null, scanType: null, showScanResult: false }),
  setShowScanResult: (show) => set({ showScanResult: show }),
  setShowScanError: (show) => set({ showScanError: show }),
  setShowLeaderboardPreview: (show) => set({ showLeaderboardPreview: show }),
  setShowTeamPreview: (show) => set({ showTeamPreview: show }),
  setScanAnimation: (animating) => set({ scanAnimation: animating }),
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  setLeaderboardConnected: (connected) =>
    set({ leaderboardConnected: connected }),
  setTimerConnected: (connected) => set({ timerConnected: connected }),
  resetScanUI: () =>
    set({
      lastScanResult: null,
      scanType: null,
      showScanResult: false,
      showScanError: false,
      scanAnimation: false,
    }),
}));
