"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Settings, Terminal, LogOut, LayoutGrid, Settings2, ShieldCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { MARKET_INSTRUMENTS } from "@/lib/market-config";
import { LayoutManager } from "@/components/layout/LayoutManager";
import { WorkspaceTabs } from "@/components/layout/WorkspaceTabs";
import { WidgetPicker } from "@/components/layout/WidgetPicker";
import { ToolsMenu } from "@/components/layout/ToolsMenu";
import { LayoutCustomizer } from "@/components/layout/LayoutCustomizer";
import { CommandCenter } from "@/components/ui/command-center";
import { GlobalHotkeys } from "@/components/trading/GlobalHotkeys";
import { useLayoutSwipe } from "@/hooks/useLayoutSwipe";
import { useAccountSync } from "@/hooks/useAccountSync";
import { PnLTicker } from "@/components/trading/PnLTicker";
import { MarketSentiment } from "@/components/trading/MarketSentiment";
import { SettingsDialog } from "@/components/ui/settings-dialog";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { AuthInitializer } from "@/components/auth/AuthInitializer";
import { IndicesTicker } from "@/components/market/IndicesTicker";
import { SafetyToggle } from "@/components/layout/SafetyToggle";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { Toaster } from "@/components/ui/toaster";
import { MobileNavBar } from "@/components/layout/MobileNavBar";
import { CursorFollower } from "@/components/ui/CursorFollower";
import { PiPWindow } from "@/components/charts/PiPWindow";
import { AccountManager } from "@/components/trading/AccountManager";
import { HeaderGuide } from "@/components/layout/HeaderGuide";
import { useSafetyStore } from "@/hooks/useSafetyStore";

const INSTRUMENT_TOKENS = MARKET_INSTRUMENTS.map(i => i.token);

