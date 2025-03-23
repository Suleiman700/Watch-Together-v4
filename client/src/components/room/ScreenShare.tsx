
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Mic, MicOff } from "lucide-react";
import { sendMessage } from "@/lib/websocket";

const peerConnections = new Map();

export default function ScreenShare({ roomCode }: { roomCode: string }) {
  const [isSharing, setIsSharing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const handleScreenShare = async (data: any) => {
      if (data.type === 'screenShare') {
        if (data.payload.enabled) {
          // Create new RTCPeerConnection for receiving
          const peerConnection = new RTCPeerConnection();
          
          peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            const videoElement = document.createElement('video');
            videoElement.srcObject = remoteStream;
            videoElement.autoplay = true;
            videoElement.id = 'shared-screen';
            videoElement.style.width = '100%';
            videoElement.style.height = 'auto';
            
            const container = document.querySelector('.screen-share-container');
            if (container) {
              container.innerHTML = '';
              container.appendChild(videoElement);
            }
          };

          // Handle ICE candidates
          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              sendMessage({
                type: 'ice-candidate',
                payload: {
                  roomCode,
                  candidate: event.candidate
                }
              });
            }
          };

          peerConnections.set(data.payload.sessionId, peerConnection);
        } else {
          const container = document.querySelector('.screen-share-container');
          if (container) {
            container.innerHTML = '';
          }
        }
      }
    };

    // Subscribe to WebSocket messages
    window.addEventListener('websocket-message', (e: any) => handleScreenShare(e.detail));
    
    return () => {
      window.removeEventListener('websocket-message', handleScreenShare);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomCode, stream]);

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: audioEnabled
      });
      
      setStream(mediaStream);

      // Create peer connections for each participant
      const peerConnection = new RTCPeerConnection();
      
      // Add tracks to the peer connection
      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      sendMessage({
        type: 'screenShare',
        payload: {
          roomCode,
          enabled: true,
          offer
        }
      });

      mediaStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setIsSharing(true);
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    sendMessage({
      type: 'screenShare',
      payload: {
        roomCode,
        enabled: false
      }
    });

    setIsSharing(false);
    
    const container = document.querySelector('.screen-share-container');
    if (container) {
      container.innerHTML = '';
    }
  };

  return (
    <>
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
      <div className="screen-share-container mt-4"></div>
    </>
  );
}
