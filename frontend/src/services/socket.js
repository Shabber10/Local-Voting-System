import { io } from 'socket.io-client';

// Detect backend URL (falls back to current origin or proxy in development)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin
);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('⚡ Connected to VoteSphere Socket Server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected from Socket Server:', reason);
});
