import { create } from "zustand";

interface LeaderboardEntry {
  rank: number;
  team_id: string;
  name: string;
  score: number;
  eliminated: boolean;
}

interface ScanResult {
  id: string;
  index: string;
  scanValue: string;
  timestamp: string;
  points: number;
}

interface QRState {
  lastScanResult: ScanResult | null;
  showScanResult: boolean;
  showScanError: boolean;
  showLeaderboardPreview: boolean;
  showTeamPreview: boolean;
  scanAnimation: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardConnected: boolean;
  timerConnected: boolean;
  setLastScanResult: (result: ScanResult | null) => void;
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
  showScanResult: false,
  showScanError: false,
  showLeaderboardPreview: false,
  showTeamPreview: false,
  scanAnimation: false,
  leaderboard: [],
  leaderboardConnected: false,
  timerConnected: false,

  setLastScanResult: (result) => set({ lastScanResult: result }),
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
      showScanResult: false,
      showScanError: false,
      scanAnimation: false,
    }),
}));
