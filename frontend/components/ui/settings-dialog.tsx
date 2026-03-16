"use client";

import React from "react";
import { X, Moon, Sun, Monitor, Bell, Shield, User, CreditCard } from "lucide-react";
import { useTheme } from "next-themes";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { cn } from "@/lib/utils";

export const SettingsDialog = () => {
    const { settingsOpen, setSettingsOpen } = useLayoutStore();
    const [activeTab, setActiveTab] = React.useState("general");
    const { theme, setTheme } = useTheme();

    if (!settingsOpen) return null;

    const tabs = [
        { id: "general", label: "General", icon: Monitor },
        { id: "trading", label: "Trading", icon: Bell },
        { id: "broker", label: "Broker Connection", icon: Shield },
        { id: "account", label: "Account", icon: User },
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSettingsOpen(false)}
        >
            <div
                className="w-[800px] h-[600px] bg-background border border-border rounded-xl shadow-2xl flex overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className="w-64 border-r border-border bg-muted/50 p-4 flex flex-col">
                    <div className="text-xl font-bold tracking-tighter text-foreground mb-8 px-2 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-primary" />
                        Settings
                    </div>

                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                                    activeTab === tab.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-4 border-t border-border">
                        <div className="text-[10px] text-muted-foreground font-mono px-2">
                            v0.2.1-beta
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col bg-background">
                    <div className="h-16 border-b border-border flex items-center justify-between px-8 bg-muted/30">
                        <h2 className="text-lg font-bold text-foreground capitalize">{activeTab} Settings</h2>
                        <button
                            onClick={() => setSettingsOpen(false)}
                            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {activeTab === "general" && (
                            <div className="space-y-8">
                                <Section title="Appearance">
                                    <div className="grid grid-cols-3 gap-4">
                                        <ThemeCard
                                            icon={Moon}
                                            label="Dark"
                                            active={theme === "dark"}
                                            onClick={() => setTheme("dark")}
                                        />
                                        <ThemeCard
                                            icon={Sun}
                                            label="Light"
                                            active={theme === "light"}
                                            onClick={() => setTheme("light")}
                                        />
                                        <ThemeCard
                                            icon={Monitor}
                                            label="System"
                                            active={theme === "system"}
                                            onClick={() => setTheme("system")}
                                        />
                                    </div>
                                </Section>
                                <Section title="Density">
                                    <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-muted/40">
                                        <div className="text-xs text-muted-foreground">Compact Mode</div>
                                        {/* Toggle switch placeholder */}
                                        <div className="ml-auto w-10 h-5 bg-primary/20 rounded-full relative cursor-pointer border border-primary/50">
                                            <div className="absolute right-0.5 top-0.5 w-3.5 h-3.5 bg-primary rounded-full shadow-sm" />
                                        </div>
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === "trading" && (
                            <div className="space-y-8">
                                <Section title="Order Defaults">
                                    <div className="grid gap-4">
                                        <InputGroup label="Default Quantity (NIFTY)" value="50" />
                                        <InputGroup label="Default Quantity (BANKNIFTY)" value="15" />
                                    </div>
                                </Section>
                                <Section title="Notifications">
                                    <div className="space-y-2">
                                        <ToggleRow label="Order Fills" active />
                                        <ToggleRow label="Price Alerts" active />
                                        <ToggleRow label="News & Events" />
                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === "broker" && (
                            <div className="space-y-8">
                                <Section title="Connected Brokers">
                                    <div className="space-y-4">
                                        <div className="p-4 border border-border bg-surface-1 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded bg-[#ff5722] flex items-center justify-center font-bold text-white">K</div>
                                                <div>
                                                    <div className="text-sm font-bold text-foreground">Kite (Zerodha)</div>
                                                    <div className="text-xs text-muted-foreground">Fastest reliable trading API</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => window.location.href = "/api/kite/auth/login"}
                                                className="px-4 py-2 bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-bold rounded-md transition-colors"
                                            >
                                                Connect
                                            </button>
                                        </div>

                                    </div>
                                </Section>
                            </div>
                        )}

                        {activeTab === "account" && (
                            <div className="space-y-8">
                                <Section title="Profile">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">PR</div>
                                        <div>
                                            <div className="text-sm font-bold text-foreground">Pro Trader</div>
                                            <div className="text-xs text-muted-foreground">pro_trader@example.com</div>
                                        </div>
                                    </div>
                                </Section>
                                <Section title="Subscription">
                                    <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-primary uppercase tracking-widest">Pro Plan</span>
                                            <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded-full">ACTIVE</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">Next billing date: Feb 28, 2026</div>
                                    </div>
                                </Section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const SettingsIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
        {children}
    </div>
);

const ThemeCard = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all",
            active
                ? "bg-primary/5 border-primary/50 text-primary"
                : "bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
    >
        <Icon className="w-6 h-6" />
        <span className="text-xs font-medium">{label}</span>
    </button>
);

const InputGroup = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        <input
            type="text"
            defaultValue={value}
            className="bg-surface-1 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors"
        />
    </div>
);

const ToggleRow = ({ label, active }: { label: string, active?: boolean }) => (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
        <span className="text-xs text-foreground/80">{label}</span>
        <div className={cn(
            "w-9 h-5 rounded-full relative transition-colors",
            active ? "bg-primary" : "bg-muted"
        )}>
            <div className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                active ? "left-[18px]" : "left-0.5"
            )} />
        </div>
    </div>
);
