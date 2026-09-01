import { create } from "zustand";

interface Team {
  id: string;
  name: string;
  invite_code: string;
  member_count: number;
  score: number;
}

interface Player {
  id: string;
  phone_number: string;
  nickname: string | null;
  role: "PLAYER" | "MENTOR";
  team: Team | null;
}

interface GameState {
  playerId: string | null;
  teamId: string | null;
  playerName: string;
  playerNameInput: string;
  currentRound: number;
  totalRounds: number;
  playerRank: number;
  isCaptain: boolean;
  team: Team | null;
  player: Player | null;
  lastScan: string | null;
  scanCount: number;
  timerExpired: boolean;
  roundStatus: string;
  setPlayerName: (name: string) => void;
  setPlayerNameInput: (name: string) => void;
  setCurrentRound: (round: number) => void;
  setTotalRounds: (total: number) => void;
  setPlayerRank: (rank: number) => void;
  setIsCaptain: (isCaptain: boolean) => void;
  setTeam: (team: Team | null) => void;
  setPlayer: (player: Player | null) => void;
  setLastScan: (scan: string | null) => void;
  setScanCount: (count: number) => void;
  incrementScanCount: () => void;
  setTimerExpired: (expired: boolean) => void;
  setRoundStatus: (status: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerId: null,
  teamId: null,
  playerName: "",
  playerNameInput: "",
  currentRound: 0,
  totalRounds: 3,
  playerRank: 0,
  isCaptain: false,
  team: null,
  player: null,
  lastScan: null,
  scanCount: 0,
  timerExpired: false,
  roundStatus: "locked",

  setPlayerName: (playerName) => set({ playerName }),
  setPlayerNameInput: (playerNameInput) => set({ playerNameInput }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setTotalRounds: (totalRounds) => set({ totalRounds }),
  setPlayerRank: (playerRank) => set({ playerRank }),
  setIsCaptain: (isCaptain) => set({ isCaptain }),
  setTeam: (team) =>
    set({
      team,
      teamId: team?.id ?? null,
      isCaptain: false,
    }),
  setPlayer: (player) =>
    set({
      player,
      playerId: player?.id ?? null,
    }),
  setLastScan: (lastScan) => set({ lastScan }),
  setScanCount: (scanCount) => set({ scanCount }),
  incrementScanCount: () =>
    set((state) => ({ scanCount: state.scanCount + 1 })),
  setTimerExpired: (timerExpired) => set({ timerExpired }),
  setRoundStatus: (roundStatus) => set({ roundStatus }),
}));
