"use client";

import React from "react";
import { useRuleEngineStore } from "@/hooks/useRuleEngineStore";
import { Play, Pause, Trash2, Cpu } from "lucide-react";

export const AlgoRulesPanel = () => {
    const rules = useRuleEngineStore((s) => s.rules);
    const toggleRule = useRuleEngineStore((s) => s.toggleRule);
    const deleteRule = useRuleEngineStore((s) => s.deleteRule);

    return (
        <div className="w-full h-full flex flex-col bg-[#09090b] text-white p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-purple-200">Active Stratgies</h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {rules.length === 0 && (
                    <div className="text-center text-zinc-600 text-[10px] mt-4">
                        No active automations.
                    </div>
                )}
                {rules.map((rule) => (
                    <div
                        key={rule.id}
                        className={`p-3 rounded-lg border flex items-center justify-between transition-all ${!rule.enabled ? "border-zinc-800 bg-zinc-900/50 opacity-50" : "border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40"
                            }`}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rule.enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                    {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                                </span>
                                <span className="text-xs font-bold truncate text-white">{rule.name}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                                {rule.conditions.length} Conditions -&gt; {rule.actions.length} Actions
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                            <button
                                onClick={() => toggleRule(rule.id)}
                                className={`p-1.5 rounded-full transition-colors ${rule.enabled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                            >
                                {rule.enabled ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            </button>
                            <button
                                onClick={() => deleteRule(rule.id)}
                                className="p-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
