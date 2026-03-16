export type RealtimeMessage = {
  type: 'tick' | 'candle' | 'signal' | 'pnl' | 'order';
  data: any;
};

class RealtimeClient {
  private socket: WebSocket | null = null;
  private url: string;
  private listeners: Set<(msg: RealtimeMessage) => void> = new Set();
  private reconnectTimeout: any = null;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    console.log(`[Realtime] Connecting to ${this.url}...`);
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[Realtime] Connected');
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    };

    this.socket.onmessage = (event) => {
      try {
        const message: RealtimeMessage = JSON.parse(event.data);
        this.listeners.forEach((l) => l(message));
      } catch (e) {
        console.error('[Realtime] Failed to parse message', e);
      }
    };

    this.socket.onclose = () => {
      console.warn('[Realtime] Connection closed. Retrying in 3s...');
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };

    this.socket.onerror = (err) => {
      console.error('[Realtime] Socket error', err);
      this.socket?.close();
    };
  }

  subscribe(callback: (msg: RealtimeMessage) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  close() {
    this.socket?.close();
  }
}

// Singleton instance
export const realtimeClient = new RealtimeClient(
  process.env.NEXT_PUBLIC_REALTIME_WS_URL || 'ws://localhost:8088/ws'
);
