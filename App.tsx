import React, { useState, useEffect, useCallback } from 'react';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import UserSetup from './components/UserSetup';
import CreateServerModal from './components/CreateServerModal';
import { User, Message, Server } from './types';
import { DEFAULT_SERVERS, BOT_GENERAL, BOT_DEV, BOT_CASUAL, MOCK_USERS, getInitialMessages } from './constants';
import { socketService } from './services/socketService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>(DEFAULT_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>(DEFAULT_SERVERS[0].id);
  const [showCreateServer, setShowCreateServer] = useState(false);
  
  // Computed active server and channel
  const activeServer = servers.find(s => s.id === activeServerId) || servers[0];
  const [currentChannelId, setCurrentChannelId] = useState<string>(activeServer.channels[0].id);
  
  const currentChannel = activeServer.channels.find(c => c.id === currentChannelId) || activeServer.channels[0];

  // Store messages per channel ID
  const [messages, setMessages] = useState<Record<string, Message[]>>(getInitialMessages());
  
  // Typing state for real users (placeholder for now as we need robust backend for full typing sync)
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);

  // Helper to get the correct bot for the channel (just for visual sidebar)
  const getCurrentBot = (channelName: string): User => {
    switch (channelName) {
      case 'coding-help': return BOT_DEV;
      case 'random': return BOT_CASUAL;
      default: return BOT_GENERAL;
    }
  };

  // Connect to Socket on User Setup
  useEffect(() => {
    if (user) {
      socketService.connect(user);

      // Listen for incoming messages from other people
      socketService.onReceiveMessage((newMessage) => {
        setMessages(prev => ({
          ...prev,
          [newMessage.channelId]: [...(prev[newMessage.channelId] || []), newMessage]
        }));
      });

      socketService.onTyping((data) => {
         if (data.channelId === currentChannelId) {
             // In a full implementation, we would show who is typing.
             // For now, we just acknowledge the event.
             setIsSomeoneTyping(true);
             setTimeout(() => setIsSomeoneTyping(false), 3000);
         }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [user]);

  // Join Socket Channel
  useEffect(() => {
    if (user) {
      socketService.joinChannel(currentChannelId);
    }
  }, [currentChannelId, user]);

  const handleServerSelect = (server: Server) => {
    setActiveServerId(server.id);
    setCurrentChannelId(server.channels[0].id);
  };

  const handleCreateServer = (newServer: Server) => {
    setServers([...servers, newServer]);
    handleServerSelect(newServer);
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user) return;

    const channelId = currentChannel.id;
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content,
      sender: user,
      timestamp: new Date(),
      channelId
    };

    // Send to Socket (so other people see it and it comes back to us via onReceiveMessage)
    // Note: If you want instant feedback for the sender, you can add it to state here too,
    // but the socket 'receive_message' listener will handle it. 
    // Just ensure the server broadcasts to everyone including sender.
    socketService.sendMessage(newMessage);

  }, [user, currentChannel]);

  if (!user) {
    return <UserSetup onComplete={setUser} />;
  }

  const currentBot = getCurrentBot(currentChannel.name);

  return (
    <div className="flex h-screen bg-[#313338] overflow-hidden">
      <ServerSidebar 
        servers={servers}
        activeServerId={activeServer.id}
        onSelectServer={handleServerSelect}
        onAddServer={() => setShowCreateServer(true)}
      />
      <ChannelSidebar 
        server={activeServer}
        currentChannel={currentChannel}
        onSelectChannel={(c) => setCurrentChannelId(c.id)}
        currentUser={user}
      />
      <ChatArea 
        channel={currentChannel}
        messages={messages[currentChannel.id] || []}
        onSendMessage={handleSendMessage}
        isTyping={isSomeoneTyping}
        typingUser={undefined} // No specific user typing indicator implementation yet
      />
      
      {/* Members Sidebar */}
      <div className="w-60 bg-[#2b2d31] hidden lg:flex flex-col flex-shrink-0 p-3 overflow-y-auto custom-scrollbar">
        <h2 className="text-[#949BA4] text-xs font-bold uppercase tracking-wide mb-2 mt-2 px-2">Bots — 1</h2>
        
        <div className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer opacity-100 group">
           <div className="relative mr-3">
             <img src={currentBot.avatarUrl} alt="bot" className="w-8 h-8 rounded-full" />
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#2b2d31] rounded-full"></div>
           </div>
           <div>
             <div className="text-white font-medium text-sm flex items-center">
                {currentBot.username}
                <span className="ml-1.5 bg-[#5865F2] text-white text-[10px] px-1 rounded-[3px] py-[1px] uppercase font-bold">Bot</span>
             </div>
             <div className="text-[#b5bac1] text-xs group-hover:text-[#dbdee1]">Server Bot</div>
           </div>
        </div>

        <h2 className="text-[#949BA4] text-xs font-bold uppercase tracking-wide mb-2 mt-6 px-2">Online — {MOCK_USERS.length + 1}</h2>

        <div className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer opacity-100 group">
           <div className="relative mr-3">
             <img src={user.avatarUrl} alt="user" className="w-8 h-8 rounded-full" />
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#2b2d31] rounded-full"></div>
           </div>
           <div>
             <div className="text-white font-medium text-sm">
                {user.username}
             </div>
             <div className="text-[#b5bac1] text-xs group-hover:text-[#dbdee1]">Is that you?</div>
           </div>
        </div>

        {MOCK_USERS.map((mockUser) => (
             <div key={mockUser.id} className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer opacity-100 group">
             <div className="relative mr-3">
               <img src={mockUser.avatarUrl} alt={mockUser.username} className="w-8 h-8 rounded-full" />
               <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#2b2d31] rounded-full"></div>
             </div>
             <div>
               <div className="text-white font-medium text-sm" style={{ color: mockUser.color }}>{mockUser.username}</div>
               <div className="text-[#b5bac1] text-xs group-hover:text-[#dbdee1] truncate w-24">Browsing...</div>
             </div>
          </div>
         ))}
      </div>

      {showCreateServer && (
        <CreateServerModal 
            onClose={() => setShowCreateServer(false)}
            onCreate={handleCreateServer}
        />
      )}
    </div>
  );
};

export default App;
