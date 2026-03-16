import { useEffect } from 'react';
import { realtimeClient, RealtimeMessage } from '@/lib/realtime/socket';
import { useMarketStore } from '@/hooks/useMarketStore';
import { useOrderStore, OrderStatus } from '@/hooks/useOrderStore';

export function useRealtime() {
  const updateTickers = useMarketStore((s) => s.updateTickers);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);

  useEffect(() => {
    realtimeClient.connect();

    const unsubscribe = realtimeClient.subscribe((msg: RealtimeMessage) => {
      switch (msg.type) {
        case 'tick':
          updateTickers([msg.data]);
          break;
        case 'signal':
          console.log('[Realtime] Signal Received:', msg.data);
          break;
        case 'pnl':
          console.log('[Realtime] PnL Update:', msg.data);
          // Assuming msg.data contains { positions: [...] }
          if (msg.data.positions) {
            // updatePortfolioPositions(msg.data.positions);
          }
          break;
        case 'order':
          console.log('[Realtime] Order Update:', msg.data);
          if (msg.data.order_id && msg.data.status) {
            updateOrder(msg.data.order_id, {
                status: msg.data.status as OrderStatus,
                qty: msg.data.quantity,
                price: msg.data.price
            });
          }
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [updateTickers, setConnectionStatus]);
}
