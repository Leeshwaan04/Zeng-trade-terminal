"use client";

import React from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";
import { ChevronDown, Globe, TrendingUp } from "lucide-react";

export const IndicesSelector = () => {
    const tickers = useMarketStore(state => state.tickers);

    // Default selections
    const [selectedIndian, setSelectedIndian] = React.useState("NIFTY 50");
    const [selectedGlobal, setSelectedGlobal] = React.useState("GIFT NIFTY");

    return (
        <div className="flex items-center">
            {/* Indian Indices Dropdown */}
            <IndexDropdown
                label="IN"
                selected={selectedIndian}
                options={["NIFTY 50", "BANKNIFTY", "SENSEX", "FINNIFTY", "NIFTY IT", "NIFTY AUTO", "NIFTY METAL", "NIFTY NEXT 50"]}
                onSelect={setSelectedIndian}
                data={tickers}
            />

            <div className="h-6 w-px bg-white/10 mx-2" />

            {/* Global Indices Dropdown */}
            <IndexDropdown
                label="GL"
                icon={<Globe className="w-3 h-3 text-muted-foreground" />}
                selected={selectedGlobal}
                options={["GIFT NIFTY", "US 500", "NASDAQ", "DOW JONES", "NIKKEI 225", "DAX"]}
                onSelect={setSelectedGlobal}
                data={tickers}
            />
        </div>
    );
};

interface IndexDropdownProps {
    label: string;
    icon?: React.ReactNode;
    selected: string;
    options: string[];
    onSelect: (value: string) => void;
    data: Record<string, any>;
}

const IndexDropdown = ({ label, icon, selected, options, onSelect, data }: IndexDropdownProps) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const selectedData = data[selected];

    // Close on outside click
    React.useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Fallback data if unconnected
    const displayData = selectedData || {
        symbol: selected,
        last_price: 0,
        change_percent: 0
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded bg-zinc-900/50 border border-white/5 cursor-pointer select-none transition-all duration-200 group hover:border-primary/30 hover:bg-zinc-900",
                    isOpen && "border-primary/50 bg-zinc-900"
                )}
                role="button"
                tabIndex={0}
            >
                <div className="flex items-center gap-1.5 opacity-50 text-[10px] font-black tracking-wider text-muted-foreground uppercase border-r border-white/10 pr-2 mr-1">
                    {icon}
                    <span>{label}</span>
                </div>

                <div className="flex flex-col leading-none min-w-[80px]">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[70px]">{selected.replace("NIFTY 50", "NIFTY")}</span>
                        <ChevronDown className={cn("w-3 h-3 text-zinc-600 transition-transform duration-200", isOpen && "rotate-180")} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono text-white">
                            {selectedData ? selectedData.last_price.toFixed(2) : <span className="animate-pulse text-zinc-600">--.--</span>}
                        </span>
                        <span className={cn("text-[9px] font-mono", !selectedData ? "text-zinc-600" : selectedData.change_percent >= 0 ? "text-up" : "text-down")}>
                            {selectedData ? (selectedData.change_percent >= 0 ? "+" : "") + selectedData.change_percent.toFixed(2) + "%" : "WAITING"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Dropdown Menu */}
            <div className={cn(
                "absolute top-full left-0 mt-2 w-48 bg-zinc-950 border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden transition-all duration-200 origin-top-left",
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            )}>
                {options.map((opt) => {
                    const itemData = data[opt];
                    if (!itemData) return null;
                    return (
                        <div
                            key={opt}
                            onClick={() => { onSelect(opt); setIsOpen(false); }}
                            className="flex items-center justify-between px-3 py-2 text-[10px] hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                        >
                            <span className={cn("font-bold tracking-tight", selected === opt ? "text-primary" : "text-zinc-400")}>
                                {opt}
                            </span>
                            <div className="flex flex-col items-end leading-none">
                                <span className="text-zinc-200 font-mono">{itemData.last_price.toFixed(2)}</span>
                                <span className={cn("text-[9px]", itemData.change_percent >= 0 ? "text-up" : "text-down")}>
                                    {itemData.change_percent >= 0 ? "+" : ""}{itemData.change_percent.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
