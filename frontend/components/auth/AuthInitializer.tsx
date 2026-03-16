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

        // ─── ZENG-INFINITY: Mock Mode Bypass ────────────────
        const urlParams = new URLSearchParams(window.location.search);
        const isImplicitMock = urlParams.get("mock") === "true" || urlParams.get("testAuth") === "1";

        if (isImplicitMock) {
            console.log("🚀 [ZenGTrade] Mock Mode Activated");
            const mockUser = {
                user_id: "mock_zeng_user",
                user_name: "ZenG Trader (Mock)",
                user_shortname: "ZenG",
                email: "mock@zengtrade.in",
                broker: "KITE",
                exchanges: ["NSE", "NFO", "BSE", "MCX"],
                products: ["CNC", "MIS", "NRML"],
                order_types: ["MARKET", "LIMIT", "SL", "SL-M"],
                login_time: new Date().toISOString(),
                avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ZenG"
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
