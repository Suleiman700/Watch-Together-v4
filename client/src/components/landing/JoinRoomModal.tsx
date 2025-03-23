import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode || roomCode.length !== 6) {
      toast({
        title: "Invalid room code",
        description: "Please enter a valid 6-character room code",
        variant: "destructive",
      });
      return;
    }
    
    if (!username || username.length < 2) {
      toast({
        title: "Invalid name",
        description: "Please enter a valid display name (at least 2 characters)",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Check if room exists
      const response = await apiRequest("GET", `/api/rooms/${roomCode}`, undefined);
      const data = await response.json();
      
      if (data.exists) {
        // Navigate to room with room code and username
        setLocation(`/room/${roomCode}?username=${encodeURIComponent(username)}`);
        onClose();
      }
    } catch (error) {
      console.error("Failed to join room:", error);
      toast({
        title: "Room not found",
        description: "The room code you entered doesn't exist",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Join a Room</DialogTitle>
          <DialogDescription className="text-gray-400">
            Enter a room code and your display name to join
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="room-code">Room Code</Label>
            <Input
              id="room-code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              className="bg-gray-900 border-gray-700"
              maxLength={6}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="your-name">Your Name</Label>
            <Input
              id="your-name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="bg-gray-900 border-gray-700"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90"
            disabled={isLoading}
          >
            {isLoading ? "Joining..." : "Join Room"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
