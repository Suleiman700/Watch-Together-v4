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
    const handleMessage = async (e: any) => {
      const data = e.detail;

      if (data.type === 'screenShare') {
        if (data.payload.enabled && data.payload.offer) {
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

          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          sendMessage({
            type: 'screenShare',
            payload: {
              roomCode,
              answer,
              enabled: true,
              sessionId: data.payload.sessionId
            }
          });

          peerConnections.set(data.payload.sessionId, peerConnection);
        } else if (data.payload.answer) {
          const peerConnection = peerConnections.get(data.payload.sessionId);
          if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.payload.answer));
          }
        } else if (!data.payload.enabled) {
          const container = document.querySelector('.screen-share-container');
          if (container) {
            container.innerHTML = '';
          }
          peerConnections.clear();
        }
      } else if (data.type === 'ice-candidate' && data.payload.candidate) {
        const peerConnection = peerConnections.get(data.payload.sessionId);
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
        }
      }
    };

    window.addEventListener('websocket-message', handleMessage);

    return () => {
      window.removeEventListener('websocket-message', handleMessage);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      peerConnections.forEach(pc => pc.close());
      peerConnections.clear();
    };
  }, [roomCode, stream]);

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: audioEnabled
      });

      setStream(mediaStream);

      const peerConnection = new RTCPeerConnection();
      const sessionId = Math.random().toString(36).substring(7);

      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });

      // Send any ICE candidates to other peers
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({
            type: 'ice-candidate',
            payload: {
              roomCode,
              candidate: event.candidate,
              sessionId: sessionId
            }
          });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      sendMessage({
        type: 'screenShare',
        payload: {
          roomCode,
          enabled: true,
          offer,
          sessionId: sessionId
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

    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();

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