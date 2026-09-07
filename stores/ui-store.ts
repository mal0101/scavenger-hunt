import { create } from "zustand";

interface UIState {
  toastMessage: string | null;
  toastType: "success" | "error" | "info";
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toastMessage: null,
  toastType: "info",

  showToast: (toastMessage, toastType = "info") =>
    set({ toastMessage, toastType }),
  clearToast: () => set({ toastMessage: null }),
}));