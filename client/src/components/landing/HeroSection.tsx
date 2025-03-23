import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import JoinRoomModal from "./JoinRoomModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HeroSection() {
  const [, setLocation] = useLocation();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const { toast } = useToast();
  
  const handleCreateRoom = async () => {
    try {
      // Display name input prompt
      const username = prompt("Enter your display name");
      
      if (!username || username.trim().length < 2) {
        toast({
          title: "Invalid name",
          description: "Please enter a valid display name (at least 2 characters)",
          variant: "destructive",
        });
        return;
      }
      
      const response = await apiRequest("POST", "/api/rooms", { username });
      const data = await response.json();
      
      if (data.roomCode) {
        // Navigate to room with room code and username
        setLocation(`/room/${data.roomCode}?username=${encodeURIComponent(username)}`);
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex-1 py-12 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Watch Movies <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Together</span>, No Matter Where You Are
            </h1>
            <p className="text-gray-300 text-lg md:text-xl">
              Synchronize video playback, chat with friends, and enjoy the movie night experience remotely.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleCreateRoom}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 px-6 py-6 h-auto text-base"
              >
                Create a Room
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsJoinModalOpen(true)}
                className="px-6 py-6 h-auto text-base"
              >
                Join a Room
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-xl overflow-hidden shadow-2xl bg-gray-800 relative z-10">
              <img 
                src="https://images.unsplash.com/photo-1522869635100-187f6605d502?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1350&q=80" 
                alt="Friends watching movie together" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm text-gray-300">Alex joined the room</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-2/3 h-48 bg-purple-500/20 rounded-xl blur-2xl"></div>
            <div className="absolute -top-6 -left-6 w-1/2 h-48 bg-indigo-500/20 rounded-xl blur-2xl"></div>
          </div>
        </div>
      </div>
      
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}
