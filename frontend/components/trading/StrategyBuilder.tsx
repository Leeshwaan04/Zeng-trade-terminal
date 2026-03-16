"use client";

import React from "react";
import { Trash2, Shield, Zap, Target, TrendingUp, ArrowRight, Loader2, X } from "lucide-react";
import { useStrategyStore, StrategyLeg } from "@/hooks/useStrategyStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { blackScholes } from "@/lib/black-scholes";
import { useToast } from "@/hooks/use-toast";

export const StrategyBuilder = () => {
    const { legs, removeLeg, updateLeg, clearStrategy, ivShift, dayShift } = useStrategyStore();
    const { tickers } = useMarketStore();
    const { toast } = useToast();
    const [executing, setExecuting] = React.useState(false);

    // Aggregated Greeks
    const totalGreeks = React.useMemo(() => {
        let delta = 0, gamma = 0, theta = 0, vega = 0;
        const T = Math.max(0.0001, (7 - dayShift) / 365);
        const V = Math.max(0.05, 0.18 + (ivShift / 100)); // Base 18% + shift
        const r = 0.07;

        legs.forEach(leg => {
            const underlyingName = leg.instrument.name === "NIFTY" ? "NIFTY 50" : leg.instrument.name === "BANKNIFTY" ? "NIFTY BANK" : leg.instrument.name;
            const ticker = tickers[underlyingName];
            const spot = ticker?.last_price || leg.instrument.strike;
            const bs = blackScholes(spot, leg.instrument.strike, T, r, V, leg.instrument.instrument_type as 'CE' | 'PE');

            const multiplier = (leg.side === 'BUY' ? 1 : -1) * leg.quantity;
            delta += bs.delta * multiplier;
            gamma += bs.gamma * multiplier;
            theta += bs.theta * multiplier;
            vega += bs.vega * multiplier;
        });

        return { delta, gamma, theta, vega };
    }, [legs, tickers, ivShift, dayShift]);

    const handleExecuteBasket = async () => {
        if (legs.length === 0 || executing) return;
        setExecuting(true);
        try {
            const orders = legs.map(leg => ({
                exchange: leg.instrument.exchange === 'NFO' ? 'NFO' : 'NSE',
                tradingsymbol: leg.instrument.tradingsymbol,
                transaction_type: leg.side,
                quantity: leg.quantity,
                order_type: 'MARKET',
                product: 'MIS',
                price: 0
            }));

            const res = await fetch('/api/orders/multi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orders, tag: 'BASKET_STRATEGY' })
            });

            const json = await res.json();
            if (json.status === 'success') {
                toast({ title: "⚡ Strategy Executed", description: `Successfully placed ${legs.length} legs.` });
                clearStrategy();
            } else {
                throw new Error(json.message || "Execution failed");
            }
        } catch (error: any) {
            toast({ title: "Execution Error", description: error.message, variant: "destructive" });
        } finally {
            setExecuting(false);
        }
    };

    if (legs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 p-8 text-center bg-black/40 backdrop-blur-md">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="text-sm font-black text-zinc-400 mb-1 uppercase tracking-tighter">Strategy Builder Empty</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase">Select options from the chain to build a custom multi-leg strategy.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black/40 backdrop-blur-md">
            {/* Header */}
            <div className="p-3 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest">Institutional Strategy Builder</h2>
                </div>
                <button
                    onClick={clearStrategy}
                    className="text-[9px] font-black text-zinc-500 hover:text-white transition-colors uppercase"
                >
                    Clear All
                </button>
            </div>

            {/* Greeks Dashboard (Total Strategy) */}
            <div className="grid grid-cols-4 gap-[1px] bg-white/5 border-b border-white/5">
                <GreekSummary label="Delta" value={totalGreeks.delta} decimals={1} unit="Δ" />
                <GreekSummary label="Gamma" value={totalGreeks.gamma} decimals={3} unit="Γ" />
                <GreekSummary label="Theta" value={totalGreeks.theta} decimals={0} unit="Θ" />
                <GreekSummary label="Vega" value={totalGreeks.vega} decimals={0} unit="V" />
            </div>

            {/* Leg List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {legs.map((leg) => (
                    <LegCard
                        key={leg.id}
                        leg={leg}
                        onRemove={() => removeLeg(leg.id)}
                        onUpdate={(updates) => updateLeg(leg.id, updates)}
                    />
                ))}
            </div>

            {/* Execution Footer */}
            <div className="p-4 border-t border-white/5 bg-zinc-900/50">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Est. Margin Req</span>
                    <span className="text-xs font-mono font-black text-white">
                        ₹{(legs.length * 125000).toLocaleString()} <span className="text-[8px] text-zinc-600">(EST)</span>
                    </span>
                </div>

                <button
                    onClick={handleExecuteBasket}
                    disabled={executing}
                    className="w-full bg-primary hover:bg-primary-light text-black font-black py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all group/btn shadow-[0_0_20px_rgba(0,229,255,0.2)] disabled:opacity-50"
                >
                    {executing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            EXECUTE BASKET
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

const GreekSummary = ({ label, value, decimals, unit }: any) => (
    <div className="bg-[#0a0a0a]/80 p-2 flex flex-col items-center justify-center">
        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-tighter mb-0.5">{label}</span>
        <div className={cn(
            "text-[10px] font-black tabular-nums",
            value >= 0 ? "text-up" : "text-down"
        )}>
            {value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        </div>
    </div>
);

const LegCard = ({ leg, onRemove, onUpdate }: { leg: StrategyLeg, onRemove: () => void, onUpdate: (u: any) => void }) => {
    return (
        <div className="group flex flex-col bg-zinc-900/40 border border-white/5 rounded-lg p-2.5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onUpdate({ side: leg.side === 'BUY' ? 'SELL' : 'BUY' })}
                        className={cn(
                            "px-1.5 py-0.5 rounded-[2px] text-[8px] font-black transition-colors uppercase",
                            leg.side === 'BUY' ? "bg-up/20 text-up border border-up/20" : "bg-down/20 text-down border border-down/20"
                        )}
                    >
                        {leg.side}
                    </button>
                    <span className="text-[10px] font-black text-zinc-100 uppercase tracking-tight">
                        {leg.instrument.strike} {leg.instrument.instrument_type} <span className="text-zinc-500 ml-1 font-mono text-[9px]">{leg.instrument.expiry}</span>
                    </span>
                </div>
                <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-white transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Quantity</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={leg.quantity}
                            onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) })}
                            className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-primary/50"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Entry Price</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={leg.price}
                            onChange={(e) => onUpdate({ price: parseFloat(e.target.value) })}
                            className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-primary/50"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

