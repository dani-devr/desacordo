import React, { useState } from 'react';
import { Channel, User, Server, ChannelType } from '../types';
import { socketService } from '../services/socketService';
import VoiceControlPanel from './VoiceControlPanel';

interface ChannelSidebarProps {
  server?: Server;
  currentChannel: Channel;
  onSelectChannel: (channel: Channel) => void;
  currentUser: User;
  isHome: boolean;
  dmChannels: Channel[];
  onOpenServerSettings: () => void;
  onOpenUserSettings: () => void;
  notifications: Record<string, number>;
  activeVoiceChannelId?: string;
  onJoinVoice?: (channel: Channel) => void;
  onLeaveVoice?: () => void;
  allUsers?: User[]; // Needed to show voice participants
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ 
  server, 
  currentChannel, 
  onSelectChannel,
  currentUser,
  isHome,
  dmChannels,
  onOpenServerSettings,
  onOpenUserSettings,
  notifications,
  activeVoiceChannelId,
  onJoinVoice,
  onLeaveVoice,
  allUsers = []
}) => {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>(ChannelType.TEXT);

  // Permission Check
  const canCreateChannel = isHome ? false : server && (
      server.ownerId === currentUser.id ||
      server.roles.some(r => 
        server.userRoles?.[currentUser.id]?.includes(r.id) && 
        (r.permissions.includes('ADMIN') || r.permissions.includes('MANAGE_CHANNELS'))
      )
  );

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelName.trim() && server) {
        socketService.createChannel(server.id, newChannelName.trim(), newChannelType as 'TEXT' | 'VOICE', currentUser.id);
        setNewChannelName('');
        setShowCreateChannel(false);
        setNewChannelType(ChannelType.TEXT);
    }
  };

  const textChannels = server?.channels.filter(c => c.type === ChannelType.TEXT) || [];
  const voiceChannels = server?.channels.filter(c => c.type === ChannelType.VOICE) || [];

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col flex-shrink-0">
      {/* Header */}
      <div 
        onClick={() => !isHome && onOpenServerSettings()}
        className={`h-12 shadow-sm border-b border-[#1f2023] flex items-center px-4 hover:bg-[#35373c] cursor-pointer transition-colors relative ${!isHome ? 'hover:bg-[#35373c]' : ''}`}
      >
        {isHome ? (
           <input 
             className="bg-[#1e1f22] text-sm text-[#dbdee1] rounded px-2 py-1 w-full outline-none" 
             placeholder="Find or start a conversation" 
             onClick={(e) => e.stopPropagation()}
           />
        ) : (
          <>
            <h1 className="font-bold text-white truncate max-w-[180px]">{server?.name}</h1>
            <svg className="ml-auto text-white" width="18" height="18" viewBox="0 0 24 24">
               {/* Chevron */}
               <path fill="currentColor" d="M16.59 8.59003L12 13.17L7.41003 8.59003L6 10L12 16L18 10L16.59 8.59003Z"/>
            </svg>
          </>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {isHome ? (
           <>
              <div className="pt-2 px-2 pb-1 flex items-center text-[#949BA4] text-xs font-bold uppercase tracking-wide">
                Direct Messages
              </div>
              {dmChannels.map(dm => {
                const notif = notifications[dm.id] || 0;
                return (
                  <button
                    key={dm.id}
                    onClick={() => onSelectChannel(dm)}
                    className={`w-full flex items-center px-2 py-2 rounded mx-1 group transition-colors relative ${
                      currentChannel.id === dm.id ? 'bg-[#404249] text-white' : 'text-[#949BA4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center mr-2 text-white font-bold text-xs shrink-0">
                      {dm.name.substring(0,2).toUpperCase()}
                    </div>
                    <span className={`font-medium truncate ${currentChannel.id === dm.id || notif > 0 ? 'text-white' : ''} ${notif > 0 ? 'font-bold' : ''}`}>
                      {dm.name}
                    </span>
                    {notif > 0 && (
                        <div className="ml-auto bg-[#f23f42] text-white text-[10px] font-bold px-1.5 rounded-full">{notif}</div>
                    )}
                  </button>
                );
              })}
           </>
        ) : (
          <>
             {/* TEXT CHANNELS */}
             <div className="pt-2 px-2 pb-1 flex items-center justify-between text-[#949BA4] hover:text-[#dbdee1] group cursor-pointer text-xs font-bold uppercase tracking-wide">
               <div className="flex items-center">
                 <svg className="mr-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                 Text Channels
               </div>
               {canCreateChannel && (
                   <button 
                      onClick={() => { setShowCreateChannel(true); setNewChannelType(ChannelType.TEXT); }}
                      className="text-[#949BA4] hover:text-white"
                   >
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                   </button>
               )}
             </div>

             {textChannels.map((channel) => {
              const notif = notifications[channel.id] || 0;
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={`w-full flex items-center px-2 py-1.5 rounded mx-1 group transition-colors ${
                    currentChannel.id === channel.id
                      ? 'bg-[#404249] text-white'
                      : 'text-[#949BA4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                  }`}
                >
                  <div className="text-xl mr-1.5 text-[#80848E] font-light">#</div>
                  <span className={`font-medium truncate ${currentChannel.id === channel.id || notif > 0 ? 'text-white' : ''} ${notif > 0 ? 'font-bold' : ''}`}>
                    {channel.name}
                  </span>
                  {notif > 0 && <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>}
                </button>
              );
            })}

            {/* VOICE CHANNELS */}
            <div className="pt-4 px-2 pb-1 flex items-center justify-between text-[#949BA4] hover:text-[#dbdee1] group cursor-pointer text-xs font-bold uppercase tracking-wide">
               <div className="flex items-center">
                 <svg className="mr-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                 Voice Channels
               </div>
               {canCreateChannel && (
                   <button 
                      onClick={() => { setShowCreateChannel(true); setNewChannelType(ChannelType.VOICE); }}
                      className="text-[#949BA4] hover:text-white"
                   >
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                   </button>
               )}
             </div>

             {voiceChannels.map((channel) => {
              const isConnected = activeVoiceChannelId === channel.id;
              return (
                <div key={channel.id} className="mb-1">
                    <button
                        onClick={() => onJoinVoice?.(channel)}
                        className={`w-full flex items-center px-2 py-1.5 rounded mx-1 group transition-colors ${
                            isConnected ? 'bg-[#404249]/60 text-white' : 'text-[#949BA4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                        }`}
                    >
                        <svg className="mr-1.5" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2zm5 10v-2c0-.55-.45-1-1-1s-1 .45-1 1v2c0 1.66-1.34 3-3 3s-3-1.34-3-3v-2c0-.55-.45-1-1-1s-1 .45-1 1v2c0 2.76 2.24 5 5 5s5-2.24 5-5z"/></svg>
                        <span className="font-medium truncate">{channel.name}</span>
                    </button>
                    {/* Participants List */}
                    {channel.connectedUserIds && channel.connectedUserIds.length > 0 && (
                        <div className="ml-8 mt-1 space-y-1">
                            {channel.connectedUserIds.map(uid => {
                                const participant = allUsers?.find(u => u.id === uid);
                                if (!participant) return null;
                                return (
                                    <div key={uid} className="flex items-center px-2 py-0.5 rounded hover:bg-[#35373c]/50">
                                        <img src={participant.avatarUrl} className={`w-5 h-5 rounded-full mr-2 ${participant.id === currentUser.id ? 'border-green-500 border' : ''}`} />
                                        <span className="text-white text-xs truncate opacity-70">{participant.username}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
              );
            })}
          </>
        )}

         {showCreateChannel && (
             <div className="px-2 mb-2 bg-[#313338] p-2 rounded mx-1 border border-[#1e1f22]">
                 <div className="text-xs text-[#b5bac1] font-bold mb-1">CHANNEL TYPE</div>
                 <div className="flex gap-2 mb-2">
                     <button 
                        type="button" 
                        onClick={() => setNewChannelType(ChannelType.TEXT)}
                        className={`flex-1 py-1 rounded text-xs font-bold border ${newChannelType === ChannelType.TEXT ? 'bg-[#404249] text-white border-transparent' : 'text-[#b5bac1] border-[#404249]'}`}
                     >TEXT</button>
                     <button 
                        type="button" 
                        onClick={() => setNewChannelType(ChannelType.VOICE)}
                        className={`flex-1 py-1 rounded text-xs font-bold border ${newChannelType === ChannelType.VOICE ? 'bg-[#404249] text-white border-transparent' : 'text-[#b5bac1] border-[#404249]'}`}
                     >VOICE</button>
                 </div>
                 <form onSubmit={handleCreateChannel}>
                     <input 
                        autoFocus
                        className="w-full bg-[#1e1f22] text-[#dbdee1] text-sm rounded px-2 py-1 outline-none border border-[#00A8FC]" 
                        placeholder="new-channel"
                        value={newChannelName}
                        onChange={e => setNewChannelName(e.target.value)}
                        onBlur={() => !newChannelName && setShowCreateChannel(false)}
                     />
                 </form>
             </div>
         )}
      </div>

      {/* Voice Connection Bar */}
      {activeVoiceChannelId && (
          <VoiceControlPanel 
             onDisconnect={() => onLeaveVoice?.()} 
             currentUser={currentUser}
             channelName={voiceChannels.find(c => c.id === activeVoiceChannelId)?.name || 'Voice Channel'}
          />
      )}

      {/* User Bar */}
      <div className="bg-[#232428] px-2 py-1.5 flex items-center">
        <div className="relative group cursor-pointer mr-2" onClick={onOpenUserSettings}>
           <img 
            src={currentUser.avatarUrl} 
            alt={currentUser.username} 
            className="w-8 h-8 rounded-full object-cover bg-gray-500 hover:opacity-80"
          />
          <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#232428] rounded-full ${currentUser.status === 'offline' ? 'bg-gray-500' : 'bg-green-500'}`}></div>
        </div>
        <div className="flex-1 min-w-0 mr-1 cursor-pointer" onClick={onOpenUserSettings}>
          <div className="text-white text-sm font-medium truncate hover:underline flex items-center">
              {currentUser.username}
              {currentUser.isNitro && <span className="ml-1 text-[#f47fff] text-[10px]">♦</span>}
          </div>
          <div className="text-[#b5bac1] text-xs truncate">#{currentUser.id.substring(0,4)}</div>
        </div>
        <div className="flex">
          <button onClick={onOpenUserSettings} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4147] text-[#b5bac1] hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;