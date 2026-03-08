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
    setSession: (user: UnifiedUser, accessToken: string, publicToken: string) => void;
    setGrowwSession: (user: GrowwUser, accessToken: string) => void;
    clearSession: () => void;
    setSkipOrderConfirmation: (skip: boolean) => void;
    login: () => void;
    logout: () => Promise<void>;
    loginAsGuest: () => void;
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

            // ─── Guest Login ─────────────────────────────────
            loginAsGuest: () => {
                const guestUser: KiteUser = {
                    user_id: "GUEST123",
                    user_name: "Guest Trader",
                    user_shortname: "Guest",
                    email: "guest@zengtrade.pro",
                    broker: "GUEST",
                    exchanges: ["NSE", "BSE", "NFO"],
                    products: ["CNC", "MIS", "NRML"],
                    order_types: ["MARKET", "LIMIT", "SL", "SL-M"],
                    login_time: new Date().toISOString()
                };
                set({
                    isLoggedIn: true,
                    user: guestUser,
                    accessToken: "guest_token",
                    publicToken: "guest_public",
                    loginTime: new Date().toISOString(),
                    activeBroker: "KITE"
                });
            },

            // ─── Set Session (called after OAuth callback) ───
            setSession: (user, accessToken, publicToken) =>
                set({
                    isLoggedIn: true,
                    user,
                    accessToken,
                    publicToken,
                    loginTime: new Date().toISOString(),
                }),

            setGrowwSession: async (user, accessToken) => {
                try {
                    await fetch("/api/auth/groww", {
                        method: "POST",
                        body: JSON.stringify({ accessToken, user }),
                    });
                } catch (e) {
                    console.warn("Groww Auth API call failed:", e);
                }
                set({
                    isLoggedIn: true,
                    user,
                    growwAccessToken: accessToken,
                    activeBroker: "GROWW",
                    loginTime: new Date().toISOString(),
                });
            },

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

                const apiKey = config?.apiKey || process.env.NEXT_PUBLIC_KITE_API_KEY || process.env.KITE_API_KEY;

                if (!apiKey) {
                    console.error(`❌ [Auth] Missing API Key for ${activeBroker}. Set config or environment variables.`);
                    return;
                }

                const origin = window.location.origin;
                const redirectUri = encodeURIComponent(`${origin}/api/auth/callback`);

                if (activeBroker === "KITE") {
                    window.location.href = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}&redirect_uri=${redirectUri}`;
                } else if (activeBroker === "DHAN") {
                    window.location.href = `https://auth.dhan.co/oauth/authorize?response_type=code&client_id=${apiKey}&redirect_uri=${redirectUri}&scope=orders,read`;
                } else if (activeBroker === "FYERS") {
                    window.location.href = `https://api-v3.fyers.in/api/v3/generate-authcode?client_id=${apiKey}&redirect_uri=${redirectUri}&response_type=code&state=zeng_fyers`;
                }
            },

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
            name: "cyber-trade-auth",
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                user: state.user,
                accessToken: state.accessToken,
                publicToken: state.publicToken,
                growwAccessToken: state.growwAccessToken,
                loginTime: state.loginTime,
                skipOrderConfirmation: state.skipOrderConfirmation,
                activeBroker: state.activeBroker,
                brokerConfigs: state.brokerConfigs,
            }),
        }
    )
);
