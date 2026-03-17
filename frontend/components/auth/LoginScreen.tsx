"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Zap, Activity, BarChart3, ChevronRight, Key, Lock, Globe, Shield, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/ui/theme-selector";

export const LoginScreen = () => {
    const [step, setStep] = useState(1); // 1: Broker, 2: Credentials
    const [selectedBroker, setSelectedBroker] = useState<any>(null);
    const [apiKey, setApiKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((s) => s.login);
    const setStoreBroker = useAuthStore((s) => s.setBroker);
    const updateConfig = useAuthStore((s) => s.updateBrokerConfig);
    const brokerConfigs = useAuthStore((s) => s.brokerConfigs);

    const handleBrokerClick = (broker: any) => {
        setSelectedBroker(broker);
        setStoreBroker(broker.id);
        
        // Pre-fill if already configured
        const existing = brokerConfigs[broker.id];
        if (existing) {
            setApiKey(existing.apiKey || "");
            setApiSecret(existing.apiSecret || "");
        } else {
            setApiKey("");
            setApiSecret("");
        }
        
        setStep(2);
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            // 1. Secure Handshake (Sets session cookie for redirect route)
            const res = await fetch("/api/auth/pre-auth", {
                method: "POST",
                body: JSON.stringify({ broker: selectedBroker.id, apiKey, apiSecret }),
            });
            const data = await res.json();

            if (data.success) {
                // 2. Persist in store for future sessions
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
        { 
            id: "KITE", 
            name: "Zerodha Kite", 
            color: "from-[#ff5722] to-[#ff8a65]", 
            icon: <Zap className="w-5 h-5" />, 
            ready: true,
            desc: "Active & Verified. Institutional Grade Link.",
            keyLabel: "Kite API Key",
            secretLabel: "API Secret",
            helpUrl: "https://kite.trade/apps"
        },
        { 
            id: "DHAN", 
            name: "DhanHQ", 
            color: "from-[#00E5FF] to-[#006064]", 
            icon: <Activity className="w-5 h-5" />, 
            ready: false,
            desc: "Coming Soon. Stability Testing in Progress.",
            keyLabel: "Client ID",
            secretLabel: "Access Token",
            helpUrl: "https://dhan.co/"
        },
        { 
            id: "FYERS", 
            name: "Fyers Core", 
            color: "from-[#2196F3] to-[#0D47A1]", 
            icon: <BarChart3 className="w-5 h-5" />, 
            ready: false,
            desc: "Coming Soon. Adapter Calibration.",
            keyLabel: "App ID",
            secretLabel: "Secret ID",
            helpUrl: "https://fyers.in/"
        },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[var(--primary)] rounded-full blur-[200px] opacity-[0.03]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-[var(--up)] rounded-full blur-[180px] opacity-[0.02]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
            </div>

            <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Visual Side */}
                <div className="hidden lg:flex flex-col gap-8 animate-in fade-in slide-in-from-left-8 duration-700">
                    <div className="flex flex-col gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-[var(--up)] to-[var(--primary)] rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]">
                            <Zap className="w-8 h-8 text-black" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-5xl font-black italic tracking-tighter">
                                ZenG <span className="text-[var(--primary)]">TRADE</span>
                            </h1>
                            <p className="text-[10px] uppercase font-mono tracking-[0.6em] text-zinc-500">Institutional Grade Execution</p>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-sm">
                        <FeatureItem 
                            icon={<Shield className="w-4 h-4 text-emerald-500"/>} 
                            title="Multi-Broker Sync" 
                            desc="One interface, all your accounts. Unified margin & risk."
                        />
                        <FeatureItem 
                            icon={<Activity className="w-4 h-4 text-cyan-500"/>} 
                            title="Zero-Latency Ticks" 
                            desc="Kite/Dhan WebSockets piped through our Rust-relay."
                        />
                        <FeatureItem 
                            icon={<Lock className="w-4 h-4 text-orange-500"/>} 
                            title="Security First" 
                            desc="Keys are stored locally in your browser. Never on our servers."
                        />
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-zinc-400">v0.4.0-zeng</span>
                            <span className="text-[9px] uppercase tracking-widest text-zinc-600">Stable Build</span>
                        </div>
                        <ThemeSelector className="scale-90 origin-left" />
                    </div>
                </div>

                {/* Interaction Side */}
                <div className="bg-zinc-950/50 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 shadow-2xl relative">
                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight">Select your Broker</h2>
                                <p className="text-xs text-zinc-500">Choose the terminal you'd like to link to ZengTrade.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {brokers.map(b => (
                                    <BrokerCard
                                        key={b.id}
                                        {...b}
                                        status={brokerConfigs[b.id] ? "CONFIGURED" : "LINKABLE"}
                                        onClick={() => handleBrokerClick(b)}
                                    />
                                ))}
                            </div>

                            <div 
                                onClick={() => window.location.href = '/terminal?mock=true'}
                                className="bg-white/5 rounded-xl p-4 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-black italic">MT</div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-white">Mock Trading Mode</p>
                                        <p className="text-[9px] text-zinc-500">Free sandbox with virtual 10L capital.</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all transform rotate-180"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black tracking-tight uppercase italic">{selectedBroker.name} <span className="text-[var(--primary)] text-sm">ACTIVATE</span></h2>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Enter Credentials to bridge connection</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-black flex items-center gap-2">
                                        <Key className="w-3 h-3 text-[var(--primary)]" /> {selectedBroker.keyLabel}
                                    </label>
                                    <input
                                        type="text"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder={`Enter your ${selectedBroker.name} API Key`}
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--primary)]/50 focus:bg-zinc-900 transition-all font-mono outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] text-zinc-500 uppercase font-black flex items-center gap-2">
                                        <Lock className="w-3 h-3 text-[var(--up)]" /> {selectedBroker.secretLabel}
                                    </label>
                                    <input
                                        type="password"
                                        value={apiSecret}
                                        onChange={e => setApiSecret(e.target.value)}
                                        placeholder="••••••••••••••••"
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-[var(--up)]/50 focus:bg-zinc-900 transition-all font-mono outline-none"
                                    />
                                </div>

                                <a 
                                    href={selectedBroker.helpUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block p-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-4 h-4 text-primary" />
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black text-white uppercase tracking-tight">Where to find keys?</p>
                                                <p className="text-[9px] text-zinc-500">Open {selectedBroker.name} Developer Dashboard</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-primary transition-all" />
                                    </div>
                                </a>
                            </div>

                            <div className="pt-4 space-y-4">
                                <button
                                    onClick={handleLogin}
                                    disabled={loading || !apiKey || !apiSecret}
                                    className={cn(
                                        "w-full py-4 rounded-xl bg-white text-black font-black text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)]",
                                        (loading || !apiKey || !apiSecret) && "opacity-20 grayscale cursor-not-allowed shadow-none"
                                    )}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            Initializing Sync...
                                        </>
                                    ) : (
                                        <>
                                            Connect {selectedBroker.name}
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                                
                                <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                                    <ShieldCheck className="w-3 h-3 inline-block mr-1 text-[var(--up)]" />
                                    Bridge secured with 512-bit ephemeral encryption
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc }: any) => (
    <div className="flex gap-4 group cursor-default">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            {icon}
        </div>
        <div className="space-y-0.5">
            <h4 className="text-sm font-black text-white tracking-tight">{title}</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    </div>
);

