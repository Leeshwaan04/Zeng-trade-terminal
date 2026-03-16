import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@elastic/elasticsearch';
import { MARKET_INSTRUMENTS } from '@/lib/market-config';

const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export async function GET(req: NextRequest) {
    try {
        // 1. Check if ES is up
        const info = await client.info();
        console.log("ES Info:", info);

        // 2. Clear index (optional, for diagnostic let's just add)
        // await client.indices.delete({ index: 'trading_symbols' }).catch(() => {});

        // 3. Create index with mapping if not exists
        const exists = await client.indices.exists({ index: 'trading_symbols' });
        if (!exists) {
            await client.indices.create({
                index: 'trading_symbols',
                mappings: {
                    properties: {
                        symbol: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                        name: { type: 'text' },
                        token: { type: 'integer' },
                        exchange: { type: 'keyword' },
                        segment: { type: 'keyword' }
                    }
                }
            });
        }

        // 4. Seed from MARKET_INSTRUMENTS
        const operations = MARKET_INSTRUMENTS.flatMap(doc => [
            { index: { _index: 'trading_symbols' } },
            {
                ...doc,
                segment: doc.exchange === 'NSE' ? 'EQ' : 'INDICES'
            }
        ]);

        if (operations.length > 0) {
            const bulkResponse = await client.bulk({ refresh: true, body: operations });
            if (bulkResponse.errors) {
                return NextResponse.json({ error: "Bulk errors", details: bulkResponse.items }, { status: 500 });
            }
        }

        return NextResponse.json({
            status: "success",
            message: `Seeded ${MARKET_INSTRUMENTS.length} symbols`,
            es_info: info.name
        });

    } catch (error: any) {
        console.error("Diagnostic error:", error);
        return NextResponse.json({
            status: "error",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
