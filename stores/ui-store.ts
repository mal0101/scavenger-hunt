import { create } from "zustand";

type Theme = "dark" | "light" | "system";
type Language = "en" | "fr" | "ar";

interface UIState {
  theme: Theme;
  language: Language;
  scanError: string | null;
  toastMessage: string | null;
  toastType: "success" | "error" | "info";
  sidebarExpanded: boolean;
  isHydrated: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setScanError: (error: string | null) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  language: "en",
  scanError: null,
  toastMessage: null,
  toastType: "info",
  sidebarExpanded: false,
  isHydrated: false,

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setScanError: (scanError) => set({ scanError }),
  showToast: (toastMessage, toastType = "info") =>
    set({ toastMessage, toastType }),
  clearToast: () => set({ toastMessage: null }),
  setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),
  setHydrated: (isHydrated) => set({ isHydrated }),
}));
