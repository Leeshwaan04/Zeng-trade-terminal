/**
 * useWorkerTicker: Cyber Trade Infinite Thread Engine
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useMarketStore } from '@/hooks/useMarketStore';
import { useToast } from '@/hooks/use-toast';

interface EC2Auth {
    access_token: string;
    api_key: string;
    tokens: number[];
    mode: string;
}

interface UseWorkerTickerProps {
    url: string;
    type: 'sse' | 'ws';
    enabled?: boolean;
    isSecondary?: boolean;
    /** EC2 relay credentials — worker sends AUTH message after WS handshake */
    auth?: EC2Auth;
}

export function useWorkerTicker({ url, type, enabled = true, isSecondary = false, auth }: UseWorkerTickerProps) {
    const workerRef = useRef<Worker | null>(null);
    const updateTickers = useMarketStore((s) => s.updateTickers);
    const updateSecondaryTickers = useMarketStore((s) => s.updateSecondaryTickers);
    const updateUnifiedMargin = useMarketStore((s) => s.updateUnifiedMargin);
    const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);
    const activeBroker = useAuthStore((s) => s.activeBroker);
    const setBroker = useAuthStore((s) => s.setBroker);

    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
    const { toast } = useToast();

    const initWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        const worker = new Worker('/workers/ticker.worker.js');
        workerRef.current = worker;

        worker.onerror = (err) => {
            console.error('[Worker] Crashed:', err.message, err.filename, err.lineno);
            setStatus('error');
            setConnectionStatus('DISCONNECTED');
            // Auto-restart after 2s
            setTimeout(() => {
                if (enabled && url) initWorker();
            }, 2000);
        };

        worker.onmessage = (event) => {
            const { type, payload } = event.data;

            switch (type) {
                case 'TICK':
                    const { data, key: sourceKey } = payload;
                    if (sourceKey === url && Array.isArray(data)) {
                        if (isSecondary) updateSecondaryTickers(data);
                        else updateTickers(data);
                    }
                    break;
                case 'UNIFIED_MARGIN':
                    updateUnifiedMargin(payload);
                    break;
                case 'FAILOVER_SUGGESTION':
                    // Holistic Failover Support
                    if (payload.broker === activeBroker && !isSecondary) {
                        console.warn(`[FAILOVER] Primary broker ${activeBroker} lagging. Ready to swap.`);
                    }
                    break;
                case 'CYBER_PAUSE_TRIGGERED':
                    // Holistic Emotional Guardrail Triggered — styled toast, not blocking alert
                    toast({
                        title: "🚨 CYBER-PAUSE ACTIVATED",
                        description: `${payload.reason}. Terminal locked to prevent revenge trading.`,
                        variant: "destructive",
                    });
                    setConnectionStatus('DISCONNECTED');
                    break;
                case 'METRICS':
                    useMarketStore.getState().updateMetrics(payload);
                    break;
                case 'STATUS':
                    if (payload.key === url) {
                        setStatus(payload.connected ? 'connected' : 'disconnected');
                        setConnectionStatus(payload.connected ? 'CONNECTED' : 'DISCONNECTED');
                    }
                    break;
                case 'ERROR':
                    if (payload.key === url) {
                        setStatus('error');
                        setConnectionStatus('DISCONNECTED');
                    }
                    break;
            }
        };

        worker.postMessage({
            type: 'CONNECT',
            payload: { url, type, broker: activeBroker, auth }
        });
    }, [url, type, auth, updateTickers, updateSecondaryTickers, updateUnifiedMargin, setConnectionStatus, activeBroker, isSecondary]);

    useEffect(() => {
        if (enabled && url) {
            initWorker();
        }
        return () => {
            workerRef.current?.terminate();
        };
    }, [enabled, url, initWorker]);

    return { status };
}
