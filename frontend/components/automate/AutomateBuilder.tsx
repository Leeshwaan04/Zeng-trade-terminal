"use client";

import React, { useState } from "react";
import { useRuleEngineStore, Condition, Action, AdvancedRule, IndicatorType, Operator, ActionType } from "@/hooks/useRuleEngineStore";
import { Plus, Trash2, Save, Play, Clock, Activity, DollarSign, RotateCcw, BarChart2 } from "lucide-react";
import { BacktestResults } from "./BacktestResults";
import { cn } from "@/lib/utils";

export const AutomateBuilder = () => {
    const addRule = useRuleEngineStore(s => s.addRule);

    const [name, setName] = useState("New Strategy");
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [actions, setActions] = useState<Action[]>([]);
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [backtestData, setBacktestData] = useState<any>(null);

    const addCondition = () => {
        setConditions([...conditions, {
            id: Math.random().toString(36).substr(2, 9),
            type: 'PRICE',
            operator: '>',
            value: 0
        }]);
    };

    const updateCondition = (id: string, updates: Partial<Condition>) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const removeCondition = (id: string) => {
        setConditions(conditions.filter(c => c.id !== id));
    };

    const addAction = () => {
        setActions([...actions, {
            id: Math.random().toString(36).substr(2, 9),
            type: 'PLACE_ORDER',
            params: { symbol: 'NSE:INFY-EQ', side: 'BUY', quantity: 1 }
        }]);
    };

    const updateAction = (id: string, updates: Partial<Action>) => {
        setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const removeAction = (id: string) => {
        setActions(actions.filter(a => a.id !== id));
    };

    const handleSave = () => {
        addRule({
            name,
            enabled: true,
            conditions,
            actions
        });
        // Reset or Notify
        setName("New Strategy");
        setConditions([]);
        setActions([]);
        setBacktestData(null);
    };

    const handleBacktest = async () => {
        setIsBacktesting(true);
        setBacktestData(null);
        try {
            const res = await fetch("/api/backtest", {
                method: "POST",
                body: JSON.stringify({
                    rule: { name, conditions, actions },
                    symbol: "NIFTY"
                })
            });
            const json = await res.json();
            if (json.status === "success") {
                setBacktestData(json.data);
            } else {
                alert(json.error || "Backtest failed");
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsBacktesting(false);
        }
    };

    return (
        <div className="w-full h-full bg-background p-6 overflow-y-auto text-foreground flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Cyber Automate Builder
                    </h2>
                    <p className="text-xs text-muted-foreground">Design rule-based algorithmic strategies.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBacktest}
                        disabled={isBacktesting || conditions.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-surface-2 hover:bg-surface-3 border border-border text-foreground rounded font-bold text-sm transition-all disabled:opacity-50"
                    >
                        {isBacktesting ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Run Backtest
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-sm transition-all"
                    >
                        <Save className="w-4 h-4" />
                        Save Strategy
                    </button>
                </div>
            </div>

            {/* Strategy Name */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Strategy Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-surface-1 border border-border p-2 rounded text-sm focus:border-purple-500 outline-none w-full max-w-md"
                />
            </div>

            <div className="flex gap-6 h-full">
                {/* CONDITIONS COLUMN */}
                <div className="flex-1 flex flex-col gap-4 border border-border bg-surface-1/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            IF (Conditions)
                        </h3>
                        <button onClick={addCondition} className="p-1.5 bg-muted rounded hover:bg-accent transition">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {conditions.length === 0 && (
                            <div className="text-center text-muted-foreground/60 text-xs py-10 dashed-border">
                                No conditions added.
                            </div>
                        )}
                        {conditions.map(c => (
                            <div key={c.id} className="p-3 bg-surface-1 border border-border rounded-lg flex flex-col gap-2 relative group">
                                <button
                                    onClick={() => removeCondition(c.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={c.type}
                                        onChange={(e) => updateCondition(c.id, { type: e.target.value as IndicatorType })}
                                        className="bg-background border border-border text-xs rounded p-1"
                                    >
                                        <option value="PRICE">Price (LTP)</option>
                                        <option value="RSI">RSI</option>
                                        <option value="SMA">SMA</option>
                                        <option value="TIME">Time</option>
                                        <option value="PNL">P&L</option>
                                    </select>

                                    {/* Indicator Specific Config */}
                                    {(c.type === 'RSI' || c.type === 'SMA') && (
                                        <input
                                            type="number"
                                            placeholder="Period"
                                            value={c.indicator?.period || 14}
                                            onChange={(e) => updateCondition(c.id, { indicator: { ...c.indicator, name: c.type, period: parseInt(e.target.value) } })}
                                            className="flex-1 bg-background border border-border text-xs rounded p-1"
                                        />
                                    )}

                                    {/* Symbol override if needed, else implicit? Let's add symbol input for PRICE */}
                                    {c.type === 'PRICE' && (
                                        <input
                                            type="text"
                                            placeholder="Symbol (e.g. NSE:SBIN-EQ)"
                                            value={c.indicator?.symbol || ""}
                                            onChange={(e) => updateCondition(c.id, { indicator: { ...c.indicator, name: 'PRICE', symbol: e.target.value } })}
                                            className="flex-1 bg-black border border-zinc-700 text-xs rounded p-1"
                                        />
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        value={c.operator}
                                        onChange={(e) => updateCondition(c.id, { operator: e.target.value as Operator })}
                                        className="bg-black border border-zinc-700 text-xs rounded p-1 text-pink-400 font-bold"
                                    >
                                        <option value=">">&gt;</option>
                                        <option value="<">&lt;</option>
                                        <option value=">=">&gt;=</option>
                                        <option value="<=">&lt;=</option>
                                        <option value="==">==</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={c.value}
                                        onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                                        className="flex-1 bg-black border border-zinc-700 text-xs rounded p-1"
                                        placeholder="Value (e.g. 100 or 10:30)"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LOGIC CONNECTOR */}
                <div className="flex items-center justify-center">
                    <div className="p-2 rounded-full bg-muted text-muted-foreground font-bold text-xs">THEN</div>
                </div>

                {/* ACTIONS COLUMN */}
                <div className="flex-1 flex flex-col gap-4 border border-border bg-surface-1/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            DO (Actions)
                        </h3>
                        <button onClick={addAction} className="p-1.5 bg-muted rounded hover:bg-accent transition">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {actions.length === 0 && (
                            <div className="text-center text-muted-foreground/60 text-xs py-10 dashed-border">
                                No actions defined.
                            </div>
                        )}
                        {actions.map(a => (
                            <div key={a.id} className="p-3 bg-surface-1 border border-border rounded-lg flex flex-col gap-2 relative group">
                                <button
                                    onClick={() => removeAction(a.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>

                                <select
                                    value={a.type}
                                    onChange={(e) => updateAction(a.id, { type: e.target.value as ActionType })}
                                    className="bg-background border border-border text-xs rounded p-1 w-full"
                                >
                                    <option value="PLACE_ORDER">Place Order</option>
                                    <option value="EXIT_ALL">Exit All Positions</option>
                                    <option value="NOTIFICATION">Send Notification</option>
                                </select>

                                {a.type === 'PLACE_ORDER' && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Symbol"
                                            value={a.params.symbol}
                                            onChange={(e) => updateAction(a.id, { params: { ...a.params, symbol: e.target.value } })}
                                            className="col-span-2 bg-black border border-zinc-700 text-xs rounded p-1"
                                        />
                                        <select
                                            value={a.params.side}
                                            onChange={(e) => updateAction(a.id, { params: { ...a.params, side: e.target.value } })}
                                            className="bg-black border border-zinc-700 text-xs rounded p-1"
                                        >
                                            <option value="BUY">BUY</option>
                                            <option value="SELL">SELL</option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            value={a.params.quantity}
                                            onChange={(e) => updateAction(a.id, { params: { ...a.params, quantity: parseInt(e.target.value) } })}
                                            className="bg-black border border-zinc-700 text-xs rounded p-1"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* BACKTEST SECTION */}
            {backtestData ? (
                <div className="mt-4 border-t border-border pt-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h3 className="text-lg font-black uppercase text-foreground flex items-center gap-2 tracking-tighter">
                                <BarChart2 className="w-5 h-5 text-primary" />
                                Strategy Analytics Result
                            </h3>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">Performance based on 500 historical M1 candles</span>
                        </div>
                        <button
                            onClick={() => setBacktestData(null)}
                            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            [ Clear Report ]
                        </button>
                    </div>
                    <BacktestResults data={backtestData} />
                </div>
            ) : isBacktesting ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 animate-pulse">
                    <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                    <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Simulating Strategy...</span>
                </div>
            ) : null}
        </div>
    );
};
