"use client";

import { useHotkeys } from "@/hooks/useHotkeys";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useToast } from "@/hooks/use-toast";
import { audioManager } from "@/lib/audio";

// Configurable Hotkeys
const BUY_HOTKEY = { key: "b", shift: true }; // Shift + B
const SELL_HOTKEY = { key: "s", shift: true }; // Shift + S
const FLATTEN_HOTKEY = { key: "x", shift: true }; // Shift + X
const MAXIMIZE_HOTKEY = { key: " " }; // Spacebar

import { useLayoutStore } from "@/hooks/useLayoutStore";

export const GlobalHotkeys = () => {
    const { placeOrder, positions, closePosition } = useOrderStore();
    const {
        activeWorkspaceId,
        workspaces,
        toggleMaximize,
        maximizedWidgetId
    } = useLayoutStore();
    const { toast } = useToast();

    // Get active symbol from the main chart in the active workspace
    const activeSymbol = useLayoutStore(state => {
        const workspace = state.workspaces[state.activeWorkspaceId];
        if (!workspace) return "NIFTY 50";

        // Find the widget that is currently "active" in the layout store context
        // This logic might need refinement if we track `activeWidgetId` globally
        // For now, let's use the first chart we find, or the widget under cursor if possible?
        // No, `activeWidgetId` is per area. 

        // Let's assume the "Main" chart is the target for hotkeys.
        const chartWidget = workspace.areas
            .flatMap(a => a.widgets)
            .find(w => w.id === 'chart-1' || w.type === 'CHART');

        return chartWidget?.symbol || "NIFTY 50";
    });

    const ticker = useMarketStore(state => state.tickers[activeSymbol]);
    const symbol = activeSymbol;

    useHotkeys(BUY_HOTKEY, () => {
        if (!ticker) return;
        placeOrder({
            symbol,
            transactionType: "BUY",
            orderType: "MARKET",
            productType: "MIS",
            qty: 50,
            price: ticker.last_price
        });
        audioManager.playSuccess();
        toast({
            title: `HOTKEY: BUY ${symbol}`,
            description: `50 Qty @ Market (${ticker.last_price})`,
            variant: "success"
        });
    }, [ticker]);

    useHotkeys(SELL_HOTKEY, () => {
        if (!ticker) return;
        placeOrder({
            symbol,
            transactionType: "SELL",
            orderType: "MARKET",
            productType: "MIS",
            qty: 50,
            price: ticker.last_price
        });
        audioManager.playSuccess();
        toast({
            title: `HOTKEY: SELL ${symbol}`,
            description: `50 Qty @ Market (${ticker.last_price})`,
            variant: "destructive"
        });
    }, [ticker]);

    // Panic Button / Flatten All
    useHotkeys(FLATTEN_HOTKEY, () => {
        // Close all open positions
        positions.forEach(p => {
            if (p.quantity !== 0) closePosition(p.symbol, ticker?.last_price || p.average_price);
        });

        toast({
            title: "PANIC: FLATTEN ALL",
            description: "All positions closed.",
            variant: "destructive"
        });
    }, [positions, ticker]);

    // Maximize Active Widget
    useHotkeys(MAXIMIZE_HOTKEY, (e) => {
        // We need to know WHICH widget to maximize. 
        // Ideally, it's the one the mouse is over, or the last interactived one.
        // `activeWorkspace.areas` has `activeWidgetId`.
        // Let's maximize the first chart for now if no specific focus logic exists.

        const workspace = workspaces[activeWorkspaceId];
        if (!workspace) return;

        // If something is already maximized, minimize it.
        if (maximizedWidgetId) {
            toggleMaximize(maximizedWidgetId);
            return;
        }

        // Otherwise maximize the main chart
        const chartWidget = workspace.areas
            .flatMap(a => a.widgets)
            .find(w => w.type === 'CHART');

        if (chartWidget) {
            toggleMaximize(chartWidget.id);
            audioManager.playSuccess(); // Audio feedback for "Mode Switch"
        }
    }, [workspaces, activeWorkspaceId, maximizedWidgetId]);

    return null; // Headless component
};
