"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ───────────────────────────────────────────────────
export interface KiteUser {
    user_id: string;
    user_name: string;
    user_shortname: string;
    email: string;
    broker: string;
    exchanges: string[];
    products: string[];
    order_types: string[];
    avatar_url?: string;
    login_time: string;
}

export interface GrowwUser {
    user_id: string;
    user_name: string;
    email: string;
    broker: "GROWW";
}

type UnifiedUser = KiteUser | GrowwUser;

interface AuthState {
    // ─── Session ─────────────────────────────────────────────
    isLoggedIn: boolean;
    user: UnifiedUser | null;
    accessToken: string | null;
    publicToken: string | null;
    growwAccessToken: string | null;
    loginTime: string | null;

    // ─── Trading Mode ────────────────────────────────────────
    skipOrderConfirmation: boolean;

    // ─── Broker Selection & Config ────────────────────────────
    activeBroker: "KITE" | "GROWW" | "DHAN" | "ANGEL" | "FYERS" | "5PAISA";
    brokerConfigs: Record<string, { apiKey: string, apiSecret: string }>;
    setBroker: (broker: "KITE" | "GROWW" | "DHAN" | "ANGEL" | "FYERS" | "5PAISA") => void;
    updateBrokerConfig: (broker: string, config: { apiKey: string, apiSecret: string }) => void;

    // ─── Actions ─────────────────────────────────────────────
    setSession: (user: KiteUser, accessToken: string, publicToken: string) => void;
    clearSession: () => void;
    setSkipOrderConfirmation: (skip: boolean) => void;
    login: () => void;
    setUser: (user: KiteUser) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // ─── Default State ───────────────────────────────
            isLoggedIn: false,
            user: null,
            accessToken: null,
            publicToken: null,
            growwAccessToken: null,
            loginTime: null,
            skipOrderConfirmation: false,
            activeBroker: "KITE",
            brokerConfigs: {},

            setBroker: (broker) => set({ activeBroker: broker }),
            updateBrokerConfig: (broker, config) => set(state => ({
                brokerConfigs: { ...state.brokerConfigs, [broker]: config }
            })),

            // ─── Set Session (called after OAuth callback) ───
            setSession: (user, accessToken, publicToken) =>
                set({
                    isLoggedIn: true,
                    user,
                    accessToken,
                    publicToken,
                    loginTime: new Date().toISOString(),
                }),

            // ─── Clear Session ───────────────────────────────
            clearSession: () =>
                set({
                    isLoggedIn: false,
                    user: null,
                    accessToken: null,
                    publicToken: null,
                    loginTime: null,
                }),

            // ─── Trading Mode ────────────────────────────────
            setSkipOrderConfirmation: (skip) => set({ skipOrderConfirmation: skip }),

            // ─── Login Redirect ──────────────────────────────
            login: () => {
                const { activeBroker, brokerConfigs } = get();
                const config = brokerConfigs[activeBroker];

                // Prioritize user-entered key (wizard), then fallback to ENV (admin)
                const apiKey = config?.apiKey || process.env.NEXT_PUBLIC_KITE_API_KEY;

                if (!apiKey) {
                    console.error(`❌ [Auth] Missing API Key for ${activeBroker}. Set config in Onboarding or ENV.`);
                    return;
                }

                const origin = window.location.origin;
                if (activeBroker === "KITE") {
                    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback`);
                    window.location.href = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}&redirect_uri=${redirectUri}`;
                } else {
                    console.warn(`⚠️ [Auth] Broker ${activeBroker} is currently disabled for stability audits.`);
                }
            },

            // ─── Set User (update profile) ──────────────────
            setUser: (newUser) => set((state) => ({
                user: state.user ? { ...state.user, ...newUser } : newUser
            })),

            // ─── Logout ──────────────────────────────────────
            logout: async () => {
                try {
                    await Promise.all([
                        fetch("/api/auth/logout", { method: "DELETE" }),
                        fetch("/api/auth/groww", { method: "DELETE" }),
                    ]);
                } catch (e) {
                    console.warn("Logout API calls failed:", e);
                }
                set({
                    isLoggedIn: false,
                    user: null,
                    accessToken: null,
                    publicToken: null,
                    growwAccessToken: null,
                    loginTime: null,
                });
            },
        }),
        {
            // ─── Persist only user preferences in localStorage ───
            // Session data (tokens, user) is NOT stored — it lives in the
            // kite_auth_payload cookie (8h expiry) and is re-hydrated by
            // AuthInitializer on every page load. This prevents stale tokens
            // from sitting in browser storage and avoids Vercel/sessionStorage
            // lifetime surprises entirely.
            name: "zeng-prefs",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                skipOrderConfirmation: state.skipOrderConfirmation,
                activeBroker: state.activeBroker,
                brokerConfigs: state.brokerConfigs,
            }),
        }
    )
);
