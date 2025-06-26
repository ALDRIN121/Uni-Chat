import { useRef } from 'react';

export function useChatStream({
  onToken,
  onEnd,
  onError,
}: {
  onToken: (token: string) => void;
  onEnd: () => void;
  onError?: (err: any) => void;
}) {
  const wsRef = useRef<WebSocket | null>(null);

  const startStream = (query: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    const ws = new WebSocket('ws://localhost:8000/ws/chat');
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ query }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.token !== undefined) {
          onToken(data.token);
        }
        if (data.end) {
          onEnd();
          ws.close();
        }
        if (data.error) {
          onError?.(data.error);
          ws.close();
        }
      } catch (err) {
        onError?.(err);
        ws.close();
      }
    };
    ws.onerror = (err) => {
      onError?.(err);
      ws.close();
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
  };

  const stopStream = () => {
    wsRef.current?.close();
  };

  return { startStream, stopStream };
}
