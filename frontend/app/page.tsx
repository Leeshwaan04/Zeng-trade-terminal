import Link from "next/link";
import {
    ArrowRight, Activity, Zap, Shield, ChevronDown, BarChart3,
    CandlestickChart, Layers, Gauge, LayoutGrid, LineChart,
    KeyRound, MousePointerClick, Wallet, Lock, EyeOff, Ban, Undo2
} from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#080a0c] text-white selection:bg-primary/30 font-sans overflow-x-hidden overflow-y-auto h-screen">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] mix-blend-screen opacity-40" />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                            <Activity className="w-4 h-4 text-black" />
                        </div>
                        <span className="text-sm font-black tracking-widest uppercase">ZenG Trade</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-[11px] font-bold tracking-widest uppercase text-zinc-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                        <a href="#security" className="hover:text-white transition-colors">Security</a>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                    </div>
                    <Link
                        href="/terminal"
                        className="px-5 py-2 text-[10px] font-black tracking-widest uppercase bg-primary text-black hover:brightness-110 rounded-lg transition-all flex items-center gap-2 group shadow-[0_0_20px_-5px_rgba(0,229,255,0.5)]"
                    >
                        Launch Terminal
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <header className="relative z-10 pt-24 pb-16 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col items-center text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-bold tracking-widest">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Built for NSE F&amp;O · Powered by Kite Connect
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
                        Your Zerodha account.
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-purple-500">
                            A professional cockpit.
                        </span>
                    </h1>

                    <p className="text-zinc-400 max-w-2xl text-sm md:text-base leading-relaxed">
                        Option chain with live Greeks, strategy payoffs with probability of profit,
                        institutional-style OI analytics and a risk engine that can flatten every
                        position in one click — all on top of the broker account you already trust.
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                        <Link
                            href="/terminal"
                            className="px-8 py-4 rounded-xl font-black tracking-widest uppercase text-xs text-black bg-primary shadow-[0_0_40px_-5px_rgba(0,229,255,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                        >
                            Launch Web Terminal
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <a
                            href="#how-it-works"
                            className="px-6 py-4 rounded-xl font-bold tracking-widest uppercase text-[11px] text-zinc-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-all flex items-center gap-2"
                        >
                            See how it works
                            <ChevronDown className="w-3.5 h-3.5" />
                        </a>
                    </div>

                    {/* Trust strip — honest, feature-true claims only */}
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                        <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /> Official Kite Connect APIs</span>
                        <span className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-emerald-400" /> We never hold your funds</span>
                        <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5 text-amber-400" /> Keys in httpOnly cookies, never sold</span>
                    </div>
                </div>
            </header>

            {/* Feature story */}
            <section id="features" className="relative z-10 px-6 py-20 max-w-7xl mx-auto scroll-mt-20">
                <SectionHeading
                    kicker="The Terminal"
                    title="Everything an options trader checks, on one screen"
                    sub="Stop alt-tabbing between your broker, an analytics site and a charting tab. ZenG Trade puts the whole expiry-day workflow in a single drag-and-drop workspace."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-12">
                    <FeatureCard
                        icon={<Layers className="w-5 h-5 text-primary" />}
                        title="Option Chain + Live Greeks"
                        desc="Strike-wise OI, IV and delta/gamma/theta/vega computed live. Spot a setup and add legs to your strategy directly from the chain."
                    />
                    <FeatureCard
                        icon={<LineChart className="w-5 h-5 text-purple-400" />}
                        title="Payoff with Probability of Profit"
                        desc="Multi-leg payoff curves with breakevens, max profit/loss and POP — simulate IV crush and time decay before you commit margin."
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-5 h-5 text-sky-400" />}
                        title="OI Analytics Suite"
                        desc="PCR trends, max pain, buildup scanner and OI heatmaps — the institutional positioning picture, updated through the session."
                    />
                    <FeatureCard
                        icon={<CandlestickChart className="w-5 h-5 text-emerald-400" />}
                        title="Pro Charting"
                        desc="Candles with EMA, VWAP, RSI, MACD, Bollinger and Supertrend overlays — rendered on a custom canvas engine built for tick streams."
                    />
                    <FeatureCard
                        icon={<Gauge className="w-5 h-5 text-red-400" />}
                        title="Risk Engine + Panic Flatten"
                        desc="Set max daily loss and position caps that gate every order. One click cancels all working orders and exits every position."
                    />
                    <FeatureCard
                        icon={<LayoutGrid className="w-5 h-5 text-amber-400" />}
                        title="Workspaces, your way"
                        desc="Drag, resize and save layouts per strategy. Preset desks for options, scalping and analysis. ⌘K command palette for everything."
                    />
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="relative z-10 px-6 py-20 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
                <SectionHeading
                    kicker="Getting started"
                    title="Three steps. Your account stays yours."
                    sub="ZenG Trade is not a broker. You connect your own Zerodha account through Kite Connect — Zerodha's official API platform — and stay in control end to end."
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                    <StepCard
                        n="01"
                        icon={<KeyRound className="w-5 h-5 text-primary" />}
                        title="Create your Kite Connect app"
                        desc={<>On <a className="text-primary underline underline-offset-2" href="https://kite.trade/apps" target="_blank" rel="noopener noreferrer">kite.trade</a>, create an app to get your personal API key and secret. Kite Connect is a Zerodha subscription (₹500/month, billed by Zerodha — not by us).</>}
                    />
                    <StepCard
                        n="02"
                        icon={<Lock className="w-5 h-5 text-emerald-400" />}
                        title="Connect securely"
                        desc={<>Enter your API key in the terminal, then log in on Zerodha&apos;s own page. We never see your Zerodha password — the OAuth handshake happens directly with Kite.</>}
                    />
                    <StepCard
                        n="03"
                        icon={<MousePointerClick className="w-5 h-5 text-purple-400" />}
                        title="Trade with an edge"
                        desc={<>Live quotes stream in, your portfolio syncs, and every order goes through your own risk rules before it reaches the exchange.</>}
                    />
                </div>
            </section>

            {/* Security */}
            <section id="security" className="relative z-10 px-6 py-20 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
                <SectionHeading
                    kicker="Security model"
                    title="Designed so you don't have to trust us"
                    sub="The safest credential is the one we never receive. Here is exactly what we do — and can't do — with your account."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-12">
                    <FeatureCard
                        icon={<EyeOff className="w-5 h-5 text-primary" />}
                        title="No password, ever"
                        desc="Login happens on Zerodha's page. Your password never touches our servers."
                    />
                    <FeatureCard
                        icon={<Lock className="w-5 h-5 text-emerald-400" />}
                        title="httpOnly sessions"
                        desc="Access tokens live in httpOnly cookies — unreadable to page scripts — and expire daily per Kite policy."
                    />
                    <FeatureCard
                        icon={<Ban className="w-5 h-5 text-red-400" />}
                        title="Funds can't move out"
                        desc="Kite Connect APIs cannot withdraw money. Worst case, the API trades — it can never transfer funds anywhere."
                    />
                    <FeatureCard
                        icon={<Undo2 className="w-5 h-5 text-amber-400" />}
                        title="Revoke any time"
                        desc="Delete your app on kite.trade and every token dies instantly. You hold the kill switch, not us."
                    />
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="relative z-10 px-6 py-20 max-w-3xl mx-auto border-t border-white/5 scroll-mt-20">
                <SectionHeading
                    kicker="FAQ"
                    title="Fair questions"
                    sub=""
                />
                <div className="pt-10 space-y-3">
                    <Faq q="Is ZenG Trade a broker?" a="No. ZenG Trade is a trading terminal that connects to your existing Zerodha account through Kite Connect, Zerodha's official API platform. Your funds, holdings and orders always remain with your broker." />
                    <Faq q="What do I need to start?" a="A Zerodha account and a Kite Connect app (API key + secret), which you create on kite.trade. Kite Connect is billed by Zerodha at ₹500/month. Support for more brokers (Dhan, Fyers) is in progress." />
                    <Faq q="What does ZenG Trade cost?" a="The terminal is free while we're in early access. Advanced analytics and automation tiers will be announced — early users keep preferential pricing." />
                    <Faq q="Where are my API keys stored?" a="Your access token is kept in an httpOnly cookie that page JavaScript cannot read, and sessions expire daily in line with Kite's token policy. Keys are used solely to talk to Kite on your behalf — never shared or sold." />
                    <Faq q="Is automated trading allowed in India?" a="SEBI permits retail algo trading through registered, broker-approved channels. Our automation features are being built to operate within that framework — strategy rules run with explicit safeguards like paper mode, max-loss caps and panic flatten." />
                    <Faq q="What happens if ZenG Trade goes down mid-session?" a="Your orders and positions live at your broker, not with us. You can always manage them directly from Kite. Our risk engine settings are protective gates, not custodians of your positions." />
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 px-6 py-24 max-w-7xl mx-auto border-t border-white/5">
                <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 p-10 md:p-16 text-center space-y-6">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
                        The market opens at <span className="text-primary">9:15</span>.
                        <br />Be ready before it does.
                    </h2>
                    <p className="text-zinc-400 text-sm max-w-xl mx-auto">
                        Set up your desk tonight — watchlist, chain, payoff and risk caps —
                        and start tomorrow&apos;s session with everything in place.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/terminal"
                            className="inline-flex px-8 py-4 rounded-xl font-black tracking-widest uppercase text-xs text-black bg-primary shadow-[0_0_40px_-5px_rgba(0,229,255,0.5)] transition-all hover:scale-105 active:scale-95 items-center gap-3"
                        >
                            Launch Web Terminal
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                                <Activity className="w-3.5 h-3.5 text-black" />
                            </div>
                            <span className="text-xs font-black tracking-widest uppercase">ZenG Trade</span>
                        </div>
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-bold tracking-widest uppercase text-zinc-500">
                            <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
                            <a href="#security" className="hover:text-zinc-300 transition-colors">Security</a>
                            <a href="#faq" className="hover:text-zinc-300 transition-colors">FAQ</a>
                            <Link href="/terminal" className="hover:text-zinc-300 transition-colors">Terminal</Link>
                            <a href="mailto:support@zengtrade.in" className="hover:text-zinc-300 transition-colors">Contact</a>
                        </div>
                    </div>
                    <div className="text-[10px] leading-relaxed text-zinc-600 max-w-4xl space-y-2">
                        <p>
                            <strong className="text-zinc-500">Risk disclosure:</strong> Trading in equity derivatives involves substantial risk.
                            Futures and options are leveraged products and can result in losses exceeding your initial capital.
                            ZenG Trade provides software tooling only and does not provide investment advice, research recommendations
                            or portfolio management services. ZenG Trade is not a SEBI-registered broker, investment adviser or research analyst.
                            All orders are executed by your own broker under your own account and authority.
                        </p>
                        <p>© {new Date().getFullYear()} ZenG Trade · Made in India 🇮🇳 · Zerodha and Kite are trademarks of Zerodha Broking Ltd.; ZenG Trade is an independent product built on the public Kite Connect API.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function SectionHeading({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
    return (
        <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="text-[10px] font-black tracking-[0.35em] uppercase text-primary">{kicker}</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter">{title}</h2>
            {sub ? <p className="text-sm text-zinc-400 leading-relaxed">{sub}</p> : null}
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md hover:bg-zinc-800/50 hover:border-white/10 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    );
}

function StepCard({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: React.ReactNode }) {
    return (
        <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
            <div className="absolute top-5 right-6 text-4xl font-black text-white/5 select-none">{n}</div>
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">{icon}</div>
            <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
        </div>
    );
}

function Faq({ q, a }: { q: string; a: string }) {
    return (
        <details className="group rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-md open:border-primary/20 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer list-none px-5 py-4 text-sm font-bold text-zinc-200">
                {q}
                <ChevronDown className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform shrink-0 ml-4" />
            </summary>
            <p className="px-5 pb-5 text-xs text-zinc-400 leading-relaxed">{a}</p>
        </details>
    );
}
