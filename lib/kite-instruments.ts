import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface KiteInstrument {
    instrument_token: number;
    exchange_token: number;
    tradingsymbol: string;
    name: string;
    last_price: number;
    expiry: string;
    strike: number;
    tick_size: number;
    lot_size: number;
    instrument_type: string;
    segment: string;
    exchange: string;
}

let INSTRUMENT_CACHE: KiteInstrument[] | null = null;
const CACHE_FILE = join(process.cwd(), '.kite-instruments-cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper to parse Kite's CSV format
// instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange
function parseCSV(csv: string): KiteInstrument[] {
    const lines = csv.split('\n');
    const instruments: KiteInstrument[] = [];
    
    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length < 12) continue;

        instruments.push({
            instrument_token: parseInt(parts[0]),
            exchange_token: parseInt(parts[1]),
            tradingsymbol: parts[2].replace(/^"|"$/g, ''),
            name: parts[3].replace(/^"|"$/g, ''),
            last_price: parseFloat(parts[4]),
            expiry: parts[5].replace(/^"|"$/g, ''),
            strike: parseFloat(parts[6]),
            tick_size: parseFloat(parts[7]),
            lot_size: parseInt(parts[8]),
            instrument_type: parts[9].replace(/^"|"$/g, ''),
            segment: parts[10].replace(/^"|"$/g, ''),
            exchange: parts[11].replace(/^"|"$/g, '')
        });
    }
    return instruments;
}

export async function getInstruments(): Promise<KiteInstrument[]> {
    // 1. Check in-memory cache
    if (INSTRUMENT_CACHE) return INSTRUMENT_CACHE;

    // 2. Check file cache
    if (existsSync(CACHE_FILE)) {
        try {
            const stat =  await import('fs').then(fs => fs.promises.stat(CACHE_FILE));
            if (Date.now() - stat.mtimeMs < CACHE_DURATION) {
                console.log('Loading instruments from disk cache...');
                const data = readFileSync(CACHE_FILE, 'utf-8');
                INSTRUMENT_CACHE = JSON.parse(data);
                return INSTRUMENT_CACHE!;
            }
        } catch (e) {
            console.error('Error reading instrument cache', e);
        }
    }

    // 3. Fetch from Kite
    console.log('Fetching NFO instruments from Kite...');
    try {
        const response = await fetch('https://api.kite.trade/instruments/NFO');
        if (!response.ok) throw new Error('Failed to fetch instruments');
        
        const csvText = await response.text();
        const instruments = parseCSV(csvText);

        // Save to cache
        INSTRUMENT_CACHE = instruments;
        writeFileSync(CACHE_FILE, JSON.stringify(instruments));
        console.log(`Cached ${instruments.length} instruments.`);
        
        return instruments;
    } catch (error) {
        console.error('Failed to load instruments:', error);
        return [];
    }
}

export async function getOptionChain(symbol: string, expiry?: string): Promise<KiteInstrument[]> {
    const instruments = await getInstruments();
    
    // Filter by name (e.g., NIFTY, BANKNIFTY) and Segment
    // Note: tradingsymbol format usually "NIFTY24MAR22000CE"
    // Name is "NIFTY"
    let filtered = instruments.filter(i => 
        i.name === symbol && 
        i.segment === 'NFO-OPT'
    );

    if (expiry) {
        filtered = filtered.filter(i => i.expiry === expiry);
    } else {
        // If no expiry, default to the nearest one (first unique expiry found/sorted)
        // For simplicity, we just return all, or let the UI handle grouping.
        // Or we can find the nearest date.
        
        // Let's sort by expiry date and pick the first one if not provided?
        // Actually, returning all expiries for the symbol needs efficient filtering on frontend.
        // Let's filter for current month/nearest expiry if not provided.
        // Implementation: Find unique expiries, sort, pick closest to today.
        
        const today = new Date();
        const expiries = Array.from(new Set(filtered.map(i => i.expiry)))
            .map(e => ({ date: new Date(e), str: e }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .filter(e => e.date >= today); // Only future expiries
            
        if (expiries.length > 0) {
            const nearest = expiries[0].str;
            filtered = filtered.filter(i => i.expiry === nearest);
        }
    }

    return filtered;
}
