import React, { useState, useEffect, useCallback } from 'react';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import UserSetup from './components/UserSetup';
import CreateServerModal from './components/CreateServerModal';
import { User, Channel, Message, Server } from './types';
import { DEFAULT_SERVERS, BOT_GENERAL, BOT_DEV, BOT_CASUAL, MOCK_USERS, getInitialMessages } from './constants';
import { geminiService } from './services/geminiService';
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
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<User | undefined>(undefined);

  // Helper to get the correct bot for the channel
  const getCurrentBot = (channelName: string): User => {
    switch (channelName) {
      case 'coding-help': return BOT_DEV;
      case 'random': return BOT_CASUAL;
      default: return BOT_GENERAL;
    }
  };

  const getHistoryContext = (channelId: string) => {
    const history = messages[channelId] || [];
    const recent = history.slice(-10);
    return recent.map(m => `[${m.sender.username}]: ${m.content}`).join('\n');
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
         // Simple visual indicator if it's the current channel
         if (data.channelId === currentChannelId) {
             // In a real app we'd map username to a user object or look it up
             // For now we just show the bot as typing placeholder or nothing
             // Implementation for real user typing indicator is complex without full user map
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

  // Re-initialize Gemini when channel changes
  useEffect(() => {
    const historyContext = getHistoryContext(currentChannel.id);
    geminiService.initializeChat(currentChannel.systemInstruction, historyContext);
  }, [currentChannel]);

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

    // 1. Send to Socket (so other people see it)
    socketService.sendMessage(newMessage);

    // 2. Add to local state immediately (Optimistic UI)
    // Note: In a real production app, you might wait for server ack, 
    // but for chat, optimistic is snappy.
    // However, since we listen to 'receive_message', we need to make sure we don't duplicate.
    // The server broadcast usually sends to everyone including sender, OR we filter it.
    // For this simple implementation, let's assume the server broadcasts to everyone.
    // So we DON'T add it here manually to avoid duplication, OR we rely on ID checks.
    // To make it feel instant, we add it, but our socket listener might need a check.
    // Let's stick to: Socket broadcasts, we listen. 
    // BUT for instant feel, let's add it, and ensure our ID check in render handles dups or just ignore self-broadcasts in socketService?
    // Let's Keep it simple: Add locally, but checking if the bot needs to reply is separate.
    
    // We actually need to manually add it because socket.io default broadcast usually excludes sender unless coded otherwise.
    // Our server.js does `io.to(...).emit` which INCLUDES sender.
    // So we do NOT add it here, we let the socket listener handle it.
    // EXCEPT: If server is down, user sees nothing. 
    // Let's add it locally for best UX, and assume our setState logic handles duplicates if any, 
    // or rely on the server logic I wrote `io.to` which sends to all.
    // Actually, `io.to(channel).emit` sends to everyone. 
    // So I will NOT `setMessages` here directly to avoid double message.
    // Wait, `socket.io-client` usually handles this fast.
    
    // HOWEVER: For the AI BOT to work, it needs to be triggered.
    
    // Check if Bot should reply
    const currentBot = getCurrentBot(currentChannel.name);
    const isBotMentioned = content.includes(`@${currentBot.username}`) || content.includes('@everyone');
    
    if (isBotMentioned || currentChannel.name === 'coding-help') {
       setIsAiTyping(true);
       setTypingUser(currentBot);

       const botMessageId = crypto.randomUUID();
       let fullBotResponse = '';

       // Create placeholder for Bot
       const botMsgPlaceholder: Message = {
            id: botMessageId,
            content: '',
            sender: currentBot,
            timestamp: new Date(),
            channelId
       };
       
       // We add placeholder immediately
       setMessages(prev => ({
           ...prev,
           [channelId]: [...(prev[channelId] || []), botMsgPlaceholder]
       }));

       try {
           const stream = geminiService.sendMessageStream(content);
           
           for await (const chunk of stream) {
               fullBotResponse += chunk;
               
               setMessages(prev => {
                   const channelMessages = prev[channelId] || [];
                   const updatedMessages = channelMessages.map(msg => 
                       msg.id === botMessageId 
                           ? { ...msg, content: fullBotResponse }
                           : msg
                   );
                   return { ...prev, [channelId]: updatedMessages };
               });
           }
           
           // After bot finishes, we could optionally emit this bot message to socket 
           // so OTHER users see the bot response too!
           // This makes the AI shared.
           const completedBotMsg = { ...botMsgPlaceholder, content: fullBotResponse };
           socketService.sendMessage(completedBotMsg);

       } catch (error) {
           console.error("Error fetching AI response", error);
       } finally {
           setIsAiTyping(false);
           setTypingUser(undefined);
       }
    }

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
        isTyping={isAiTyping}
        typingUser={typingUser}
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
