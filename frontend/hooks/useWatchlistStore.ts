import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SearchInstrument } from '@/lib/lite-search-engine';

export interface WatchlistItem extends SearchInstrument {
    addedAtPrice?: number;
    addedAtTimestamp?: number;
}

export interface Watchlist {
    id: number;
    name: string;
    items: WatchlistItem[];
}

interface WatchlistState {
    activeWatchlistId: number;
    watchlists: Watchlist[];
    setActiveWatchlistId: (id: number) => void;
    addWatchlist: (name: string) => void;
    deleteWatchlist: (id: number) => void;
    addToWatchlist: (watchlistId: number, instrument: WatchlistItem) => void;
    removeFromWatchlist: (watchlistId: number, symbol: string) => void;
    renameWatchlist: (watchlistId: number, name: string) => void;
}

// Default initial state: 7 Watchlists like Kite
const INITIAL_WATCHLISTS: Watchlist[] = Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    name: `Watchlist ${i + 1}`,
    items: i === 0 ? [
        // Pre-populate List 1 with some verified instruments
        { symbol: "NIFTY 50", description: "Nifty 50 Index", exchange: "NSE", segment: "EQ", token: 256265 },
        { symbol: "BANKNIFTY", description: "Nifty Bank Index", exchange: "NSE", segment: "EQ", token: 260105 }
    ] : []
}));

export const useWatchlistStore = create<WatchlistState>()(
    persist(
        (set) => ({
            activeWatchlistId: 1,
            watchlists: INITIAL_WATCHLISTS,
            setActiveWatchlistId: (id) => set({ activeWatchlistId: id }),
            addWatchlist: (name) => set((state) => {
                const newId = state.watchlists.length > 0
                    ? Math.max(...state.watchlists.map(w => w.id)) + 1
                    : 1;
                const newList: Watchlist = { id: newId, name, items: [] };
                return {
                    watchlists: [...state.watchlists, newList],
                    activeWatchlistId: newId
                };
            }),
            deleteWatchlist: (id) => set((state) => {
                if (state.watchlists.length <= 1) return state; // Keep at least one
                const newLists = state.watchlists.filter(w => w.id !== id);
                return {
                    watchlists: newLists,
                    activeWatchlistId: state.activeWatchlistId === id ? newLists[0].id : state.activeWatchlistId
                };
            }),
            addToWatchlist: (watchlistId, instrument) => set((state) => {
                const listIndex = state.watchlists.findIndex(w => w.id === watchlistId);
                if (listIndex === -1) return state;

                const list = state.watchlists[listIndex];
                // Prevent duplicates
                if (list.items.some(i => i.symbol === instrument.symbol)) return state;

                const newLists = [...state.watchlists];
                newLists[listIndex] = {
                    ...list,
                    items: [...list.items, instrument]
                };
                return { watchlists: newLists };
            }),
            removeFromWatchlist: (watchlistId, symbol) => set((state) => {
                const listIndex = state.watchlists.findIndex(w => w.id === watchlistId);
                if (listIndex === -1) return state;

                const list = state.watchlists[listIndex];
                const newLists = [...state.watchlists];
                newLists[listIndex] = {
                    ...list,
                    items: list.items.filter(i => i.symbol !== symbol)
                };
                return { watchlists: newLists };
            }),
            renameWatchlist: (watchlistId, name) => set((state) => {
                const newLists = state.watchlists.map(w =>
                    w.id === watchlistId ? { ...w, name } : w
                );
                return { watchlists: newLists };
            })
        }),
        {
            name: 'cyber-trade-watchlist-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
