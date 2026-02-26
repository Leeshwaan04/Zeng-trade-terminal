/**
 * useWorkerTicker: Cyber Trade Infinite Thread Engine
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useMarketStore } from '@/hooks/useMarketStore';

interface UseWorkerTickerProps {
    url: string;
    type: 'sse' | 'ws';
    enabled?: boolean;
    isSecondary?: boolean;
}

export function useWorkerTicker({ url, type, enabled = true, isSecondary = false }: UseWorkerTickerProps) {
    const workerRef = useRef<Worker | null>(null);
    const updateTicker = useMarketStore((s) => s.updateTicker);
    const updateSecondaryTicker = useMarketStore((s) => s.updateSecondaryTicker);
    const updateUnifiedMargin = useMarketStore((s) => s.updateUnifiedMargin);
    const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);
    const activeBroker = useAuthStore((s) => s.activeBroker);
    const setBroker = useAuthStore((s) => s.setBroker);

    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');

    const initWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        const worker = new Worker('/workers/ticker.worker.ts');
        workerRef.current = worker;

        worker.onmessage = (event) => {
            const { type, payload } = event.data;

            switch (type) {
                case 'TICK':
                    const { data, key: sourceKey } = payload;
                    if (sourceKey === url && Array.isArray(data)) {
                        data.forEach(tick => {
                            if (isSecondary) updateSecondaryTicker(tick);
                            else updateTicker(tick);
                        });
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
                    // Holistic Emotional Guardrail Triggered
                    alert(`🚨 CYBER-PAUSE: ${payload.reason}. Terminal locked to prevent revenge trading.`);
                    setConnectionStatus('DISCONNECTED');
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
            payload: { url, type }
        });
    }, [url, type, updateTicker, updateSecondaryTicker, updateUnifiedMargin, setConnectionStatus, activeBroker, isSecondary]);

    useEffect(() => {
        if (enabled && url && url.startsWith('http')) {
            initWorker();
        }
        return () => {
            workerRef.current?.terminate();
        };
    }, [enabled, url, initWorker]);

    return { status };
}
