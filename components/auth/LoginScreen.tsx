"use client";

import React from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Zap, Shield, BarChart3, Activity } from "lucide-react";
import { useState } from "react";

export const LoginScreen = () => {
    const login = useAuthStore((s) => s.login);
    const setBroker = useAuthStore((s) => s.setBroker);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden transition-colors duration-500">
            {/* Background Grid */}
            <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                    backgroundImage: `linear-gradient(currentColor 1px, transparent 1px),
                                      linear-gradient(90deg, currentColor 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Glow Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--primary)] rounded-full blur-[300px] opacity-[0.04]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--up)] rounded-full blur-[200px] opacity-[0.03]" />

            <div className="relative z-10 flex flex-col items-center gap-10 max-w-md mx-auto px-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[var(--up)] to-[var(--primary)] rounded-xl flex items-center justify-center shadow-[0_0_40px_color-mix(in_srgb,var(--up)_30%,transparent)]">
                        <Zap className="w-6 h-6 text-black" />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-2xl font-black text-foreground tracking-tight">
                            ZenG <span className="text-[var(--primary)]">TRADE</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-mono mt-1">
                            Pro Trading Terminal
                        </p>
                    </div>
                </div>

                {/* Broker Grid - Exclusive Focus */}
                <div className="flex justify-center w-full mt-4">
                    <div className="w-full max-w-xs">
                        <BrokerCard
                            name="Zerodha Kite"
                            status="Ready"
                            color="from-[#ff5722] to-[#ff8a65]"
                            icon={<Zap className="w-5 h-5" />}
                            onClick={login}
                        />
                    </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-xs mt-4">
                    Your credentials are encrypted locally and never shared with ZenG Trade.
                    Redirects to broker's secure login.
                </p>

                {/* Version */}
                <div className="flex flex-col items-center gap-2 text-[9px] text-muted-foreground/50 font-mono">
                    <div className="flex items-center gap-2">
                        <span>v0.4.0-kite</span>
                        <span>•</span>
                        <span>Kite Connect v3 Engine</span>
                    </div>
                    <span>Powered by deep market integration</span>
                </div>
            </div>
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
}

const BrokerCard = ({ name, status, color, icon, onClick, disabled }: BrokerCardProps) => {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg
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
            className={`relative group overflow-hidden rounded-xl border p-4 flex flex-col items-start gap-3 ${disabled
                ? "bg-white/[0.02] border-white/5 cursor-not-allowed opacity-60"
                : "bg-white/[0.05] border-white/10 hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
                }`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 ${!disabled && 'group-hover:opacity-10'} transition-opacity duration-500`} />

            <div className="flex items-center justify-between w-full pointer-events-none">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${color} text-white shadow-lg`}>
                    {icon}
                </div>
                {status === "Ready" ? (
                    <span className="text-[9px] font-bold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                        READY
                    </span>
                ) : (
                    <span className="text-[9px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                        SOON
                    </span>
                )}
            </div>

            <div className="flex flex-col items-start gap-0.5 z-10 pointer-events-none">
                <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors group-hover:text-glow">
                    {name}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium group-hover:text-[var(--primary)] transition-colors">
                    {disabled ? "Integration Pending" : "Initiate Link"}
                </span>
            </div>
        </button>
    );
};
