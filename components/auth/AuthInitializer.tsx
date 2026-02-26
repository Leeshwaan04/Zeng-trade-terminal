"use client";

/**
 * AuthInitializer — mounts once to hydrate auth state from the
 * kite_auth_payload cookie after a successful OAuth redirect.
 */
import { useEffect } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

export const AuthInitializer = () => {
    const setSession = useAuthStore((s) => s.setSession);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const setBroker = useAuthStore((s) => s.setBroker);

    useEffect(() => {
        // Only hydrate if not already logged in
        if (isLoggedIn) return;

        // ─── CYBER-INFINITY: Mock Mode Bypass ────────────────
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("mock") === "true") {
            console.log("🚀 [CyberTrade] Mock Mode Activated");
            const mockUser = {
                user_id: "mock_cyber_user",
                user_name: "Cyber Trader (Mock)",
                user_shortname: "Cyber",
                email: "mock@cybertrade.com",
                broker: "KITE",
                exchanges: ["NSE", "NFO", "BSE", "MCX"],
                products: ["CNC", "MIS", "NRML"],
                order_types: ["MARKET", "LIMIT", "SL", "SL-M"],
                login_time: new Date().toISOString(),
                avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Cyber"
            };
            setSession(mockUser as any, "mock_token_infinity", "mock_public_token");
            setBroker("KITE");
            return;
        }

        // Check for Kite payload
        const rawKite = getCookie("kite_auth_payload");
        if (rawKite) {
            try {
                const payload = JSON.parse(rawKite);
                if (payload.access_token && payload.user) {
                    setSession(payload.user, payload.access_token, payload.public_token);
                    setBroker("KITE");
                }
            } catch (e) {
                console.warn("Failed to parse kite_auth_payload cookie:", e);
            }
        }

        // Check for Upstox payload
        const rawUpstox = getCookie("upstox_auth_payload");
        if (rawUpstox) {
            try {
                const payload = JSON.parse(rawUpstox);
                // Map Upstox user to KiteUser shape for compatibility
                const mappedUser = {
                    user_id: payload.user_id,
                    user_name: payload.user_name,
                    user_shortname: payload.user_name.split(" ")[0],
                    email: payload.email,
                    broker: "UPSTOX",
                    exchanges: ["NSE", "BSE", "MCX"],
                    products: ["CNC", "MIS", "NRML"],
                    order_types: ["MARKET", "LIMIT", "SL", "SL-M"],
                    login_time: new Date().toISOString(),
                };

                // Use a dummy token for now since access_token is httpOnly
                // The actual token for API calls is handled via cookies
                setSession(mappedUser as any, "dummy_token", "dummy_token");
                setBroker("UPSTOX");
            } catch (e) {
                console.warn("Failed to parse upstox_auth_payload cookie:", e);
            }
        }

        // Clean up auth query params from URL
        const url = new URL(window.location.href);
        if (url.searchParams.has("auth_success") || url.searchParams.has("auth_error")) {
            url.searchParams.delete("auth_success");
            url.searchParams.delete("auth_error");
            window.history.replaceState({}, "", url.pathname);
        }
    }, [isLoggedIn, setSession]);

    return null;
};
