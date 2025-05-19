// WebSocket client for demo (can be imported in a component)
import { io, Socket } from 'socket.io-client';

// Define shared types inline
interface ChatMessage {
  user: string;
  message: string;
  timestamp: number;
}

interface ServerToClientEvents {
  message: (msg: ChatMessage) => void;
}

interface ClientToServerEvents {
  message: (msg: ChatMessage) => void;
}

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL);

export function sendMessage(msg: ChatMessage) {
  socket.emit('message', msg);
}

// Listen for messages (example usage)
socket.on('message', (msg) => {
  // You can handle incoming messages here
  console.log('Received message:', msg);
});
