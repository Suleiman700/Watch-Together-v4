
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Mic, MicOff } from "lucide-react";
import { sendMessage } from "@/lib/websocket";

export default function ScreenShare({ roomCode }: { roomCode: string }) {
  const [isSharing, setIsSharing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: audioEnabled
      });

      const videoTrack = stream.getVideoTracks()[0];
      
      // Send stream to peers via WebSocket
      sendMessage({
        type: 'screenShare',
        payload: {
          roomCode,
          enabled: true
        }
      });

      videoTrack.onended = () => {
        stopScreenShare();
      };

      setIsSharing(true);
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const stopScreenShare = () => {
    sendMessage({
      type: 'screenShare',
      payload: {
        roomCode,
        enabled: false
      }
    });
    setIsSharing(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isSharing ? "destructive" : "secondary"}
        size="sm"
        onClick={isSharing ? stopScreenShare : startScreenShare}
      >
        <Monitor className="h-4 w-4 mr-2" />
        {isSharing ? "Stop Sharing" : "Share Screen"}
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="text-white"
      >
        {audioEnabled ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
