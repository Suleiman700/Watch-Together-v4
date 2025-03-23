import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(),
  username: text("username").notNull(),
  sessionId: text("session_id").notNull(),
  isHost: integer("is_host").default(0),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(),
  username: text("username").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  roomCode: true,
  videoUrl: true,
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  roomCode: true,
  username: true,
  sessionId: true,
  isHost: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  roomCode: true,
  username: true,
  message: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Participant = typeof participants.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const roomCodeSchema = z.object({
  roomCode: z.string().length(6),
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(6),
  username: z.string().min(2).max(20),
});

export const createRoomSchema = z.object({
  username: z.string().min(2).max(20),
});

export const updateVideoSchema = z.object({
  roomCode: z.string().length(6),
  videoUrl: z.string().url(),
});

export const sendMessageSchema = z.object({
  roomCode: z.string().length(6),
  username: z.string().min(2).max(20),
  message: z.string().min(1).max(500),
});

export type VideoState = {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

export type WebSocketMessage = {
  type: "join" | "leave" | "message" | "sync" | "play" | "pause" | "seek" | "updateVideo" | "like" | "session" | "error" | "reaction" | "kick" | "transferHost" | "screenShare" | "ice-candidate";
  payload: any;
};
