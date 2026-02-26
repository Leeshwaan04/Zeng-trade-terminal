import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const resolution = searchParams.get("resolution");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!symbol || !resolution || !from || !to) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("fyers_access_token")?.value;
    const appId = process.env.FYERS_APP_ID;

    if (!accessToken || !appId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        let fyersRes = resolution;
        if (resolution.includes("m")) fyersRes = resolution.replace("m", "");
        if (resolution.includes("H")) fyersRes = "60";
        if (resolution === "1D") fyersRes = "1D";

        const url = `https://api-v3.fyers.in/data-rest/v3/history?symbol=${encodeURIComponent(symbol)}&resolution=${fyersRes}&date_format=1&range_from=${from}&range_to=${to}&cont_flag=1`;

        const res = await fetch(url, {
            headers: {
                "Authorization": `${appId}:${accessToken}`
            }
        });

        const data = await res.json();

        if (data.s !== "ok") {
            return NextResponse.json({ error: data.message || "Fyers History Failed" }, { status: 400 });
        }

        return NextResponse.json({ data: { candles: data.candles } });

    } catch (error) {
        console.error("Fyers History Error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
