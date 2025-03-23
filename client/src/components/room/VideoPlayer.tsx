import { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  sendPlayEvent,
  sendPauseEvent,
  sendSeekEvent,
  updateVideo,
  addMessageHandler,
  sendMessage,
  sendLikeEvent,
  sendReactionEvent
} from "@/lib/websocket";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, Video, ThumbsUp, Smile } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type VideoProvider } from "./VideoProvider";
import { default as ScreenShare } from './ScreenShare';

interface VideoPlayerProps {
  roomCode: string;
}

// Define a type for the video providers
type VideoProvider = "auto" | "youtube" | "facebook" | "vimeo" | "twitch" | "dailymotion" | "soundcloud";

export default function VideoPlayer({ roomCode }: VideoPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [inputUrl, setInputUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const playerRef = useRef<ReactPlayer | null>(null);
  const [userInitiatedAction, setUserInitiatedAction] = useState<boolean>(false);
  const [provider, setProvider] = useState<VideoProvider>("auto");
  const [showLikeEmoji, setShowLikeEmoji] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Handle video updates from other users
    const removeUpdateHandler = addMessageHandler('updateVideo', (data) => {
      setVideoUrl(data.videoUrl);
      setInputUrl(data.videoUrl);
    });

    // Handle play events from other users
    const removePlayHandler = addMessageHandler('play', (data) => {
      if (!userInitiatedAction) {
        setIsPlaying(true);
        if (playerRef.current && Math.abs(data.currentTime - currentTime) > 1) {
          playerRef.current.seekTo(data.currentTime, 'seconds');
        }
      }
      setUserInitiatedAction(false);
    });

    // Handle pause events from other users
    const removePauseHandler = addMessageHandler('pause', (data) => {
      if (!userInitiatedAction) {
        setIsPlaying(false);
        if (playerRef.current && Math.abs(data.currentTime - currentTime) > 1) {
          playerRef.current.seekTo(data.currentTime, 'seconds');
        }
      }
      setUserInitiatedAction(false);
    });

    // Handle seek events from other users
    const removeSeekHandler = addMessageHandler('seek', (data) => {
      if (!userInitiatedAction && playerRef.current) {
        playerRef.current.seekTo(data.currentTime, 'seconds');
      }
      setUserInitiatedAction(false);
    });

    // Handle sync events for new joining users
    const removeSyncHandler = addMessageHandler('sync', (data) => {
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setInputUrl(data.videoUrl);
      }
    });

    // Handle like events from other users
    const removeLikeHandler = addMessageHandler('like', () => {
      showLikeAnimation();
    });

    return () => {
      removeUpdateHandler();
      removePlayHandler();
      removePauseHandler();
      removeSeekHandler();
      removeSyncHandler();
      removeLikeHandler();
    };
  }, [currentTime, userInitiatedAction]);

  // State for reactions
  const [showReaction, setShowReaction] = useState<string | null>(null);

  // Function to display the like animation
  const showLikeAnimation = () => {
    setShowLikeEmoji(true);
    setTimeout(() => {
      setShowLikeEmoji(false);
    }, 2000);
  };

  // Function to display reactions
  const showReactionAnimation = (reaction: string) => {
    setShowReaction(reaction);
    setTimeout(() => {
      setShowReaction(null);
    }, 2000);
  };

  // Handle reaction events from other users
  useEffect(() => {
    const removeReactionHandler = addMessageHandler('reaction', (data) => {
      if (data.reaction) {
        showReactionAnimation(data.reaction);
      }
    });

    return () => {
      removeReactionHandler();
    };
  }, []);

  // Function to send a like to all participants
  const handleLike = () => {
    // Get the username from session storage if available
    const username = sessionStorage.getItem('username') || 'Anonymous';
    sendLikeEvent(roomCode, username);
    showLikeAnimation();
  };

  // Function to send an emoji reaction
  const handleReaction = (emoji: string) => {
    const username = sessionStorage.getItem('username') || 'Anonymous';
    sendReactionEvent(roomCode, username, emoji);
    showReactionAnimation(emoji);
  };

  // Function to force sync with current player state
  const handleSync = () => {
    if (!playerRef.current) return;

    const currentTime = playerRef.current.getCurrentTime();

    if (isPlaying) {
      sendPlayEvent(roomCode, currentTime);
    } else {
      sendPauseEvent(roomCode, currentTime);
    }

    toast({
      title: "Video synced",
      description: "All participants are now synced with your video position",
    });
  };

  const handlePlayPause = () => {
    setUserInitiatedAction(true);
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);

    if (newPlayingState) {
      sendPlayEvent(roomCode, currentTime);
    } else {
      sendPauseEvent(roomCode, currentTime);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;

    setUserInitiatedAction(true);
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const newTime = duration * position;

    setCurrentTime(newTime);
    playerRef.current.seekTo(newTime, 'seconds');
    sendSeekEvent(roomCode, newTime);
  };

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    setProgress(state.played * 100);
    setCurrentTime(state.playedSeconds);
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleAddVideo = () => {
    if (!inputUrl || !ReactPlayer.canPlay(inputUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
      return;
    }

    setVideoUrl(inputUrl);
    updateVideo(roomCode, inputUrl);

    toast({
      title: "Video added",
      description: "Video has been added and will sync for all participants",
    });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours > 0 ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col">
      <div className="bg-black aspect-video relative">
        <div id="screen-share-video-container" className="absolute inset-0 z-20 w-full h-full"></div>
        {/* Like emoji animation */}
        {showLikeEmoji && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="animate-bounce-up">
              <ThumbsUp className="h-24 w-24 text-indigo-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Reaction emoji animation */}
        {showReaction && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="animate-bounce-up">
              <div className="text-6xl animate-pulse">{showReaction}</div>
            </div>
          </div>
        )}

        {!videoUrl ? (
          <div className="absolute inset-0 flex items-center justify-center" id="video-placeholder">
            <div className="text-center">
              <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Add a video to get started</p>
            </div>
          </div>
        ) : (
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            width="100%"
            height="100%"
            playing={isPlaying}
            onPlay={() => {
              setIsPlaying(true);
              if (!userInitiatedAction) {
                sendPlayEvent(roomCode, currentTime);
              }
              setUserInitiatedAction(false);
            }}
            onPause={() => {
              setIsPlaying(false);
              if (!userInitiatedAction) {
                sendPauseEvent(roomCode, currentTime);
              }
              setUserInitiatedAction(false);
            }}
            onProgress={handleProgress}
            onDuration={handleDuration}
            config={{
              [provider !== "auto" ? provider : "youtube"]: {
                playerVars: { showinfo: 1 }
              }
            }}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>

            <div className="flex-1 cursor-pointer" onClick={handleSeek}>
              <Progress value={progress} className="h-1 w-full" />
            </div>

            <span className="text-sm text-white">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Like button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={handleLike}
            >
              <ThumbsUp className="h-5 w-5" />
            </Button>

            {/* Sync button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white text-xs"
              onClick={handleSync}
              disabled={!videoUrl}
            >
              Sync
            </Button>
          </div>
        </div>
      </div>

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* URL input and provider selector */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste a video link here"
                className="flex-1"
              />

              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as VideoProvider)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="twitch">Twitch</SelectItem>
                  <SelectItem value="dailymotion">Dailymotion</SelectItem>
                  <SelectItem value="soundcloud">SoundCloud</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Play button */}
            <div className="flex gap-2">
              <Button
                onClick={handleAddVideo}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 flex-1"
              >
                Play Video
              </Button>
              <ScreenShare roomCode={roomCode} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}