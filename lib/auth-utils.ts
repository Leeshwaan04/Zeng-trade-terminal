/**
 * Auth utility — extracts Kite credentials from cookies for API routes.
 */
// Dynamic import to prevent build-time leakage into client bundles

export interface AuthCredentials {
    apiKey?: string;
    apiSecret?: string;
    accessToken: string;
    broker: "KITE" | "GROWW" | "DHAN" | "FYERS";
}

export async function getAllAuthCredentials(): Promise<AuthCredentials[]> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const creds: AuthCredentials[] = [];

    // 1. Groww
    const growwToken = cookieStore.get("groww_access_token")?.value;
    if (growwToken) {
        creds.push({ accessToken: growwToken, broker: "GROWW" });
    }

    // 2. Kite
    const kiteToken = cookieStore.get("kite_access_token")?.value;
    if (kiteToken) {
        creds.push({
            apiKey: process.env.KITE_API_KEY,
            accessToken: kiteToken,
            broker: "KITE"
        });
    }

    // 3. Dhan
    const dhanToken = cookieStore.get("dhan_access_token")?.value;
    if (dhanToken) {
        creds.push({ accessToken: dhanToken, broker: "DHAN" });
    }

    // 4. Fyers
    const fyersToken = cookieStore.get("fyers_access_token")?.value;
    if (fyersToken) {
        creds.push({ accessToken: fyersToken, broker: "FYERS" });
    }

    return creds;
}

export async function getAuthCredentials(): Promise<AuthCredentials | null> {
    const all = await getAllAuthCredentials();
    return all.length > 0 ? all[0] : null;
}
