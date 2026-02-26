"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Loader2, Zap, AlertCircle } from "lucide-react";

interface FivePaisaLoginFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const FivePaisaLoginForm = ({ onSuccess, onCancel }: FivePaisaLoginFormProps) => {
    const [clientCode, setClientCode] = useState("");
    const [password, setPassword] = useState("");
    const [dob, setDob] = useState(""); // 5Paisa often asks for DOB or PAN
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setSession = useAuthStore((s) => s.setSession);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/5paisa/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientCode, password, dob }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login Failed");
            }

            // Success
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
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-orange-600" />
                        <h2 className="text-lg font-bold text-white">5Paisa Login</h2>
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
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Client Code / Email</label>
                        <input
                            type="text"
                            value={clientCode}
                            onChange={(e) => setClientCode(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-600/50 transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-600/50 transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DOB (YYYYMMDD)</label>
                        <input
                            type="text"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-600/50 transition-colors"
                            placeholder="e.g. 19900101"
                            maxLength={8}
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
                            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-orange-700 to-orange-600 text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Secure Login"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
