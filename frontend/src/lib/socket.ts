import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

let socket: Socket | null = null;

/**
 * Get or create the shared Socket.IO connection.
 * Only connects in the browser; returns null during SSR.
 */
export function getSocket(): Socket | null {
  if (!browser) return null;

  if (!socket) {
    // Connect to the same origin (Vite proxy forwards /socket.io to backend)
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('[Socket.IO] Conectado:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Desconectado:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Error de conexión:', err.message);
    });
  }

  return socket;
}

/**
 * Join a user-specific room so the server can send targeted events.
 */
export function joinUser(userId: string): void {
  if (socket && userId) {
    socket.emit('join', userId);
  }
}

/**
 * Listen for a forced logout event from the server.
 */
export function onForceLogout(callback: (message: string) => void): void {
  if (socket) {
    socket.on('forceLogout', callback);
  }
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
