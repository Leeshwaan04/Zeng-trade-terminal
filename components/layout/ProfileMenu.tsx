"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, CreditCard, LogOut, Keyboard, Settings, ChevronRight, UserCircle } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useAuthStore, GrowwUser } from "@/hooks/useAuthStore";
import { cn } from "@/lib/utils";

export const ProfileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { setSettingsOpen } = useLayoutStore();
    const { user, logout, activeBroker, setBroker, setGrowwSession, growwAccessToken } = useAuthStore();

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleSettingsClick = () => {
        setSettingsOpen(true);
        setIsOpen(false);
    };

    const handleLogout = () => {
        logout();
        setIsOpen(false);
    };

    const handleSwitchBroker = (broker: "KITE" | "GROWW") => {
        const isMock = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === 'true';

        if (broker === "GROWW" && !growwAccessToken && !isMock) {
            const token = prompt("Enter Groww Access Token (valid for 24h):");
            if (token) {
                const growwUser: GrowwUser = {
                    user_id: "GROWW-USER",
                    user_name: "Groww Trader",
                    email: "trader@groww.io",
                    broker: "GROWW"
                };
                setGrowwSession(growwUser, token);
            }
        } else {
            if (broker === "GROWW" && isMock && !growwAccessToken) {
                // Set a fake session in mock mode to allow testing UI
                setGrowwSession({
                    user_id: "GROWW-TEST",
                    user_name: "Mock Groww",
                    email: "mock@groww.io",
                    broker: "GROWW"
                }, "mock-token");
            } else {
                setBroker(broker);
            }
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-8 w-8 rounded-full border transition-all flex items-center justify-center bg-black/40",
                    isOpen
                        ? "border-primary ring-2 ring-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        : "border-white/10 hover:border-primary/40 hover:shadow-lg"
                )}
            >
                {user && 'user_shortname' in user && user.user_shortname ? (
                    <span className="text-[10px] font-black text-primary">{user.user_shortname.substring(0, 2).toUpperCase()}</span>
                ) : (
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                )}
            </button>

            {/* Dropdown */}
            <div
                className={cn(
                    "absolute top-full right-0 mt-2 w-60 bg-[#111318] border border-white/[0.08] rounded-lg shadow-2xl z-50 overflow-hidden origin-top-right transition-all duration-200",
                    isOpen
                        ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                )}
            >
                <div className="p-3 border-b border-white/[0.05] bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <span className="text-xs font-black text-primary uppercase">
                                {('user_shortname' in (user || {}) ? (user as any)?.user_shortname : user?.user_name)?.substring(0, 2) || "PT"}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-black text-white truncate">{user?.user_name || "Pro Trader"}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">{user?.email || `ID: ${user?.user_id || "TRAD-001"}`}</div>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-tighter">
                            ENTERPRISE PRO
                        </div>
                        <div className="flex-1" />
                        <div className="text-[10px] font-bold text-up">₹5,40,231.00</div>
                    </div>
                </div>

                <div className="p-3 bg-white/[0.03] border-b border-white/[0.05]">
                    <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-2 opacity-60">Trading Broker</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => handleSwitchBroker("KITE")}
                            className={cn(
                                "py-2 rounded border text-[9px] font-black transition-all uppercase tracking-tighter",
                                activeBroker === "KITE"
                                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                    : "bg-black/40 border-white/10 text-zinc-500 hover:border-white/20"
                            )}
                        >
                            Kite Zerodha
                        </button>
                        <button
                            onClick={() => handleSwitchBroker("GROWW")}
                            className={cn(
                                "py-2 rounded border text-[9px] font-black transition-all uppercase tracking-tighter",
                                activeBroker === "GROWW"
                                    ? "bg-groww/20 border-groww text-groww shadow-[0_0_8px_rgba(0,186,173,0.3)]"
                                    : "bg-black/40 border-white/10 text-zinc-500 hover:border-white/20"
                            )}
                        >
                            Groww Trade
                        </button>
                    </div>
                </div>

                <div className="p-2 space-y-0.5">
                    <MenuItem icon={User} label="My Profile" onClick={() => { }} />
                    <MenuItem icon={CreditCard} label="Funds & Ledger" onClick={() => { }} />
                    <MenuItem icon={Settings} label="Interface Settings" onClick={handleSettingsClick} />
                    <MenuItem icon={Keyboard} label="Global Shortcuts" onClick={() => { }} />
                </div>

                <div className="p-2 border-t border-white/5 bg-white/2 mt-1">
                    <MenuItem
                        icon={LogOut}
                        label="Log Out System"
                        destructive
                        onClick={handleLogout}
                    />
                </div>
            </div>
        </div>
    );
};

const MenuItem = ({ icon: Icon, label, onClick, destructive }: { icon: any, label: string, onClick: () => void, destructive?: boolean }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all",
            destructive
                ? "text-down hover:bg-down/10 hover:text-down"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
        )}
    >
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1 text-left whitespace-nowrap">{label}</span>
        {!destructive && <ChevronRight className="w-3 h-3 opacity-30 ml-2" />}
    </button>
);
