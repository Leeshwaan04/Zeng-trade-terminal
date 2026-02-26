import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();
    // 5Paisa requires encrypted Payload (AES-256-CBC)
    // clientCode, password, dob

    return NextResponse.json({ success: true, token: "mock_5paisa_token" });
}

export async function GET() {
    return NextResponse.json({ message: "Please POST credentials to login to 5Paisa." });
}
