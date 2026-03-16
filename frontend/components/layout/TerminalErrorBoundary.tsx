"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class TerminalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[TERMINAL ERROR] in ${this.props.name || "Widget"}:`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 backdrop-blur-xl border border-down/30 rounded-xl p-6 text-center">
                    <div className="p-3 bg-down/10 rounded-full mb-4">
                        <AlertTriangle className="w-8 h-8 text-down animate-pulse" />
                    </div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-2">
                        Widget Crash Detected
                    </h3>
                    <p className="text-[10px] text-muted-foreground max-w-[200px] mb-6 leading-relaxed">
                        The {this.props.name || "terminal module"} encountered a critical runtime error. System stability preserved.
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-down/10 text-down border border-down/30 hover:bg-down/20 rounded-lg font-black text-[10px] uppercase transition-all"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Re-Initialize Module
                    </button>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 text-left w-full overflow-hidden">
                            <p className="text-[8px] font-mono text-down/60 uppercase font-black mb-1">Debugger Trace</p>
                            <div className="p-2 bg-muted rounded border border-border text-[9px] font-mono text-muted-foreground overflow-auto max-h-20 custom-scrollbar">
                                {this.state.error?.message}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