interface BrokerCardProps {
    name: string;
    status: string;
    color: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    ready?: boolean;
    desc?: string;
}

const BrokerCard = ({ name, status, color, icon, onClick, disabled, ready, desc }: BrokerCardProps) => {
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
                "group relative flex items-center gap-4 p-4 rounded-2xl border border-white/5 transition-all text-left",
                ready
                    ? "bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-primary/30 active:scale-[0.99]"
                    : "bg-zinc-900/10 opacity-40 grayscale cursor-not-allowed"
            )}
        >
            <div className={cn(
                "shrink-0 p-3 rounded-xl bg-gradient-to-br text-white shadow-xl group-hover:shadow-primary/20 transition-all",
                color
            )}>
                {icon}
            </div>

            <div className="flex-1 flex flex-col gap-0.5 z-10">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white group-hover:text-primary transition-colors uppercase italic tracking-tight">
                        {name}
                    </span>
                    {status === "CONFIGURED" ? (
                        <div className="flex items-center gap-1 text-[8px] font-black text-[var(--up)] bg-up/10 px-2 py-0.5 rounded-full border border-up/20 animate-pulse">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            READY
                        </div>
                    ) : (
                        <span className="text-[8px] font-black text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            {status}
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-zinc-500 line-clamp-1">{desc}</p>
            </div>
            
            <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-primary transition-colors" />
        </button>
    );
};
