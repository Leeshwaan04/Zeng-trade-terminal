/**
 * Auth utility — extracts Kite credentials from cookies for API routes.
 */
import { cookies } from "next/headers";

export interface AuthCredentials {
    apiKey?: string;
    accessToken: string;
    broker: "KITE" | "GROWW";
}

export async function getAuthCredentials(): Promise<AuthCredentials | null> {
    const cookieStore = await cookies();

    // Priority 1: Groww (if token exists)
    const growwAccessToken = cookieStore.get("groww_access_token")?.value;
    if (growwAccessToken) {
        return { accessToken: growwAccessToken, broker: "GROWW" };
    }

    // Priority 2: Kite
    const kiteAccessToken = cookieStore.get("kite_access_token")?.value;
    const kiteApiKey = process.env.KITE_API_KEY;

    if (kiteApiKey && kiteAccessToken) {
        return { apiKey: kiteApiKey, accessToken: kiteAccessToken, broker: "KITE" };
    }

    return null;
}
