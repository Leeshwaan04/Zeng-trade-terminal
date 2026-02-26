/**
 * Frontend API Client
 * Centralized fetch with error handling and session management.
 * 
 * Used for all client-side API calls.
 */
import { useAuthStore } from "@/hooks/useAuthStore";
// Assume global router or redirection mechanism

type ApiMethod = "GET" | "POST" | "DELETE";

interface ApiOptions {
    body?: any;
    headers?: Record<string, string>;
}

export async function apiClient<T = any>(
    endpoint: string,
    method: ApiMethod = "GET",
    options: ApiOptions = {}
): Promise<T> {
    const { body, headers } = options;

    // Auth Store Check if needed, but cookies are handled by browser/NextJS automatically.

    const config: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    };

    // MOCK MODE: Circuit Breaker for Margins
    if (typeof window !== "undefined" && window.location.search.includes("mock=true")) {
        if (endpoint.includes("/api/user/margins")) {
            console.log("[API] Mock Mode: Intercepting Margins Call");
            return {
                status: "success",
                data: {
                    totalAvailable: 1000000,
                    netUsed: 0,
                    util_percent: 0,
                    equity: { available: { live_balance: 1000000 } }
                }
            } as any;
        }
    }

    try {
        const response = await fetch(endpoint, config);

        if (response.status === 401 || response.status === 403) {
            // Unauthenticated - Trigger Global Session Expiry Handler
            // We can dispatch an event or use a callback mechanism
            console.warn(`[API] 401/403 on ${endpoint}. Triggering logout.`);
            if (typeof window !== "undefined") {
                const event = new CustomEvent("session-expired", { detail: { endpoint } });
                window.dispatchEvent(event);
            }
            throw new Error("Session Expired");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const json = await response.json();
        return json.data as T; // Assume standard { status: 'success', data: ... } wrapper
    } catch (error) {
        console.error(`[API] Error on ${endpoint}:`, error);
        throw error;
    }
}