export default function AppShell() {
    const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const [isLayoutCustomizerOpen, setIsLayoutCustomizerOpen] = useState(false);

    // Connect to Kite WebSocket for live data
    useKiteTicker({
        instrumentTokens: INSTRUMENT_TOKENS
    });

    useLayoutSwipe();
    useAccountSync();

    const searchParams = useSearchParams();
    const isLoggedInBase = useAuthStore(state => state.isLoggedIn);
    const testAuth = searchParams.get('testAuth');
    const isLoggedIn = isLoggedInBase || testAuth === '1';
    const user = useAuthStore(state => state.user);
    const { connectionStatus, unifiedMargin, metrics } = useMarketStore();
    const { activeBroker } = useAuthStore();
    const {
        setCommandCenterOpen,
        setSettingsOpen,
        setActiveWorkspace,
        accountManagerHeight,
        setAccountManagerHeight,
        isAccountManagerOpen,
        toggleAccountManager
    } = useLayoutStore();

    const [isResizing, setIsResizing] = useState(false);
    const { isArmed } = useSafetyStore();

    useEffect(() => {
        const layoutParam = searchParams.get('layout');
        if (layoutParam && (layoutParam === 'algo' || layoutParam === 'algorithmic')) {
            setActiveWorkspace('algorithmic');
        }

        // Pre-fetch instruments to hydrate cache
        fetch('/api/kite/instruments').catch(() => { });
    }, [searchParams, setActiveWorkspace]);

    if (!isLoggedIn) {
        return (
            <>
                <AuthInitializer />
                <LoginScreen />
            </>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden selection:bg-primary/30 selection:text-primary relative font-sans">
            {/* ─── Global Background Effects ─── */}
            <div className={cn(
                "absolute inset-0 mesh-gradient z-0 transition-colors duration-1000",
                isArmed ? "bg-red-500/10" : "bg-primary/5 dark:bg-primary/5"
            )} />

            <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] dark:opacity-[0.05] pointer-events-none z-0 mix-blend-overlay" />
            <div className="absolute top-[-10%] left-[10%] w-[800px] h-[800px] bg-primary/5 dark:bg-primary/5 rounded-full blur-[180px] pointer-events-none z-0 animate-pulse-slow" />

            {isArmed && (
                <div className="absolute inset-0 border-[6px] border-red-600/15 dark:border-red-500/10 pointer-events-none z-50 animate-pulse-glow" />
            )}

            <PiPWindow />
            <AuthInitializer />
            <GlobalHotkeys />
            <CursorFollower />
            <CommandCenter />
            <SettingsDialog />
            <Toaster />

            {/* Mission Control Header - CPO Innovation */}
            <div className="pt-3 px-3 w-full shrink-0 z-30">
                <header data-testid="app-header" className={cn(
                    "h-[52px] rounded-2xl border flex items-center justify-between bg-background/60 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
                    "shadow-[0_16px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.2)]",
                    isArmed
                        ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-500/10 dark:bg-red-950/20"
                        : "border-border/40 dark:border-border/10"
                )}>
                    {/* Inner Edge Highlight */}
                    <div className="absolute inset-0 rounded-2xl border border-border/10 pointer-events-none" />

                    {/* ZONE ALPHA: Identity & Flow Control */}
                    <div className="flex items-center h-full min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 px-4 shrink-0 group cursor-pointer border-r border-border h-full transition-colors hover:bg-surface-3 relative">
                            <HeaderGuide />
                            <div className="w-6 h-6 bg-gradient-to-br from-[var(--up)] to-[var(--primary)] rounded-md flex items-center justify-center shadow-[0_0_15px_color-mix(in_srgb,var(--up)_20%,transparent)] relative z-10">
                                <Terminal className="w-3.5 h-3.5 text-black" />
                            </div>
                            <div className="flex flex-col justify-center relative z-10">
                                <span className="text-[12px] font-black tracking-tight text-foreground leading-none">ZenG</span>
                                <span className="text-[8px] font-black text-primary/80 dark:text-primary uppercase tracking-[0.2em] mt-0.5 leading-none">TERMINAL</span>
                            </div>
                            {/* Zone Marker Alpha */}
                            <div className="absolute top-0 right-0 w-[2px] h-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {/* Workspace Navigation */}
                        <div className="flex-1 min-w-0 h-full flex items-center overflow-hidden">
                            <WorkspaceTabs onAddClick={() => setIsLayoutCustomizerOpen(true)} />
                        </div>
                    </div>

                    {/* ZONE SIGMA: Intelligence & Vitals */}
                    <div className="hidden xl:flex items-center gap-2 px-4 h-full border-x border-border bg-muted/20 overflow-hidden relative group/sigma">
                        <div className="flex items-center gap-4 px-2">
                            <div className="flex flex-col items-center">
                                <PnLTicker />
                            </div>
                            <div className="h-6 w-[1px] bg-border/20 mx-1" />
                            <MarketSentiment />
                        </div>

                        {/* Live Connection Status Dot */}
                        <div className="flex items-center gap-1.5 ml-2">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                                connectionStatus === 'CONNECTED' ? "bg-up shadow-[0_0_6px_var(--up)] animate-pulse" :
                                    connectionStatus === 'CONNECTING' ? "bg-yellow-400 animate-pulse" :
                                        "bg-down/60"
                            )} />
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest transition-colors",
                                connectionStatus === 'CONNECTED' ? "text-up" :
                                    connectionStatus === 'CONNECTING' ? "text-yellow-400" :
                                        "text-muted-foreground"
                            )}>
                                {connectionStatus === 'CONNECTED' ? 'Live' : connectionStatus === 'CONNECTING' ? 'Sync' : 'Offline'}
                            </span>
                        </div>

                        {/* System Pulse Indicator */}
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-shimmer" />
                    </div>

                    {/* ZONE OMEGA: Tactical Execution */}
                    <div className="flex items-center h-full shrink-0">
                        {/* Tactical Tools */}
                        <div className="flex items-center h-full border-r border-border/10">
                            <button
                                className="flex items-center gap-1.5 h-full px-4 text-[9px] font-black text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all uppercase tracking-widest"
                                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Tactical</span>
                            </button>
                            <ToolsMenu isOpen={isToolsMenuOpen} onClose={() => setIsToolsMenuOpen(false)} />

                            <button
                                className="flex items-center gap-1.5 h-full px-4 text-[9px] font-black text-primary hover:bg-primary/10 transition-all uppercase tracking-widest"
                                onClick={() => setIsWidgetPickerOpen(true)}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">+ Widgets</span>
                            </button>
                        </div>

                        {/* Security & System Controls */}
                        <div className="flex items-center gap-1 px-3 h-full">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                        <ThemeSelector />
                                        <SafetyToggle />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>System Security & Aesthetic Control</TooltipContent>
                            </Tooltip>

                            <div className="h-6 w-[1px] bg-border/10 mx-1" />
                            <ProfileMenu />
                        </div>
                    </div>
                </header>

                {/* Holographic Indices Shell */}
                <div className="h-[28px] mx-4 mt-[-8px] relative z-20">
                    <div className="absolute inset-0 bg-background/40 backdrop-blur-xl border-x border-b border-border/5 rounded-b-xl shadow-[0_8px_16px_rgba(0,0,0,0.1)]">
                        <IndicesTicker />
                    </div>
                </div>
            </div>


            {/* Main Grid Layout - DYNAMIC MANAGER */}
            <main className="flex-1 overflow-hidden relative z-0 flex flex-col">
                <div className="flex-1 min-h-0 relative">
                    <LayoutManager />
                </div>

                {/* Vertical Resizer for Account Manager */}
                {isAccountManagerOpen && (
                    <div
                        className={cn(
                            "h-[3px] w-full cursor-row-resize hover:bg-primary/50 transition-colors z-[30] relative",
                            isResizing ? "bg-primary" : "bg-white/5"
                        )}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizing(true);

                            const onMouseMove = (moveEvent: MouseEvent) => {
                                const newHeight = window.innerHeight - moveEvent.clientY - 24; // 24 is footer height
                                setAccountManagerHeight(Math.max(100, Math.min(newHeight, window.innerHeight * 0.7)));
                            };

                            const onMouseUp = () => {
                                setIsResizing(false);
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                            };

                            window.addEventListener('mousemove', onMouseMove);
                            window.addEventListener('mouseup', onMouseUp);
                        }}
                    >
                        {/* Visual Grabber */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[1px] bg-white/20" />
                    </div>
                )}

                {/* Account Manager Bottom Panel */}
                {isAccountManagerOpen && (
                    <div
                        style={{ height: accountManagerHeight }}
                        className="w-full shrink-0 z-20 overflow-hidden"
                    >
                        <AccountManager />
                    </div>
                )}
            </main>


            {/* Footer Status Bar - Antigravity Polish */}
            <footer className="h-[28px] border-t border-border/10 bg-background/80 backdrop-blur-2xl text-[9.5px] flex items-center justify-between px-4 text-muted-foreground select-none shrink-0 font-mono z-20">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_var(--up)] ${connectionStatus === 'CONNECTED' || searchParams.get('mock') === 'true' ? 'bg-primary' :
                            connectionStatus === 'CONNECTING' ? 'bg-amber-500' : 'bg-destructive'
                            }`}></span>
                        <span className={`neon-text-glow font-bold ${connectionStatus === 'CONNECTED' || searchParams.get('mock') === 'true' ? 'text-primary' :
                            connectionStatus === 'CONNECTING' ? 'text-amber-500' : 'text-destructive'
                            }`}>
                            {searchParams.get('mock') === 'true' ? (activeBroker || 'MOCK') + ' LIVE' :
                                connectionStatus === 'CONNECTED' ? (activeBroker || 'NSE') + ' LIVE' : connectionStatus}
                        </span>
                    </span>
                    <span className="flex items-center gap-1">
                        MARGIN:
                        <span className="text-up font-bold">₹{unifiedMargin.totalMargin.toLocaleString('en-IN')}</span>
                        {Object.keys(unifiedMargin.brokers).length > 1 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-up/10 text-up text-[8px] font-black border border-up/20 animate-pulse">
                                FUSED 🛰️
                            </span>
                        )}
                    </span>
                    <span className="flex items-center gap-1 text-numeral">
                        LATENCY:
                        <span className={cn(
                            "font-bold",
                            metrics.latency < 50 ? "text-up" : "text-amber-500"
                        )}>
                            {connectionStatus === 'CONNECTED' ? `${metrics.latency}ms` : '-'}
                        </span>
                    </span>
                    <span className="opacity-30">|</span>
                    <span className="flex items-center gap-1 text-numeral">
                        SYNC INTEGRITY:
                        <span className={cn(
                            "font-bold",
                            metrics.integrity > 95 ? "text-up" : "text-amber-500"
                        )}>
                            {connectionStatus === 'CONNECTED' ? `${metrics.integrity}%` : 'DEGRADED'}
                        </span>
                    </span>
                    <span className="opacity-30">|</span>
                    <span className="hover:text-primary transition-colors cursor-pointer text-numeral">v0.4.0-zeng</span>
                    {user && <span className="opacity-50">• {user.user_id}</span>}
                </div>
                <div className="flex gap-4 uppercase tracking-widest text-[9px]">
                    <button
                        onClick={toggleAccountManager}
                        className={cn(
                            "flex items-center gap-1.5 transition-colors hover:text-foreground",
                            isAccountManagerOpen ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <Terminal className="w-3 h-3" />
                        Trading Panel
                    </button>
                    <span className="opacity-30">|</span>
                    <span className="text-muted-foreground/30">{isLoggedIn ? 'Unified Adapter' : 'Demo Mode'}</span>
                </div>
            </footer >

            <MobileNavBar />

            {/* Global Modals - Moved here to prevent clipping and stacking context issues */}
            <WidgetPicker isOpen={isWidgetPickerOpen} onClose={() => setIsWidgetPickerOpen(false)} />
            <LayoutCustomizer
                isOpen={isLayoutCustomizerOpen}
                onClose={() => setIsLayoutCustomizerOpen(false)}
            />
        </div >
    );
}
