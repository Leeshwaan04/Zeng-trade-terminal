"use client";

import React, { useState } from "react";
import { useRuleEngineStore, Condition, Action, AdvancedRule, IndicatorType, Operator, ActionType } from "@/hooks/useRuleEngineStore";
import { Plus, Trash2, Save, Play, Clock, Activity, DollarSign } from "lucide-react";

export const AutomateBuilder = () => {
    const addRule = useRuleEngineStore(s => s.addRule);

    const [name, setName] = useState("New Strategy");
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [actions, setActions] = useState<Action[]>([]);

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
    };

    return (
        <div className="w-full h-full bg-zinc-950 p-6 overflow-y-auto text-zinc-100 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Cyber Automate Builder
                    </h2>
                    <p className="text-xs text-zinc-500">Design rule-based algorithmic strategies.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold text-sm transition-all"
                >
                    <Save className="w-4 h-4" />
                    Save Strategy
                </button>
            </div>

            {/* Strategy Name */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-zinc-400">Strategy Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 p-2 rounded text-sm focus:border-purple-500 outline-none w-full max-w-md"
                />
            </div>

            <div className="flex gap-6 h-full">
                {/* CONDITIONS COLUMN */}
                <div className="flex-1 flex flex-col gap-4 border border-zinc-800/50 bg-zinc-900/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            IF (Conditions)
                        </h3>
                        <button onClick={addCondition} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition">
                            <Plus className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {conditions.length === 0 && (
                            <div className="text-center text-zinc-600 text-xs py-10 dashed-border">
                                No conditions added.
                            </div>
                        )}
                        {conditions.map(c => (
                            <div key={c.id} className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg flex flex-col gap-2 relative group">
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
                                        className="bg-black border border-zinc-700 text-xs rounded p-1"
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
                                            className="w-12 bg-black border border-zinc-700 text-xs rounded p-1"
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
                    <div className="p-2 rounded-full bg-zinc-800 text-zinc-500 font-bold text-xs">THEN</div>
                </div>

                {/* ACTIONS COLUMN */}
                <div className="flex-1 flex flex-col gap-4 border border-zinc-800/50 bg-zinc-900/20 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            DO (Actions)
                        </h3>
                        <button onClick={addAction} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 transition">
                            <Plus className="w-4 h-4 text-zinc-400" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {actions.length === 0 && (
                            <div className="text-center text-zinc-600 text-xs py-10 dashed-border">
                                No actions defined.
                            </div>
                        )}
                        {actions.map(a => (
                            <div key={a.id} className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg flex flex-col gap-2 relative group">
                                <button
                                    onClick={() => removeAction(a.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/10 rounded transition"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>

                                <select
                                    value={a.type}
                                    onChange={(e) => updateAction(a.id, { type: e.target.value as ActionType })}
                                    className="bg-black border border-zinc-700 text-xs rounded p-1 w-full"
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
        </div>
    );
};
