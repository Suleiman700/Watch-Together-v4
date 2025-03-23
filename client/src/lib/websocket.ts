import { WebSocketMessage } from "@shared/schema";

let socket: WebSocket | null = null;
let sessionId: string | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

type MessageHandler = (message: any) => void;
const messageHandlers: Record<string, MessageHandler[]> = {};

export function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      resolve(socket);
      return;
    }

    // Close existing socket if any
    if (socket) {
      socket.close();
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connection established");
      reconnectAttempts = 0;
      resolve(socket!);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        
        // Store session ID if received
        if (message.type === 'session') {
          sessionId = message.payload.sessionId;
          console.log("Received session ID:", sessionId);
        }
        
        // Dispatch message to handlers
        if (messageHandlers[message.type]) {
          messageHandlers[message.type].forEach(handler => handler(message.payload));
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      
      // Attempt reconnection
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => connect(), RECONNECT_DELAY);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      reject(error);
    };
  });
}

export function addMessageHandler(type: string, handler: MessageHandler): () => void {
  if (!messageHandlers[type]) {
    messageHandlers[type] = [];
  }

  messageHandlers[type].push(handler);

  // Return function to remove handler
  return () => {
    messageHandlers[type] = messageHandlers[type].filter(h => h !== handler);
  };
}

export function sendMessage(message: WebSocketMessage): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not connected");
    connect().then(socket => {
      socket.send(JSON.stringify(message));
    }).catch(error => {
      console.error("Failed to reconnect WebSocket:", error);
    });
    return;
  }

  socket.send(JSON.stringify(message));
}

export function getSessionId(): string | null {
  return sessionId;
}

export function joinRoom(roomCode: string, username: string): void {
  sendMessage({
    type: 'join',
    payload: { roomCode, username }
  });
}

export function leaveRoom(roomCode: string): void {
  sendMessage({
    type: 'leave',
    payload: { roomCode, sessionId }
  });
}

export function sendChatMessage(roomCode: string, username: string, message: string): void {
  sendMessage({
    type: 'message',
    payload: { roomCode, username, message }
  });
}

export function updateVideo(roomCode: string, videoUrl: string): void {
  sendMessage({
    type: 'updateVideo',
    payload: { roomCode, videoUrl }
  });
}

export function sendPlayEvent(roomCode: string, currentTime: number): void {
  sendMessage({
    type: 'play',
    payload: { roomCode, currentTime }
  });
}

export function sendPauseEvent(roomCode: string, currentTime: number): void {
  sendMessage({
    type: 'pause',
    payload: { roomCode, currentTime }
  });
}

export function sendSeekEvent(roomCode: string, currentTime: number): void {
  sendMessage({
    type: 'seek',
    payload: { roomCode, currentTime }
  });
}

export function sendLikeEvent(roomCode: string, username: string): void {
  sendMessage({
    type: 'like',
    payload: { roomCode, username }
  });
}

export function sendReactionEvent(roomCode: string, username: string, reaction: string): void {
  sendMessage({
    type: 'reaction',
    payload: { roomCode, username, reaction }
  });
}

export function kickUser(roomCode: string, targetSessionId: string): void {
  sendMessage({
    type: 'kick',
    payload: { roomCode, targetSessionId }
  });
}

export function transferHost(roomCode: string, targetSessionId: string): void {
  sendMessage({
    type: 'transferHost',
    payload: { roomCode, targetSessionId }
  });
}

// Connect on module import
connect().catch(error => {
  console.error("Initial WebSocket connection failed:", error);
});

// Automatically reconnect on window focus
window.addEventListener('focus', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connect().catch(error => {
      console.error("Failed to reconnect WebSocket on window focus:", error);
    });
  }
});
