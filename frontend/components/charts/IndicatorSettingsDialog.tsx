import React, { useState, useEffect } from 'react';
import { Settings2, X } from 'lucide-react';
import { useDrawingStore, IndicatorConfig } from '@/hooks/useDrawingStore';

interface Props {
    indicatorId: string | null;
    onClose: () => void;
}

export const IndicatorSettingsDialog = ({ indicatorId, onClose }: Props) => {
    const { indicators, updateIndicator } = useDrawingStore();
    const [localConfig, setLocalConfig] = useState<IndicatorConfig | null>(null);

    useEffect(() => {
        if (indicatorId) {
            const ind = indicators.find(i => i.id === indicatorId);
            if (ind) setLocalConfig({ ...ind });
        }
    }, [indicatorId, indicators]);

    if (!indicatorId || !localConfig) return null;

    const handleSave = () => {
        if (localConfig) {
            updateIndicator(localConfig.id, localConfig);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-80 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                        <Settings2 size={16} className="text-muted-foreground" />
                        {localConfig.type} Settings
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col gap-4">
                    {/* Period Setting (For SMA, EMA, RSI) */}
                    {(localConfig.type === 'SMA' || localConfig.type === 'EMA' || localConfig.type === 'RSI') && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground font-medium">Length / Period</label>
                            <input
                                type="number"
                                value={localConfig.period}
                                onChange={e => setLocalConfig({ ...localConfig, period: parseInt(e.target.value) || 1 })}
                                className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    )}

                    {/* Source Setting */}
                    {(localConfig.type === 'SMA' || localConfig.type === 'EMA' || localConfig.type === 'RSI') && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-muted-foreground font-medium">Source</label>
                            <select
                                value={localConfig.settings?.source || 'close'}
                                onChange={e => setLocalConfig({ ...localConfig, settings: { ...localConfig.settings, source: e.target.value as any } })}
                                className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-blue-500"
                            >
                                <option value="close">Close</option>
                                <option value="open">Open</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    )}

                    {/* RSI Specific Bounds */}
                    {localConfig.type === 'RSI' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-zinc-400 font-medium">Overbought</label>
                                <input
                                    type="number"
                                    value={localConfig.settings?.overbought || 70}
                                    onChange={e => setLocalConfig({ ...localConfig, settings: { ...localConfig.settings, overbought: parseInt(e.target.value) || 70 } })}
                                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-zinc-400 font-medium">Oversold</label>
                                <input
                                    type="number"
                                    value={localConfig.settings?.oversold || 30}
                                    onChange={e => setLocalConfig({ ...localConfig, settings: { ...localConfig.settings, oversold: parseInt(e.target.value) || 30 } })}
                                    className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Color Setting */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-400 font-medium">Line Plot Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={localConfig.color}
                                onChange={e => setLocalConfig({ ...localConfig, color: e.target.value })}
                                className="w-8 h-8 rounded bg-transparent border-0 p-0 cursor-pointer"
                            />
                            <span className="text-sm font-mono text-zinc-300">{localConfig.color}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-3 bg-muted/30 border-t border-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                    >
                        Save Format
                    </button>
                </div>
            </div>
        </div>
    );
};
