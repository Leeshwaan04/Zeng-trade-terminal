
import { create } from 'zustand';

interface SafetyState {
    isArmed: boolean;
    setArmed: (armed: boolean) => void;
    toggleArmed: () => void;
}

export const useSafetyStore = create<SafetyState>((set) => ({
    isArmed: false, // Default to SAFE (Disarmed)
    setArmed: (armed) => set({ isArmed: armed }),
    toggleArmed: () => set((state) => ({ isArmed: !state.isArmed })),
}));
