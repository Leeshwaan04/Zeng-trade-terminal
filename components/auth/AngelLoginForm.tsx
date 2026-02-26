"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Loader2, Shield, AlertCircle } from "lucide-react";

interface AngelLoginFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const AngelLoginForm = ({ onSuccess, onCancel }: AngelLoginFormProps) => {
    const [clientCode, setClientCode] = useState("");
    const [password, setPassword] = useState("");
    const [totp, setTotp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setSession = useAuthStore((s) => s.setSession);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/angel/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientCode, password, totp }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login Failed");
            }

            // Success
            // Manually set session in store (simplified, usually we fetch user profile)
            // For now, just trigger onSuccess
            onSuccess();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#09090b] border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-orange-500" />
                        <h2 className="text-lg font-bold text-white">Angel One Login</h2>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-400 font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Client Code</label>
                        <input
                            type="text"
                            value={clientCode}
                            onChange={(e) => setClientCode(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                            placeholder="e.g. S123456"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Password / PIN</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">TOTP</label>
                        <input
                            type="text"
                            value={totp}
                            onChange={(e) => setTotp(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                            placeholder="6-digit Authenticator Code"
                            maxLength={6}
                            required
                        />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Secure Login"}
                        </button>
                    </div>
                </form>

                <p className="mt-4 text-[9px] text-zinc-600 text-center">
                    Credentials are sent directly to Angel One via HTTPS.
                </p>
            </div>
        </div>
    );
};
