"use client";

import { create } from "zustand";

interface ComparisonStore {
  selected: string[];
  toggle: (cropName: string) => void;
  clear: () => void;
}

export const useComparisonStore = create<ComparisonStore>((set) => ({
  selected: [],
  toggle: (cropName) =>
    set((state) => ({
      selected: state.selected.includes(cropName)
        ? state.selected.filter((item) => item !== cropName)
        : [...state.selected, cropName].slice(-3)
    })),
  clear: () => set({ selected: [] })
}));

