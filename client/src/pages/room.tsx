import {useState, useEffect} from "react";
import {useLocation, useParams} from "wouter";
import {Video, LogOut, Clipboard} from "lucide-react";
import VideoPlayer from "@/components/room/VideoPlayer";
import Chat from "@/components/room/Chat";
import Participants from "@/components/room/Participants";
import {Button} from "@/components/ui/button";
import {connect, joinRoom, leaveRoom} from "@/lib/websocket";
import {useToast} from "@/hooks/use-toast";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Room() {
    const params = useParams<{ roomCode: string }>();
    const roomCode = params.roomCode || "";
    const [location, setLocation] = useLocation();
    const [username, setUsername] = useState<string>("");
    const {toast} = useToast();

    // Parse username from query params
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const name = searchParams.get("username");

        if (!name) {
            // Redirect to home if no username
            setLocation("/");
            return;
        }

        setUsername(name);

        // Connect to websocket and join room
        connect()
            .then(() => {
                joinRoom(roomCode, name);
            })
            .catch(error => {
                console.error("Failed to connect to websocket:", error);
                toast({
                    title: "Connection Error",
                    description: "Failed to connect to room. Please try again.",
                    variant: "destructive",
                });
            });

      // Handle page unload
      const handleUnload = () => {
        leaveRoom(roomCode);
      };

      window.addEventListener("beforeunload", handleUnload);

      // Cleanup: leave room on unmount
        return () => {
            leaveRoom(roomCode);
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [roomCode, setLocation, toast]);

    const handleExitRoom = () => {
        leaveRoom(roomCode);
        setLocation("/");
    };

    const handleCopyRoomCode = () => {
        navigator.clipboard.writeText(roomCode);
        toast({
            title: "Room code copied",
            description: "Share this code with friends to invite them",
        });
    };

    if (!username) {
        return null; // Don't render until we have a username
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-900 text-white">
            {/* Room Header */}
            <header className="bg-gray-800 border-b border-gray-700 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <Video className="h-6 w-6 text-indigo-500"/>
                        <span className="ml-2 font-semibold text-lg">WatchTogether</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="bg-gray-700 px-3 py-1 rounded-full text-sm flex items-center">
                            <span id="room-code" className="font-medium">Room: {roomCode}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-2 text-gray-400 hover:text-white h-auto p-1"
                                onClick={handleCopyRoomCode}
                            >
                                <Clipboard className="h-4 w-4"/>
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-white"
                            onClick={handleExitRoom}
                        >
                            <LogOut className="h-5 w-5"/>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Mobile view - stacked layout */}
                <div className="flex flex-col md:hidden h-full">
                    <div className="flex-none">
                        <VideoPlayer roomCode={roomCode}/>
                    </div>
                    <Participants roomCode={roomCode} username={username}/>
                    <div className="flex-1 border-t border-gray-700 bg-gray-900">
                        <Chat roomCode={roomCode} username={username}/>
                    </div>
                </div>

                {/* Desktop view - resizable panels */}
                <div className="hidden md:flex h-[calc(100vh-4rem)] w-full">
                    <ResizablePanelGroup direction="horizontal" className="w-full">
                        <ResizablePanel defaultSize={75} minSize={30} className="flex flex-col"
                                        style={{overflow: 'auto'}}>
                            <div className="flex-none">
                                <VideoPlayer roomCode={roomCode}/>
                            </div>
                            <Participants roomCode={roomCode} username={username}/>
                        </ResizablePanel>

                        <ResizableHandle withHandle/>

                        <ResizablePanel defaultSize={25} minSize={20} className="border-l border-gray-700 bg-gray-900">
                            <Chat roomCode={roomCode} username={username}/>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </div>
    );
}
