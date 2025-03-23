import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { storage } from "./storage";
import { 
  roomCodeSchema, 
  joinRoomSchema, 
  createRoomSchema, 
  updateVideoSchema, 
  sendMessageSchema,
  type WebSocketMessage,
  type Participant
} from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import { log } from "./vite";

// Generate a random 6-character room code
function generateRoomCode(): string {
  return nanoid(6).toUpperCase();
}

// Track connected WebSocket clients by sessionId
const clients = new Map<string, WebSocket>();

// Helper function to broadcast to all clients in a room
function broadcastToRoom(roomCode: string, message: WebSocketMessage) {
  storage.getParticipantsByRoomCode(roomCode).then(participants => {
    participants.forEach(participant => {
      const client = clients.get(participant.sessionId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    const sessionId = nanoid();
    clients.set(sessionId, ws);
    
    // Send session ID to client
    ws.send(JSON.stringify({ 
      type: 'session', 
      payload: { sessionId }
    }));
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        
        switch (data.type) {
          case 'join':
            const { roomCode, username } = data.payload;
            
            // Check if there are any existing participants
            const existingParticipants = await storage.getParticipantsByRoomCode(roomCode);
            
            // If this is the first participant, make them the host
            const isHost = existingParticipants.length === 0 ? 1 : 0;
            
            // Add participant to room
            await storage.addParticipant({
              roomCode,
              username,
              sessionId,
              isHost,
            });
            
            // Broadcast join message to room
            broadcastToRoom(roomCode, {
              type: 'join',
              payload: {
                username,
                sessionId,
                isHost,
                participants: await storage.getParticipantsByRoomCode(roomCode)
              }
            });
            
            // Send current room state to the new participant
            const room = await storage.getRoomByCode(roomCode);
            if (room) {
              ws.send(JSON.stringify({
                type: 'sync',
                payload: {
                  videoUrl: room.videoUrl,
                  participants: await storage.getParticipantsByRoomCode(roomCode),
                  messages: await storage.getMessagesByRoomCode(roomCode)
                }
              }));
            }
            break;
            
          case 'leave':
            await storage.removeParticipant(sessionId);
            
            // If we know the room code from the payload
            if (data.payload && data.payload.roomCode) {
              broadcastToRoom(data.payload.roomCode, {
                type: 'leave',
                payload: {
                  sessionId,
                  participants: await storage.getParticipantsByRoomCode(data.payload.roomCode)
                }
              });
            }
            break;
            
          case 'message':
            const messageData = sendMessageSchema.parse(data.payload);
            const newMessage = await storage.addMessage(messageData);
            
            broadcastToRoom(messageData.roomCode, {
              type: 'message',
              payload: newMessage
            });
            break;
            
          case 'updateVideo':
            const videoData = updateVideoSchema.parse(data.payload);
            await storage.updateRoomVideo(videoData.roomCode, videoData.videoUrl);
            
            broadcastToRoom(videoData.roomCode, {
              type: 'updateVideo',
              payload: videoData
            });
            break;
            
          case 'play':
          case 'pause':
          case 'seek':
          case 'like':
          case 'reaction':
          case 'screenShare':
          case 'ice-candidate':
            // Forward these WebRTC events to all clients in room
            broadcastToRoom(data.payload.roomCode, data);
            break;
            
          case 'kick':
            // Only allow host to kick users
            const kickData = data.payload;
            const participants = await storage.getParticipantsByRoomCode(kickData.roomCode);
            const hostParticipant = participants.find(p => p.sessionId === sessionId);
            const targetParticipant = participants.find(p => p.sessionId === kickData.targetSessionId);
            
            if (hostParticipant?.isHost === 1 && targetParticipant) {
              // Remove participant from storage
              await storage.removeParticipant(kickData.targetSessionId);
              
              // Notify all users about the kick
              broadcastToRoom(kickData.roomCode, {
                type: 'kick',
                payload: {
                  roomCode: kickData.roomCode,
                  kickedUser: targetParticipant.username,
                  participants: await storage.getParticipantsByRoomCode(kickData.roomCode)
                }
              });
              
              // Notify the kicked user specifically
              const targetClient = clients.get(kickData.targetSessionId);
              if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                targetClient.send(JSON.stringify({
                  type: 'kicked',
                  payload: { message: 'You have been kicked from the room' }
                }));
              }
            }
            break;
            
          case 'transferHost':
            // Only allow current host to transfer host status
            const transferData = data.payload;
            const roomParticipants = await storage.getParticipantsByRoomCode(transferData.roomCode);
            const currentHost = roomParticipants.find(p => p.sessionId === sessionId);
            const newHost = roomParticipants.find(p => p.sessionId === transferData.targetSessionId);
            
            if (currentHost?.isHost === 1 && newHost) {
              // Update host status in storage
              // This would require a new storage method, but for now we're using the existing ones
              await storage.removeParticipant(currentHost.sessionId);
              await storage.removeParticipant(newHost.sessionId);
              
              await storage.addParticipant({
                ...currentHost,
                isHost: 0
              });
              
              await storage.addParticipant({
                ...newHost,
                isHost: 1
              });
              
              // Notify all users about the host transfer
              broadcastToRoom(transferData.roomCode, {
                type: 'transferHost',
                payload: {
                  roomCode: transferData.roomCode,
                  newHostUsername: newHost.username,
                  participants: await storage.getParticipantsByRoomCode(transferData.roomCode)
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (error instanceof z.ZodError) {
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Invalid data format', errors: error.errors }
          }));
        }
      }
    });
    
    ws.on('close', async () => {
      try {
        // Find all participants in the system
        const allParticipants = await Promise.all(
          Array.from(clients.keys()).map(id => 
            storage.getParticipantsByRoomCode('').catch(() => [])
          )
        ).then(results => results.flat());
        
        // Find the participant that is closing their connection
        const leavingParticipant = allParticipants.find(p => p.sessionId === sessionId);
        
        if (leavingParticipant) {
          const roomCode = leavingParticipant.roomCode;
          const isHost = leavingParticipant.isHost === 1;
          
          // Remove the participant
          await storage.removeParticipant(sessionId);
          
          // Get remaining participants in the room
          const remainingParticipants = await storage.getParticipantsByRoomCode(roomCode);
          
          // If the leaving participant was the host and there are other participants, assign a new host
          if (isHost && remainingParticipants.length > 0) {
            const newHost = remainingParticipants[0]; // Select first participant as new host
            
            // Update the new host status
            await storage.removeParticipant(newHost.sessionId);
            await storage.addParticipant({
              ...newHost,
              isHost: 1
            });
            
            // Get updated participants list
            const updatedParticipants = await storage.getParticipantsByRoomCode(roomCode);
            
            // Notify about host transfer and participant leaving
            broadcastToRoom(roomCode, {
              type: 'transferHost',
              payload: {
                roomCode,
                newHostUsername: newHost.username,
                previousHost: leavingParticipant.username,
                participants: updatedParticipants
              }
            });
          }
          
          // Notify about participant leaving
          broadcastToRoom(roomCode, {
            type: 'leave',
            payload: {
              sessionId,
              username: leavingParticipant.username,
              wasHost: isHost,
              participants: await storage.getParticipantsByRoomCode(roomCode)
            }
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket close:', error);
      } finally {
        clients.delete(sessionId);
      }
    });
  });
  
  // API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });
  
  // Create a new room
  app.post('/api/rooms', async (req: Request, res: Response) => {
    try {
      const { username } = createRoomSchema.parse(req.body);
      const roomCode = generateRoomCode();
      
      const room = await storage.createRoom({ roomCode, videoUrl: null });
      
      res.status(201).json({ roomCode });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create room' });
      }
    }
  });
  
  // Check if a room exists
  app.get('/api/rooms/:roomCode', async (req: Request, res: Response) => {
    try {
      const { roomCode } = roomCodeSchema.parse(req.params);
      const room = await storage.getRoomByCode(roomCode);
      
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      res.json({ exists: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid room code', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to check room' });
      }
    }
  });
  
  return httpServer;
}
