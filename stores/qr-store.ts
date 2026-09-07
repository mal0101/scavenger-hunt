import { create } from "zustand";

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
  setScanResult: (result: ScanResultPayload, type: "index" | "trap") => void;
  clearScanResult: () => void;
}

export const useQRStore = create<QRState>((set) => ({
  lastScanResult: null,
  scanType: null,

  setScanResult: (result, type) =>
    set({ lastScanResult: result, scanType: type }),
  clearScanResult: () =>
    set({ lastScanResult: null, scanType: null }),
}));