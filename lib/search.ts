import { Client } from '@elastic/elasticsearch';

// Initialize the Elasticsearch client
// In production, these should be environment variables
const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export interface SearchResult {
    token: number;
    symbol: string;
    name: string;
    expiry?: string;
    strike?: number;
    segment: string;
    brand_name?: string;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
        const response = await client.search({
            index: 'trading_symbols',
            query: {
                dis_max: {
                    queries: [
                        // Exact match on symbol (highest boost)
                        {
                            term: {
                                "symbol.keyword": {
                                    value: query.toUpperCase(),
                                    boost: 100
                                }
                            }
                        },
                        // Prefix match on symbol
                        {
                            match_phrase_prefix: {
                                symbol: {
                                    query: query.toUpperCase(),
                                    boost: 10
                                }
                            }
                        },
                        // Match on brand name
                        {
                            match: {
                                brand_name: {
                                    query: query,
                                    fuzziness: "AUTO"
                                }
                            }
                        },
                        // Match on full name
                        {
                            match: {
                                name: {
                                    query: query,
                                    fuzziness: "AUTO"
                                }
                            }
                        }
                    ]
                }
            },
            sort: [
                { "_score": "desc" },
                { "segment": { "order": "asc" } }, // EQ (Equity) before NFO (Derivatives)
                { "expiry": { "order": "asc" } }    // Near-month first
            ] as any,
            size: 10
        });

        return response.hits.hits.map((hit: any) => hit._source as SearchResult);
    } catch (error) {
        console.error('Elasticsearch search error:', error);
        // Fallback or empty results if service is down
        return [];
    }
}
