import React, { useState, useEffect, useCallback, useRef } from 'react';
import ServerSidebar from './components/ServerSidebar';
import ChannelSidebar from './components/ChannelSidebar';
import ChatArea from './components/ChatArea';
import Auth from './components/Auth';
import CreateServerModal from './components/CreateServerModal';
import ServerSettingsModal from './components/ServerSettingsModal';
import UserSettingsModal from './components/UserSettingsModal';
import UserProfileModal from './components/UserProfileModal';
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
  
  // Profile Viewer
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  const [activeDmId, setActiveDmId] = useState<string>('');
  
  // Friend State
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Notifications: channelId -> count
  const [notifications, setNotifications] = useState<Record<string, number>>({});

  // Voice State
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | undefined>(undefined);

  const activeServer = servers.find(s => s.id === activeServerId);
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<User | undefined>(undefined);

  // Refs for tracking current view state inside callbacks
  const activeServerIdRef = useRef(activeServerId);
  const activeDmIdRef = useRef(activeDmId);
  const currentChannelIdRef = useRef(currentChannelId);

  useEffect(() => { activeServerIdRef.current = activeServerId; }, [activeServerId]);
  useEffect(() => { activeDmIdRef.current = activeDmId; }, [activeDmId]);
  useEffect(() => { currentChannelIdRef.current = currentChannelId; }, [currentChannelId]);

  // --- PERSISTENCE ---
  useEffect(() => {
    const savedUser = localStorage.getItem('discordia_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('discordia_user');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('discordia_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('discordia_user');
    }
  }, [user]);

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
      
      socketService.onUserUpdated((updatedUser) => {
        setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (updatedUser.id === user.id) {
            setUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
        }
      });
      
      socketService.onSyncServers(setServers);
      socketService.onServerJoined((s) => setServers(prev => [...prev, s]));
      socketService.onServerUpdated((s) => setServers(prev => prev.map(srv => srv.id === s.id ? s : srv)));

      socketService.onSyncDMs(setDmChannels);
      socketService.onNewDMOpened((newDM) => setDmChannels(prev => prev.find(d => d.id === newDM.id) ? prev : [newDM, ...prev]));

      socketService.onUserStatusChange(({ userId, status }) => setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u)));

      socketService.onReceiveMessage((newMessage) => {
        setMessages(prev => ({ ...prev, [newMessage.channelId]: [...(prev[newMessage.channelId] || []), newMessage] }));
        
        // Handle Notification - Use Refs to get current state
        const sId = activeServerIdRef.current;
        const dId = activeDmIdRef.current;
        const cId = currentChannelIdRef.current;

        const isCurrentChannel = sId === 'HOME' 
            ? dId === newMessage.channelId 
            : cId === newMessage.channelId;

        if (!isCurrentChannel && newMessage.senderId !== user.id) {
            // Check for mention safely
            const content = newMessage.content || "";
            const isMentioned = content.includes(`@${user.username}`);
            if (isMentioned || newMessage.channelId.includes('_')) { // Mention or DM
                setNotifications(prev => ({
                    ...prev,
                    [newMessage.channelId]: (prev[newMessage.channelId] || 0) + 1
                }));
            }
        }
      });
      
      socketService.onChannelHistory(({ channelId, messages: history }) => setMessages(prev => ({ ...prev, [channelId]: history })));

      socketService.onSyncFriendRequests(setFriendRequests);
      socketService.onNewFriendRequest((req) => setFriendRequests(prev => [...prev, req]));
      socketService.onFriendListUpdated((ids) => {
          setUser(prev => prev ? { ...prev, friendIds: ids } : null);
          setFriendRequests(prev => prev.filter(r => !(ids.includes(r.fromUserId) || ids.includes(r.toUserId))));
      });

      socketService.onTyping((data) => {
         const currentId = activeServerIdRef.current === 'HOME' ? activeDmIdRef.current : currentChannelIdRef.current;
         if (data.channelId === currentId) {
             const tUser = allUsers.find(u => u.username === data.username);
             setTypingUser(tUser); setIsSomeoneTyping(true);
             setTimeout(() => { setIsSomeoneTyping(false); setTypingUser(undefined); }, 3000);
         }
      });
      socketService.onError((msg) => alert(msg));

      return () => { socketService.disconnect(); };
    }
  }, [user?.id]); 

  // --- ACTIONS ---
  const handleSwitchChannel = (channelId: string) => {
    if (activeServerId === 'HOME') {
        setActiveDmId(channelId);
    } else {
        setCurrentChannelId(channelId);
    }
    // Clear notifications
    setNotifications(prev => {
        const n = { ...prev };
        delete n[channelId];
        return n;
    });
    socketService.joinChannel(channelId);
  };

  const handleSelectHome = () => {
      setActiveServerId('HOME');
      setActiveDmId(''); // Clears DM selection to show FriendList
  };

  useEffect(() => {
    if (activeServerId !== 'HOME' && activeServer) {
       const exists = activeServer.channels.find(c => c.id === currentChannelId);
       if (!exists && activeServer.channels.length > 0) {
           const firstText = activeServer.channels.find(c => c.type === 'TEXT') || activeServer.channels[0];
           handleSwitchChannel(firstText.id);
       }
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
    setActiveServerId('HOME'); 
    handleSwitchChannel(channelId);
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

  // Voice Handlers
  const handleJoinVoice = (channel: Channel) => {
      if (!user || !activeServerId) return;
      if (activeVoiceChannelId) {
          socketService.leaveVoice(activeServerId, activeVoiceChannelId, user.id);
      }
      setActiveVoiceChannelId(channel.id);
      socketService.joinVoice(activeServerId, channel.id, user.id);
  };

  const handleLeaveVoice = () => {
      if (!user || !activeServerId || !activeVoiceChannelId) return;
      socketService.leaveVoice(activeServerId, activeVoiceChannelId, user.id);
      setActiveVoiceChannelId(undefined);
  };

  if (!user) return <Auth onLogin={setUser} />;

  const activeChannelObj = activeServerId === 'HOME' ? dmChannels.find(c => c.id === activeDmId) : activeServer?.channels.find(c => c.id === currentChannelId);
  const friends = allUsers.filter(u => user.friendIds?.includes(u.id));

  // Determine potential ping targets for the current channel
  const mentionableUsers = activeServerId === 'HOME' 
    ? allUsers // DMs: can mention anyone basically, or restrict to friends
    : allUsers.filter(u => activeServer?.memberIds.includes(u.id));

  return (
    <div className="flex h-screen bg-[#313338] overflow-hidden text-[#dbdee1]">
      <ServerSidebar 
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={(s) => setActiveServerId(s.id)}
        onAddServer={() => setShowCreateServer(true)}
        onSelectHome={handleSelectHome}
        notifications={notifications}
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
        notifications={notifications}
        activeVoiceChannelId={activeVoiceChannelId}
        onJoinVoice={handleJoinVoice}
        onLeaveVoice={handleLeaveVoice}
        allUsers={allUsers}
      />
      
      {activeServerId === 'HOME' && !activeDmId ? (
          <FriendList 
             friendRequests={friendRequests}
             friends={friends}
             allUsers={allUsers}
             currentUser={user}
             onUserClick={(u) => setSelectedUser(u)}
          />
      ) : activeChannelObj ? (
        <ChatArea 
          channel={activeChannelObj}
          messages={messages[activeChannelObj.id] || []}
          onSendMessage={handleSendMessage}
          isTyping={isSomeoneTyping}
          typingUser={typingUser}
          onUserClick={(u) => setSelectedUser(u)}
          mentionableUsers={mentionableUsers}
          currentUser={user}
        />
      ) : (
        <div className="flex-1 bg-[#313338]" />
      )}
      
      {/* MEMBER LIST (Only for Servers) */}
      {activeServerId !== 'HOME' && activeServer && (
        <div className="w-60 bg-[#2b2d31] hidden lg:flex flex-col flex-shrink-0 p-3 overflow-y-auto custom-scrollbar">
          <h2 className="text-[#949BA4] text-xs font-bold uppercase tracking-wide mb-2 mt-2 px-2">Members</h2>
          {allUsers.filter(u => activeServer.memberIds?.includes(u.id)).map((u) => (
             <div key={u.id} className="flex items-center px-2 py-2 rounded hover:bg-[#35373c] cursor-pointer group relative" onClick={() => setSelectedUser(u)}>
             <div className="relative mr-3">
               <img src={u.avatarUrl} className={`w-8 h-8 rounded-full ${u.status === 'offline' ? 'opacity-50' : ''}`} />
               <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#2b2d31] rounded-full ${u.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
             </div>
             <div>
                 <div className={`font-medium text-sm ${u.status === 'offline' ? 'text-[#949ba4]' : 'text-white'}`}>
                    {u.username}
                    {u.isNitro && <span className="ml-1 text-[#f47fff] text-[10px]">♦</span>}
                 </div>
             </div>
          </div>
         ))}
        </div>
      )}

      {showCreateServer && <CreateServerModal onClose={() => setShowCreateServer(false)} onCreate={handleCreateServer} />}
      {showServerSettings && activeServer && <ServerSettingsModal server={activeServer} currentUser={user} onClose={() => setShowServerSettings(false)} />}
      {showUserSettings && <UserSettingsModal user={user} onClose={() => setShowUserSettings(false)} />}
      {selectedUser && (
          <UserProfileModal 
              user={selectedUser} 
              currentUser={user} 
              onClose={() => setSelectedUser(null)} 
              server={activeServerId !== 'HOME' ? activeServer : undefined}
              onStartDM={startDM}
          />
      )}
    </div>
  );
};

export default App;