
export type CommandAction =
    | { type: 'ORDER', side: 'BUY' | 'SELL', symbol: string, qty: number, isIndexToken?: boolean }
    | { type: 'CANCEL_ALL' }
    | { type: 'CLOSE_ALL' }
    | { type: 'CHART', symbol: string }
    | { type: 'LOGOUT' }
    | null;

export function parseCommand(input: string): CommandAction {
    const text = input.trim().toLowerCase();

    // Pattern: "panic" or "close all"
    if (text === 'panic' || text === 'close all') {
        return { type: 'CLOSE_ALL' };
    }

    // Pattern: "cancel all"
    if (text === 'cancel all') {
        return { type: 'CANCEL_ALL' };
    }

    // Pattern: "logout"
    if (text === 'logout' || text === 'sign out') {
        return { type: 'LOGOUT' };
    }

    // Pattern: "chart [symbol]"
    if (text.startsWith('chart ')) {
        const symbol = text.replace('chart ', '').toUpperCase();
        return { type: 'CHART', symbol };
    }

    // Pattern: "buy [symbol] [qty]" or "sell [symbol] [qty]"
    // Example: "buy nifty 50" -> BUY NIFTY (qty defaults to lot size if not specified? Or is "50" the qty?)
    // If user says "buy nifty 50", does he mean Buy Nifty Index (Future) 1 Lot? Or Buy Nifty 50 shares?
    // Usually "buy nifty" means NIFTY FUT.
    // "buy reliance 10" -> Reliance 10 qty.

    const orderMatch = text.match(/^(buy|sell)\s+([a-zA-Z0-9\s]+?)(\s+(\d+))?$/);
    if (orderMatch) {
        const side = orderMatch[1].toUpperCase() as 'BUY' | 'SELL';
        let symbolRaw = orderMatch[2].trim().toUpperCase();
        let qty = orderMatch[4] ? parseInt(orderMatch[4], 10) : 1; // Default to 1 if not specified? 
        // Or if it's NIFTY/BANKNIFTY, default to lot size? 
        // For MVP, default to 1 qty for stocks, but let's see.

        // Symbol Resolution Logic (Simple)
        // If symbol is "NIFTY" -> "NIFTY 50" (Index) -> But we can't trade index. We trade Futures.
        // Needs a mapper.

        let isIndexToken = false;
        if (symbolRaw === 'NIFTY' || symbolRaw === 'NIFTY 50') {
            symbolRaw = 'NIFTY 50'; // Mapping for chart. For order, we need FUT.
            // For now, let's assume "buy nifty" puts a placeholder order or logs it.
            // Ideally, we'd map to current month future: "NIFTY24DECFUT".
            isIndexToken = true;
        } else if (symbolRaw === 'BANKNIFTY') {
            symbolRaw = 'BANKNIFTY';
            isIndexToken = true;
        }

        return { type: 'ORDER', side, symbol: symbolRaw, qty, isIndexToken };
    }

    // Pattern: Just a symbol name -> Switch chart
    // e.g. "reliance", "infy"
    // Heuristic: If it's a known symbol (validation needed?), treat as chart switch.
    // For now, if single word and not a command, treat as chart switch attempt.
    if (!text.includes(' ')) {
        return { type: 'CHART', symbol: text.toUpperCase() };
    }

    return null;
}
