// Shared types for WebSocket events and payloads

export interface ChatMessage {
  user: string;
  message: string;
  timestamp: number;
}

export interface ServerToClientEvents {
  message: (msg: ChatMessage) => void;
}

export interface ClientToServerEvents {
  message: (msg: ChatMessage) => void;
}

export { };

