import React, { useState, useEffect, useCallback } from 'react';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import Auth from './components/Auth';
import CreateServerModal from './components/CreateServerModal';
import { User, Message, Server, Channel, ChannelType } from './types';
import { socketService } from './services/socketService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('HOME'); 
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  
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

      socketService.onSyncUsers((users) => setAllUsers(users));
      
      socketService.onUserRegistered((newUser) => {
         setAllUsers(prev => {
            if (prev.find(u => u.id === newUser.id)) return prev;
            return [...prev, newUser];
         });
      });

      socketService.onSyncServers((syncedServers) => {
        setServers(syncedServers);
      });

      socketService.onSyncDMs((syncedDMs) => {
         setDmChannels(syncedDMs);
      });

      socketService.onNewDMOpened((newDM) => {
         setDmChannels(prev => {
           if (prev.find(d => d.id === newDM.id)) return prev;
           return [newDM, ...prev];
         });
      });

      socketService.onUserStatusChange(({ userId, status }) => {
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
      });

      socketService.onReceiveMessage((newMessage) => {
        setMessages(prev => ({
          ...prev,
          [newMessage.channelId]: [...(prev[newMessage.channelId] || []), newMessage]
        }));
      });

      socketService.onChannelHistory(({ channelId, messages: history }) => {
        setMessages(prev => ({
          ...prev,
          [channelId]: history
        }));
      });

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
    socketService.joinChannel(channelId);
  };

  // Set initial channel when changing server
  useEffect(() => {
    if (activeServerId !== 'HOME' && activeServer) {
       // If currentChannelId is not in this server, default to first channel
       const exists = activeServer.channels.find(c => c.id === currentChannelId);
       if (!exists && activeServer.channels.length > 0) {
          handleSwitchChannel(activeServer.channels[0].id);
       } else if (exists) {
           handleSwitchChannel(exists.id);
       }
    }
  }, [activeServerId, activeServer]);

  // --- DM LOGIC ---
  const startDM = (targetUser: User) => {
    if (targetUser.id === user?.id) return; 

    // Deterministic ID
    const channelId = [user!.id, targetUser.id].sort().join('_');
    
    // Check if we already have it locally
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

  const handleAddFriend = (friendId: string) => {
     if(user) socketService.addFriend(user.id, friendId);
  };

  const handleCreateServer = (serverData: any) => {
     if(user) {
        socketService.createServer(serverData.name, user.id);
        setShowCreateServer(false);
     }
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

  const handleSendMessage = useCallback((content: string, attachments?: any[]) => {
    if (!user) return;
    const channelObj = getActiveChannelObject();
    
    const newMessage: Partial<Message> = {
      id: crypto.randomUUID(),
      content,
      senderId: user.id,
      channelId: channelObj.id,
      timestamp: new Date().toISOString(),
      attachments: attachments || []
    };

    socketService.sendMessage(newMessage);
  }, [user, activeServerId, activeDmId, currentChannelId, activeServer]);

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const activeChannelObj = getActiveChannelObject();
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
        server={activeServer}
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
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#313338] p-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-[#383a40] rounded-full mx-auto mb-6 flex items-center justify-center">
               <span className="text-4xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome Back, {user.username}!</h2>
            <p className="text-[#949ba4] max-w-md mx-auto">
              Select a DM from the left or a server to start chatting. You can add friends from the member list on the right.
            </p>
          </div>
        </div>
      )}
      
      {/* MEMBER LIST */}
      <div className="w-60 bg-[#2b2d31] hidden lg:flex flex-col flex-shrink-0 p-3 overflow-y-auto custom-scrollbar">
        <h2 className="text-[#949BA4] text-xs font-bold uppercase tracking-wide mb-2 mt-2 px-2">
           Members — {sortedUsers.length}
        </h2>

        {sortedUsers.map((u) => (
             <div 
               key={u.id} 
               className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer opacity-100 group transition-colors relative"
               onClick={() => startDM(u)}
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
             
             {/* Simple Add Friend Button (Hover) */}
             {u.id !== user.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAddFriend(u.id); }}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 text-[#b5bac1] hover:text-green-500"
                  title="Add Friend"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </button>
             )}
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