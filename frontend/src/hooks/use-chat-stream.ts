import { useEffect, useRef, useCallback } from 'react';
import { Message } from '@/lib/types';
import { apiService } from '@/lib/api';

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
  const isOpenRef = useRef(false);

  // Open the websocket connection once and keep it alive
  const connect = useCallback((sessionId: string) => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      wsRef.current.close();
    }
    
    const ws = apiService.createChatWebSocket(sessionId);
    wsRef.current = ws;
    
    ws.onopen = () => {
      isOpenRef.current = true;
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.token !== undefined) {
          onToken(data.token);
        }
        if (data.end) {
          onEnd();
        }
        if (data.error) {
          onError?.(data.error);
        }
      } catch (err) {
        onError?.(err);
      }
    };
    
    ws.onerror = (err) => {
      onError?.(err);
      ws.close();
    };
    
    ws.onclose = () => {
      wsRef.current = null;
      isOpenRef.current = false;
    };
  }, [onToken, onEnd, onError]);

  // Send messages through the persistent connection
  const startStream = useCallback((sessionId: string, messageContent: string) => {
    connect(sessionId);
    const send = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ message: messageContent }));
      } else if (wsRef.current) {
        wsRef.current.addEventListener('open', () => {
          wsRef.current?.send(JSON.stringify({ message: messageContent }));
        }, { once: true });
      }
    };
    send();
  }, [connect]);

  // Clean up on unmount, on new chat, or after inactivity
  useEffect(() => {
    let inactivityTimeout: NodeJS.Timeout | null = null;

    const resetInactivity = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        wsRef.current?.close();
      }, 5 * 60 * 1000); // 5 minutes inactivity
    };

    // Listen for user activity to reset inactivity timer
    const activityEvents = ['keydown', 'mousedown', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, resetInactivity));
    resetInactivity();

    return () => {
      wsRef.current?.close();
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      activityEvents.forEach(event => window.removeEventListener(event, resetInactivity));
    };
  }, []);

  // Expose a method to force close the connection (e.g. on new chat)
  const closeConnection = useCallback(() => {
    wsRef.current?.close();
  }, []);

  // Stop stream (alias for closeConnection for compatibility)
  const stopStream = closeConnection;

  return { startStream, stopStream, closeConnection };
}
