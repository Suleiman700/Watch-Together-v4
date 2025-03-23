import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { sendChatMessage, addMessageHandler } from "@/lib/websocket";
import { Message } from "@shared/schema";
import { Send } from "lucide-react";

interface ChatProps {
  roomCode: string;
  username: string;
}

export default function Chat({ roomCode, username }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle new messages
    const removeMessageHandler = addMessageHandler('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle sync events for new users joining
    const removeSyncHandler = addMessageHandler('sync', (data) => {
      if (data.messages) {
        setMessages(data.messages);
      }
    });

    return () => {
      removeMessageHandler();
      removeSyncHandler();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMessage.trim() === "") return;
    
    sendChatMessage(roomCode, username, inputMessage);
    setInputMessage("");
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="py-3 px-4 border-b bg-gray-800">
        <h2 className="text-lg font-semibold">Chat</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={index}
            className={`flex items-start space-x-2 ${message.username === username ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div 
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 
                ${message.username === username ? 'bg-indigo-500' : 'bg-purple-500'}`}
            >
              {message.username[0].toUpperCase()}
            </div>
            
            <div 
              className={`rounded-lg p-3 max-w-xs ${
                message.username === username 
                  ? 'bg-indigo-500/20' 
                  : 'bg-gray-800'
              }`}
            >
              <p className="text-xs text-gray-400 mb-1 flex justify-between">
                <span>{message.username === username ? 'You' : message.username}</span>
                {message.timestamp && (
                  <span className="ml-2">{formatTimestamp(message.timestamp)}</span>
                )}
              </p>
              <p className="text-sm">{message.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-gray-800 mt-auto">
        <form className="flex items-center space-x-2 w-full" onSubmit={handleSendMessage}>
          <Input 
            type="text" 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button 
            type="submit"
            size="icon"
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
