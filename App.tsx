import React, { useState, useEffect, useCallback } from 'react';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import Auth from './components/Auth';
import CreateServerModal from './components/CreateServerModal';
import ServerSettingsModal from './components/ServerSettingsModal';
import UserSettingsModal from './components/UserSettingsModal';
import FriendList from './components/FriendList';
import { User, Message, Server, Channel, ChannelType, FriendRequest } from './types';
import { socketService } from './services/socketService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('HOME'); 
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  const [activeDmId, setActiveDmId] = useState<string>('');
  
  // Friend State
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  const activeServer = servers.find(s => s.id === activeServerId);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<User | undefined>(undefined);

  // --- CONNECT & SYNC ---
  useEffect(() => {
    if (user) {
      socketService.connect(user);

      // Handle Invite Link on Load
      const path = window.location.pathname;
      if (path.startsWith('/invite/')) {
          const code = path.split('/invite/')[1];
          if (code) {
              socketService.joinViaInvite(code, user.id);
              window.history.pushState({}, '', '/'); // Clean URL
          }
      }

      socketService.onSyncUsers((users) => setAllUsers(users));
      socketService.onUserRegistered((newUser) => setAllUsers(prev => prev.find(u => u.id === newUser.id) ? prev : [...prev, newUser]));
      socketService.onUserUpdated((updatedUser) => setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u)));
      
      socketService.onSyncServers(setServers);
      socketService.onServerJoined((s) => setServers(prev => [...prev, s]));
      socketService.onServerUpdated((s) => setServers(prev => prev.map(srv => srv.id === s.id ? s : srv)));

      socketService.onSyncDMs(setDmChannels);
      socketService.onNewDMOpened((newDM) => setDmChannels(prev => prev.find(d => d.id === newDM.id) ? prev : [newDM, ...prev]));

      socketService.onUserStatusChange(({ userId, status }) => setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u)));

      socketService.onReceiveMessage((newMessage) => setMessages(prev => ({ ...prev, [newMessage.channelId]: [...(prev[newMessage.channelId] || []), newMessage] })));
      socketService.onChannelHistory(({ channelId, messages: history }) => setMessages(prev => ({ ...prev, [channelId]: history })));

      socketService.onSyncFriendRequests(setFriendRequests);
      socketService.onNewFriendRequest((req) => setFriendRequests(prev => [...prev, req]));
      socketService.onFriendListUpdated((ids) => {
          // Update local user object friends
          setUser(prev => prev ? { ...prev, friendIds: ids } : null);
          setFriendRequests(prev => prev.filter(r => !(ids.includes(r.fromUserId) || ids.includes(r.toUserId))));
      });

      socketService.onTyping((data) => {
         const currentId = activeServerId === 'HOME' ? activeDmId : currentChannelId;
         if (data.channelId === currentId) {
             const tUser = allUsers.find(u => u.username === data.username);
             setTypingUser(tUser); setIsSomeoneTyping(true);
             setTimeout(() => { setIsSomeoneTyping(false); setTypingUser(undefined); }, 3000);
         }
      });
      socketService.onError((msg) => alert(msg));

      return () => { socketService.disconnect(); };
    }
  }, [user]);

  // --- ACTIONS ---
  const handleSwitchChannel = (channelId: string) => {
    if (activeServerId === 'HOME') setActiveDmId(channelId);
    else setCurrentChannelId(channelId);
    socketService.joinChannel(channelId);
  };

  useEffect(() => {
    if (activeServerId !== 'HOME' && activeServer) {
       const exists = activeServer.channels.find(c => c.id === currentChannelId);
       if (!exists && activeServer.channels.length > 0) handleSwitchChannel(activeServer.channels[0].id);
       else if (exists) handleSwitchChannel(exists.id);
    }
  }, [activeServerId, activeServer]);

  const startDM = (targetUser: User) => {
    if (targetUser.id === user?.id) return; 
    const channelId = [user!.id, targetUser.id].sort().join('_');
    const existing = dmChannels.find(c => c.id === channelId);
    if (!existing) {
      setDmChannels(prev => [{ id: channelId, name: targetUser.username, type: ChannelType.DM, recipientId: targetUser.id }, ...prev]);
    }
    setActiveServerId('HOME'); setActiveDmId(channelId);
    socketService.joinChannel(channelId);
  };

  const handleCreateServer = (data: any) => {
     if(user) {
        socketService.createServer(data.name, user.id, data.iconUrl);
        setShowCreateServer(false);
     }
  };

  const handleSendMessage = useCallback((content: string, attachments?: any[]) => {
    if (!user) return;
    const channelObj = activeServerId === 'HOME' ? dmChannels.find(c => c.id === activeDmId) : activeServer?.channels.find(c => c.id === currentChannelId);
    if (!channelObj) return;

    const newMessage: Partial<Message> = {
      id: crypto.randomUUID(), content, senderId: user.id, channelId: channelObj.id, timestamp: new Date().toISOString(), attachments: attachments || []
    };
    socketService.sendMessage(newMessage);
  }, [user, activeServerId, activeDmId, currentChannelId, activeServer]);

  if (!user) return <Auth onLogin={setUser} />;

  const activeChannelObj = activeServerId === 'HOME' ? dmChannels.find(c => c.id === activeDmId) : activeServer?.channels.find(c => c.id === currentChannelId);
  const friends = allUsers.filter(u => user.friendIds?.includes(u.id));

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
        currentChannel={activeChannelObj || {id: 'temp', name: '', type: ChannelType.TEXT}}
        onSelectChannel={(c) => handleSwitchChannel(c.id)}
        currentUser={user}
        isHome={activeServerId === 'HOME'}
        dmChannels={dmChannels}
        onOpenServerSettings={() => setShowServerSettings(true)}
        onOpenUserSettings={() => setShowUserSettings(true)}
      />
      
      {activeServerId === 'HOME' && !activeDmId ? (
          <FriendList 
             friendRequests={friendRequests}
             friends={friends}
             allUsers={allUsers}
             currentUser={user}
          />
      ) : activeChannelObj ? (
        <ChatArea 
          channel={activeChannelObj}
          messages={messages[activeChannelObj.id] || []}
          onSendMessage={handleSendMessage}
          isTyping={isSomeoneTyping}
          typingUser={typingUser}
        />
      ) : (
        <div className="flex-1 bg-[#313338]" />
      )}
      
      {/* MEMBER LIST (Only for Servers) */}
      {activeServerId !== 'HOME' && activeServer && (
        <div className="w-60 bg-[#2b2d31] hidden lg:flex flex-col flex-shrink-0 p-3 overflow-y-auto custom-scrollbar">
          <h2 className="text-[#949BA4] text-xs font-bold uppercase tracking-wide mb-2 mt-2 px-2">Members</h2>
          {allUsers.filter(u => activeServer.memberIds?.includes(u.id)).map((u) => (
             <div key={u.id} className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer group relative" onClick={() => startDM(u)}>
             <div className="relative mr-3">
               <img src={u.avatarUrl} className={`w-8 h-8 rounded-full ${u.status === 'offline' ? 'opacity-50' : ''}`} />
               <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#2b2d31] rounded-full ${u.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
             </div>
             <div><div className={`font-medium text-sm ${u.status === 'offline' ? 'text-[#949ba4]' : 'text-white'}`}>{u.username}</div></div>
          </div>
         ))}
        </div>
      )}

      {showCreateServer && <CreateServerModal onClose={() => setShowCreateServer(false)} onCreate={handleCreateServer} />}
      {showServerSettings && activeServer && <ServerSettingsModal server={activeServer} currentUser={user} onClose={() => setShowServerSettings(false)} />}
      {showUserSettings && <UserSettingsModal user={user} onClose={() => setShowUserSettings(false)} />}
    </div>
  );
};

export default App;