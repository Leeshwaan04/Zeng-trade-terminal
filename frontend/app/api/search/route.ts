import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols } from '@/lib/search';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');

    if (!q) {
        return NextResponse.json([]);
    }

    try {
        const results = await searchSymbols(q);
        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
