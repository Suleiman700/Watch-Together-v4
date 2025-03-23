import { 
  users, type User, type InsertUser,
  rooms, type Room, type InsertRoom,
  participants, type Participant, type InsertParticipant,
  messages, type Message, type InsertMessage
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomByCode(roomCode: string): Promise<Room | undefined>;
  updateRoomVideo(roomCode: string, videoUrl: string): Promise<Room | undefined>;
  
  // Participant operations
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipantsByRoomCode(roomCode: string): Promise<Participant[]>;
  removeParticipant(sessionId: string): Promise<boolean>;
  
  // Message operations
  addMessage(message: InsertMessage): Promise<Message>;
  getMessagesByRoomCode(roomCode: string): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<string, Room>;
  private participants: Map<string, Participant[]>;
  private messages: Map<string, Message[]>;
  private userCurrentId: number;
  private roomCurrentId: number;
  private participantCurrentId: number;
  private messageCurrentId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.participants = new Map();
    this.messages = new Map();
    this.userCurrentId = 1;
    this.roomCurrentId = 1;
    this.participantCurrentId = 1;
    this.messageCurrentId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Room operations
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = this.roomCurrentId++;
    const createdAt = new Date();
    const room: Room = { ...insertRoom, id, createdAt };
    this.rooms.set(insertRoom.roomCode, room);
    this.participants.set(insertRoom.roomCode, []);
    this.messages.set(insertRoom.roomCode, []);
    return room;
  }
  
  async getRoomByCode(roomCode: string): Promise<Room | undefined> {
    return this.rooms.get(roomCode);
  }
  
  async updateRoomVideo(roomCode: string, videoUrl: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    
    const updatedRoom = { ...room, videoUrl };
    this.rooms.set(roomCode, updatedRoom);
    return updatedRoom;
  }
  
  // Participant operations
  async addParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = this.participantCurrentId++;
    const participant: Participant = { ...insertParticipant, id };
    
    const currentParticipants = this.participants.get(insertParticipant.roomCode) || [];
    currentParticipants.push(participant);
    this.participants.set(insertParticipant.roomCode, currentParticipants);
    
    return participant;
  }
  
  async getParticipantsByRoomCode(roomCode: string): Promise<Participant[]> {
    return this.participants.get(roomCode) || [];
  }
  
  async removeParticipant(sessionId: string): Promise<boolean> {
    for (const [roomCode, participants] of this.participants.entries()) {
      const index = participants.findIndex(p => p.sessionId === sessionId);
      
      if (index !== -1) {
        participants.splice(index, 1);
        this.participants.set(roomCode, participants);
        return true;
      }
    }
    
    return false;
  }
  
  // Message operations
  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const timestamp = new Date();
    const message: Message = { ...insertMessage, id, timestamp };
    
    const roomMessages = this.messages.get(insertMessage.roomCode) || [];
    roomMessages.push(message);
    this.messages.set(insertMessage.roomCode, roomMessages);
    
    return message;
  }
  
  async getMessagesByRoomCode(roomCode: string): Promise<Message[]> {
    return this.messages.get(roomCode) || [];
  }
}

export const storage = new MemStorage();
