import { useState, useEffect } from "react";
import { MoreHorizontal, Crown, Shield, UsersRound, UserMinus, Ban } from "lucide-react";
import { addMessageHandler, getSessionId, kickUser, transferHost } from "@/lib/websocket";
import { Participant } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ParticipantsProps {
  roomCode: string;
  username: string;
}

export default function Participants({ roomCode, username }: ParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const currentSessionId = getSessionId();
  
  // Check if current user is host
  const currentParticipant = participants.find(p => p.sessionId === currentSessionId);
  const isHost = currentParticipant?.isHost === 1;

  useEffect(() => {
    // Handle join events
    const removeJoinHandler = addMessageHandler('join', (data) => {
      if (data.participants) {
        setParticipants(data.participants);
      }
    });

    // Handle leave events
    const removeLeaveHandler = addMessageHandler('leave', (data) => {
      if (data.participants) {
        setParticipants(data.participants);
      }
    });

    // Handle sync events for new users joining
    const removeSyncHandler = addMessageHandler('sync', (data) => {
      if (data.participants) {
        setParticipants(data.participants);
      }
    });
    
    // Handle host transfer
    const removeTransferHostHandler = addMessageHandler('transferHost', (data) => {
      if (data.participants) {
        setParticipants(data.participants);
        
        // Show notification about host transfer
        toast({
          title: "Host Transferred",
          description: `${data.newHostUsername} is now the host of this room.`,
        });
      }
    });
    
    // Handle kick events
    const removeKickHandler = addMessageHandler('kick', (data) => {
      if (data.participants) {
        setParticipants(data.participants);
        
        // Show notification about kick
        toast({
          title: "User Kicked",
          description: `${data.kickedUser} has been kicked from the room.`,
          variant: "destructive"
        });
      }
    });
    
    // Handle being kicked
    const removeKickedHandler = addMessageHandler('kicked', (data) => {
      toast({
        title: "You've been kicked",
        description: data.message,
        variant: "destructive"
      });
      
      // Redirect to home page
      window.location.href = "/";
    });

    return () => {
      removeJoinHandler();
      removeLeaveHandler();
      removeSyncHandler();
      removeTransferHostHandler();
      removeKickHandler();
      removeKickedHandler();
    };
  }, [toast]);

  // Generate color based on username
  const getColorForUsername = (username: string) => {
    const colors = [
      'bg-indigo-500', 'bg-purple-500', 'bg-green-500', 
      'bg-blue-500', 'bg-red-500', 'bg-yellow-500', 
      'bg-pink-500', 'bg-teal-500'
    ];
    
    // Simple hash function for username
    const hash = username.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };

  // Mobile toggle
  const toggleParticipants = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle kick user action
  const handleKickUser = (targetSessionId: string, targetUsername: string) => {
    if (isHost && targetSessionId !== currentSessionId) {
      kickUser(roomCode, targetSessionId);
      toast({
        title: "Kicking user",
        description: `Kicking ${targetUsername} from the room...`,
      });
    }
  };
  
  // Handle transfer host action
  const handleTransferHost = (targetSessionId: string, targetUsername: string) => {
    if (isHost && targetSessionId !== currentSessionId) {
      transferHost(roomCode, targetSessionId);
      toast({
        title: "Transferring host",
        description: `Making ${targetUsername} the new host...`,
      });
    }
  };
  
  // Participant item component
  const ParticipantItem = ({ participant, mobile = false }: { participant: Participant; mobile?: boolean }) => {
    const isCurrentUser = participant.username === username;
    const isParticipantHost = participant.isHost === 1;
    
    return (
      <div className={`flex items-center bg-gray-800 rounded-full py-1 pl-1 pr-3 ${mobile ? 'mb-2' : ''}`}>
        <div className={`h-6 w-6 rounded-full ${getColorForUsername(participant.username)} flex items-center justify-center text-xs mr-2`}>
          {participant.username[0].toUpperCase()}
        </div>
        <span className="text-sm flex items-center">
          {isCurrentUser ? `${participant.username} (You)` : participant.username}
          {isParticipantHost && (
            <Crown className="h-4 w-4 ml-1 text-yellow-400" />
          )}
        </span>
        
        {/* Only show dropdown for host on other users, or for host transfer */}
        {isHost && !isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 outline-none">
              <MoreHorizontal className="h-4 w-4 text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleTransferHost(participant.sessionId, participant.username)}>
                <Crown className="h-4 w-4 mr-2 text-yellow-400" />
                <span>Make Host</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleKickUser(participant.sessionId, participant.username)}
                className="text-red-500"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                <span>Kick User</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile view */}
      <div className="md:hidden p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold">Chat</h2>
        <button onClick={toggleParticipants} className="text-gray-400 hover:text-white">
          <UsersRound className="h-5 w-5" />
        </button>
      </div>
      
      {/* Mobile participants list (toggleable) */}
      {isOpen && (
        <div className="p-4 border-b border-gray-700 md:hidden">
          <h3 className="text-sm font-medium text-gray-400 mb-3">People in this room</h3>
          <div className="flex flex-col">
            {participants.map((participant, index) => (
              <ParticipantItem key={index} participant={participant} mobile={true} />
            ))}
          </div>
        </div>
      )}
      
      {/* Desktop view */}
      <div className="p-4 bg-gray-900 hidden md:block">
        <h3 className="text-sm font-medium text-gray-400 mb-3">People in this room</h3>
        <div className="flex flex-wrap gap-2">
          {participants.map((participant, index) => (
            <ParticipantItem key={index} participant={participant} />
          ))}
        </div>
      </div>
    </>
  );
}
