import Link from "next/link";
import { ArrowRight, Activity, Zap, Shield, Globe } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#080a0c] text-white selection:bg-primary/30 overflow-hidden font-sans">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse-slow" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] mix-blend-screen opacity-40 animate-pulse-slow object-delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[150px] mix-blend-screen opacity-30" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                            <Activity className="w-4 h-4 text-black" />
                        </div>
                        <span className="text-sm font-black tracking-widest uppercase">ZenG Trade</span>
                    </div>
                    <Link
                        href="/terminal"
                        className="px-5 py-2 text-[10px] font-black tracking-widest uppercase bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all flex items-center gap-2 group"
                    >
                        Enter Terminal
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-bold tracking-widest shadow-[0_0_20px_-5px_rgba(0,229,255,0.4)]">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Next-Gen Trading Platform Live
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
                        Institutional Power.<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-purple-500">
                            Gen-Z Speed.
                        </span>
                    </h1>

                    <p className="text-zinc-400 max-w-2xl text-sm leading-relaxed md:text-base">
                        Experience the ultimate retail trading terminal. Zero latency WebWorkers, strictly-typed local execution, and a layout customizer engineered specifically for hyperscalpers and algorithmic architects.
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <Link
                            href="/terminal"
                            className="px-8 py-4 rounded-xl font-black tracking-widest uppercase text-xs text-black border-2 border-transparent bg-primary shadow-[0_0_40px_-5px_rgba(0,229,255,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3 relative overflow-hidden group"
                        >
                            <span className="relative z-10">Launch Web Terminal</span>
                            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </Link>
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm self-center">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Kite Connect Verified Partner</span>
                        </div>
                    </div>

                    {/* Feature Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-24 w-full text-left">
                        <FeatureCard
                            icon={<Zap className="w-5 h-5 text-yellow-400" />}
                            title="Institutional Blitz"
                            desc="Shatter high-volume execution blocks into micro-slices, bypassing standard network throttling algorithms seamlessly."
                            delay="delay-100"
                        />
                        <FeatureCard
                            icon={<Globe className="w-5 h-5 text-primary" />}
                            title="Worker Streaming"
                            desc="Native JS WebWorkers offload complex socket polling to a background thread, keeping the DOM rendering UI at a buttery 60fps."
                            delay="delay-200"
                        />
                        <FeatureCard
                            icon={<Shield className="w-5 h-5 text-emerald-400" />}
                            title="Titanium Strict-Types"
                            desc="Mathematical Zod validation architectures barricade API gateways, rejecting malformed 'fat-finger' execution requests instantly."
                            delay="delay-300"
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

function FeatureCard({ icon, title, desc, delay }: any) {
    return (
        <div className={`p-6 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md hover:bg-zinc-800/50 hover:border-white/10 transition-all group animate-in fade-in slide-in-from-bottom-4 duration-700 ${delay}`}>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-gradient-to-br from-white/5 to-transparent">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    );
}
