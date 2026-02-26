"use client";

import React from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Zap, Shield, BarChart3, Activity } from "lucide-react";
import { AngelLoginForm } from "./AngelLoginForm";
import { FivePaisaLoginForm } from "./FivePaisaLoginForm";
import { useState } from "react";

export const LoginScreen = () => {
    const login = useAuthStore((s) => s.login);
    const setBroker = useAuthStore((s) => s.setBroker);
    const [showAngelLogin, setShowAngelLogin] = useState(false);
    const [show5PaisaLogin, setShow5PaisaLogin] = useState(false);

    // Handler for Angel Success
    const handleAngelSuccess = () => {
        setBroker("ANGEL");
        // Reload or redirect to ensure state is synced
        window.location.reload();
    };

    // Handler for 5Paisa Success
    const handle5PaisaSuccess = () => {
        setBroker("5PAISA");
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-[#050506] flex items-center justify-center relative overflow-hidden">
            {/* Background Grid */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Glow Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--primary)] rounded-full blur-[300px] opacity-[0.04]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[var(--up)] rounded-full blur-[200px] opacity-[0.03]" />

            <div className="relative z-10 flex flex-col items-center gap-10 max-w-md mx-auto px-6">
                {/* Logo */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[var(--up)] to-[var(--primary)] rounded-xl flex items-center justify-center shadow-[0_0_30px_color-mix(in_srgb,var(--up)_25%,transparent)]">
                            <Zap className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">
                                CYBER <span className="text-[var(--primary)]">TRADE</span>
                            </h1>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] font-mono">
                                Pro Trading Terminal
                            </p>
                        </div>
                    </div>
                </div>

                {/* Broker Grid */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <BrokerCard
                        name="Zerodha Kite"
                        status="Ready"
                        color="from-[#ff5722] to-[#ff8a65]"
                        icon={<Zap className="w-5 h-5" />}
                        onClick={login}
                    />
                    <BrokerCard
                        name="Upstox Pro"
                        status="Ready"
                        color="from-[#5e35b1] to-[#7e57c2]"
                        icon={<Activity className="w-5 h-5" />}
                        onClick={() => window.location.href = '/api/upstox/auth/login'}
                    />
                    <BrokerCard
                        name="Dhan"
                        status="Coming Soon"
                        color="from-[#7b1fa2] to-[#ab47bc]"
                        icon={<BarChart3 className="w-5 h-5" />}
                        disabled
                    />
                    <BrokerCard
                        name="Angel One"
                        status="Ready"
                        color="from-[#0277bd] to-[#29b6f6]"
                        icon={<Shield className="w-5 h-5" />}
                        onClick={() => setShowAngelLogin(true)}
                    />
                    <BrokerCard
                        name="Fyers"
                        status="Coming Soon"
                        color="from-[#00838f] to-[#26c6da]"
                        icon={<Activity className="w-5 h-5" />}
                        disabled
                    />
                    <BrokerCard
                        name="5Paisa"
                        status="Ready"
                        color="from-[#ef6c00] to-[#ff9800]"
                        icon={<Zap className="w-5 h-5" />}
                        onClick={() => setShow5PaisaLogin(true)}
                    />
                </div>

                <p className="text-[10px] text-zinc-600 text-center leading-relaxed max-w-xs mt-4">
                    Your credentials are encrypted locally and never shared with Cyber Trade.
                    Redirects to broker's secure login.
                </p>

                {/* Version */}
                <div className="flex items-center gap-2 text-[9px] text-zinc-700 font-mono">
                    <span>v0.4.0-universal</span>
                    <span>•</span>
                    <span>Multi-Broker Engine</span>
                </div>
            </div>

            {/* Angel One Login Modal */}
            {showAngelLogin && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <AngelLoginForm
                        onSuccess={handleAngelSuccess}
                        onCancel={() => setShowAngelLogin(false)}
                    />
                </div>
            )}

            {/* 5Paisa Login Modal */}
            {show5PaisaLogin && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <FivePaisaLoginForm
                        onSuccess={handle5PaisaSuccess}
                        onCancel={() => setShow5PaisaLogin(false)}
                    />
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
                    <span className="text-[9px] font-bold text-[var(--up)] bg-[var(--up)]/10 px-2 py-0.5 rounded-full border border-[var(--up)]/20 shadow-[0_0_10px_var(--up)]">
                        ONLINE
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
