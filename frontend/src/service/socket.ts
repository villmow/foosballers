// WebSocket client for demo (can be imported in a component)
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, ClientToServerEvents, ServerToClientEvents } from '../../../shared-types';

const URL = 'http://localhost:4000';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL);

export function sendMessage(msg: ChatMessage) {
  socket.emit('message', msg);
}

// Listen for messages (example usage)
socket.on('message', (msg) => {
  // You can handle incoming messages here
  console.log('Received message:', msg);
});
