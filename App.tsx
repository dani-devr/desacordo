import React, { useState, useEffect, useCallback } from 'react';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import Auth from './components/Auth';
import CreateServerModal from './components/CreateServerModal';
import { User, Message, Server, Channel, ChannelType } from './types';
import { DEFAULT_SERVERS } from './constants';
import { socketService } from './services/socketService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>(DEFAULT_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('HOME'); // 'HOME' is for DMs
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Synced from server
  
  // DMs State
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  const [activeDmId, setActiveDmId] = useState<string>('');

  // Standard Server State
  const activeServer = servers.find(s => s.id === activeServerId);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');

  // Messages State
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  
  // Typing State
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<User | undefined>(undefined);

  // --- CONNECT & SYNC ---
  useEffect(() => {
    if (user) {
      socketService.connect(user);

      // 1. Sync User List (Registered Users)
      socketService.onSyncUsers((users) => {
        setAllUsers(users);
      });

      // 2. Listen for Real-time Status Changes
      socketService.onUserStatusChange(({ userId, status }) => {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
      });

      // 3. Receive Messages
      socketService.onReceiveMessage((newMessage) => {
        setMessages(prev => ({
          ...prev,
          [newMessage.channelId]: [...(prev[newMessage.channelId] || []), newMessage]
        }));
      });

      // 4. Receive History when joining a channel
      socketService.onChannelHistory(({ channelId, messages: history }) => {
        setMessages(prev => ({
          ...prev,
          [channelId]: history
        }));
      });

      // 5. Typing Indicators
      socketService.onTyping((data) => {
         const currentId = activeServerId === 'HOME' ? activeDmId : currentChannelId;
         if (data.channelId === currentId) {
             const tUser = allUsers.find(u => u.username === data.username);
             setTypingUser(tUser);
             setIsSomeoneTyping(true);
             setTimeout(() => {
               setIsSomeoneTyping(false);
               setTypingUser(undefined);
             }, 3000);
         }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [user]);

  // --- CHANNEL SWITCHING LOGIC ---
  const handleSwitchChannel = (channelId: string) => {
    if (activeServerId === 'HOME') {
      setActiveDmId(channelId);
    } else {
      setCurrentChannelId(channelId);
    }
    // Join socket room to receive messages/history
    socketService.joinChannel(channelId);
  };

  // Set initial channel when changing server
  useEffect(() => {
    if (activeServerId !== 'HOME' && activeServer) {
       handleSwitchChannel(activeServer.channels[0].id);
    }
  }, [activeServerId]);

  // --- DM LOGIC ---
  const startDM = (targetUser: User) => {
    if (targetUser.id === user?.id) return; // Can't DM self

    // Create a deterministic Channel ID based on user IDs
    const channelId = [user!.id, targetUser.id].sort().join('_');
    
    // Check if DM exists locally
    const existing = dmChannels.find(c => c.id === channelId);
    if (!existing) {
      const newDm: Channel = {
        id: channelId,
        name: targetUser.username,
        type: ChannelType.DM,
        recipientId: targetUser.id
      };
      setDmChannels(prev => [newDm, ...prev]);
    }
    
    setActiveServerId('HOME');
    setActiveDmId(channelId);
    socketService.joinChannel(channelId);
  };

  // --- RENDERING HELPERS ---
  const getActiveChannelObject = (): Channel => {
    if (activeServerId === 'HOME') {
      return dmChannels.find(c => c.id === activeDmId) || {
         id: 'home-placeholder', name: 'Friends', type: ChannelType.TEXT, description: 'Select a friend to chat'
      };
    }
    return activeServer?.channels.find(c => c.id === currentChannelId) || activeServer!.channels[0];
  };

  const handleSendMessage = useCallback((content: string) => {
    if (!user) return;
    const channelObj = getActiveChannelObject();
    
    // Optimistic UI Update (optional, but good for perceived speed)
    // We rely on server echo for truth, but this makes it feel snappy
    // Actually, for history sync consistency, let's wait for server echo unless laggy.
    
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content,
      senderId: user.id, // ID only for transport
      sender: user,      // Full object for immediate local display if we wanted
      timestamp: new Date().toISOString(),
      channelId: channelObj.id
    };

    socketService.sendMessage(newMessage);
  }, [user, activeServerId, activeDmId, currentChannelId]);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const activeChannelObj = getActiveChannelObject();

  // Sort users: Online first, then offline
  const sortedUsers = [...allUsers].sort((a, b) => {
    if (a.status === b.status) return a.username.localeCompare(b.username);
    return a.status === 'online' ? -1 : 1;
  });

  return (
    <div className="flex h-screen bg-[#313338] overflow-hidden text-[#dbdee1]">
      <ServerSidebar 
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={(s) => setActiveServerId(s.id)}
        onAddServer={() => setShowCreateServer(true)}
        onSelectHome={() => setActiveServerId('HOME')}
      />
      
      <ChannelSidebar 
        server={activeServer} // Undefined if HOME
        currentChannel={activeChannelObj}
        onSelectChannel={(c) => handleSwitchChannel(c.id)}
        currentUser={user}
        isHome={activeServerId === 'HOME'}
        dmChannels={dmChannels}
      />
      
      {activeChannelObj.id !== 'home-placeholder' ? (
        <ChatArea 
          channel={activeChannelObj}
          messages={messages[activeChannelObj.id] || []}
          onSendMessage={handleSendMessage}
          isTyping={isSomeoneTyping}
          typingUser={typingUser}
          onlineUsers={allUsers.filter(u => u.status === 'online')}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[#313338]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Wumpus is waiting...</h2>
            <p className="text-[#949ba4]">Select a friend from the right to start a DM.</p>
          </div>
        </div>
      )}
      
      {/* MEMBER LIST (Available in both Server and DM view for simplicity) */}
      <div className="w-60 bg-[#2b2d31] hidden lg:flex flex-col flex-shrink-0 p-3 overflow-y-auto custom-scrollbar">
        <h2 className="text-[#949BA4] text-xs font-bold uppercase tracking-wide mb-2 mt-2 px-2">
           Members — {sortedUsers.length}
        </h2>

        {sortedUsers.map((u) => (
             <div 
               key={u.id} 
               onClick={() => startDM(u)}
               className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer opacity-100 group transition-colors"
             >
             <div className="relative mr-3">
               <img src={u.avatarUrl} alt={u.username} className={`w-8 h-8 rounded-full ${u.status === 'offline' ? 'opacity-50' : ''}`} />
               <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#2b2d31] rounded-full ${u.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
             </div>
             <div>
               <div className={`font-medium text-sm ${u.status === 'offline' ? 'text-[#949ba4]' : 'text-white'}`} style={{ color: u.color }}>
                 {u.username} {u.id === user.id && '(You)'}
               </div>
               {u.isBot && <span className="bg-[#5865F2] text-white text-[10px] px-1 rounded uppercase ml-1">Bot</span>}
             </div>
          </div>
         ))}
      </div>

      {showCreateServer && (
        <CreateServerModal 
            onClose={() => setShowCreateServer(false)}
            onCreate={(s) => {
              setServers([...servers, s]);
              setActiveServerId(s.id);
            }}
        />
      )}
    </div>
  );
};

export default App;