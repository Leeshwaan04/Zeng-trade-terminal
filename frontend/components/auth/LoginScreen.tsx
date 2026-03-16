"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Zap, Shield, BarChart3, Activity, Key, Lock, Globe, ChevronRight, X as CloseIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/ui/theme-selector";

export const LoginScreen = () => {
    const [selectedBroker, setSelectedBroker] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((s) => s.login);
    const setStoreBroker = useAuthStore((s) => s.setBroker);
    const updateConfig = useAuthStore((s) => s.updateBrokerConfig);

    const handleBrokerClick = (broker: any) => {
        setSelectedBroker(broker);
        setStoreBroker(broker.id);
        setIsModalOpen(true);
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            // 1. Secure Handshake
            const res = await fetch("/api/auth/pre-auth", {
                method: "POST",
                body: JSON.stringify({ broker: selectedBroker.id, apiKey, apiSecret }),
            });
            const data = await res.json();

            if (data.success) {
                // 2. Persist in store (for client-side reference if needed)
                updateConfig(selectedBroker.id, { apiKey, apiSecret });
                // 3. Initiate Auth Redirect
                login();
            }
        } catch (e) {
            console.error("Login Handshake Failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const brokers = [
        { id: "KITE", name: "Zerodha Kite", color: "from-[#ff5722] to-[#ff8a65]", icon: <Zap className="w-5 h-5" />, ready: true },
        { id: "DHAN", name: "DhanHQ", color: "from-[#00E5FF] to-[#006064]", icon: <Activity className="w-5 h-5" />, ready: true },
        { id: "FYERS", name: "Fyers Core", color: "from-[#2196F3] to-[#0D47A1]", icon: <BarChart3 className="w-5 h-5" />, ready: true },
    ];

    return (
        <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden transition-colors duration-500">
            {/* Background Grid */}
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: `linear-gradient(currentColor 1px, transparent 1px),
                                      linear-gradient(90deg, currentColor 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                    color: "var(--primary)"
                }}
            />

            {/* Glow Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--primary)] rounded-full blur-[300px] opacity-[0.08]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--up)] rounded-full blur-[200px] opacity-[0.05]" />

            <div className="relative z-10 flex flex-col items-center gap-10 max-w-lg mx-auto px-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--up)] to-[var(--primary)] rounded-2xl flex items-center justify-center shadow-[0_0_60px_rgba(var(--primary-rgb),0.3)]">
                        <Zap className="w-8 h-8 text-black" />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-4xl font-black text-white tracking-tight italic">
                            ZenG <span className="text-[var(--primary)]">TRADE</span>
                        </h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.5em] font-mono mt-2">
                            GOD-MODE TRADING TERMINAL
                        </p>
                    </div>
                </div>

                {/* Broker Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                    {brokers.map(b => (
                        <BrokerCard
                            key={b.id}
                            name={b.name}
                            status="Linkable"
                            color={b.color}
                            icon={b.icon}
                            onClick={() => handleBrokerClick(b)}
                            ready={b.ready}
                        />
                    ))}
                </div>

                <p className="text-[9px] text-zinc-500 text-center leading-relaxed max-w-xs mt-4 uppercase tracking-widest opacity-50">
                    <Shield className="w-3 h-3 inline-block mr-1 text-[var(--up)]" />
                    AES-256 SESSION ENCRYPTION ENABLED
                </p>

                {/* Version + Theme Switcher */}
                <div className="flex flex-col items-center gap-3 text-[9px] text-zinc-600 font-mono">
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--primary)] font-bold">BYOK-PROTOCOL v2.1</span>
                        <span>•</span>
                        <span>Multi-Broker Engine</span>
                    </div>
                    <ThemeSelector className="mt-2" />
                </div>
            </div>

            {/* Credential Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-[#050505] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
                        {/* Modal Header */}
                        <div className={`h-1 bg-gradient-to-r ${selectedBroker?.color}`} />
                        <div className="p-6 flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedBroker?.color} text-black font-bold`}>
                                        {selectedBroker?.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">LINK {selectedBroker?.name}</h2>
                                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Enterprise API Integration</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <CloseIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] text-zinc-500 uppercase font-black flex items-center gap-2">
                                        <Key className="w-3 h-3 text-[var(--primary)]" /> App API Key
                                    </label>
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="Ex: kite_app_production_..."
                                        className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[var(--primary)]/30 transition-all font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] text-zinc-500 uppercase font-black flex items-center gap-2">
                                        <Lock className="w-3 h-3 text-[var(--up)]" /> App Secret Key
                                    </label>
                                    <input
                                        type="password"
                                        value={apiSecret}
                                        onChange={e => setApiSecret(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[var(--up)]/30 transition-all font-mono"
                                    />
                                </div>

                                <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 flex items-start gap-3">
                                    <Globe className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[8px] text-zinc-400 leading-normal uppercase font-bold tracking-tight">Callback URI Configuration</p>
                                        <p className="text-[10px] text-zinc-600 font-mono break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogin}
                                disabled={loading || !apiKey || !apiSecret}
                                className={cn(
                                    "w-full py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]",
                                    (loading || !apiKey || !apiSecret) && "opacity-30 grayscale cursor-not-allowed"
                                )}
                            >
                                {loading ? "Syncing Handshake..." : "Initiate Secure Link"}
                                {!loading && <ChevronRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface BrokerCardProps {
    name: string;
    status: string;
    color: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    ready?: boolean;
}

const BrokerCard = ({ name, status, color, icon, onClick, disabled, ready }: BrokerCardProps) => {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => {
        setRotate({ x: 0, y: 0 });
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
                transition: "transform 0.1s ease-out"
            }}
            className={cn(
                "group relative flex flex-col p-4 rounded-xl border border-border transition-all text-left",
                ready
                    ? "bg-[#0A0A0A] hover:bg-zinc-900 hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98]"
                    : "bg-zinc-900/50 opacity-50 grayscale cursor-not-allowed"
            )}
        >
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500",
                color,
                !disabled && "group-hover:opacity-5"
            )} />

            <div className="flex items-center justify-between w-full pointer-events-none mb-4">
                <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-br text-white shadow-lg",
                    color
                )}>
                    {icon}
                </div>
                {status === "Linkable" ? (
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                        LINKABLE
                    </span>
                ) : (
                    <span className="text-[9px] font-medium text-zinc-600 bg-zinc-900/50 px-2 py-0.5 rounded-full">
                        SOON
                    </span>
                )}
            </div>

            <div className="flex flex-col items-start gap-0.5 z-10 pointer-events-none">
                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                    {name}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium group-hover:text-primary/70 transition-colors">
                    {disabled ? "Integration Pending" : "Initiate Link"}
                </span>
            </div>
        </button>
    );
};
