import React from 'react';
import { Channel, User, ChannelType, Server } from '../types';

interface ChannelSidebarProps {
  server: Server;
  currentChannel: Channel;
  onSelectChannel: (channel: Channel) => void;
  currentUser: User;
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ 
  server, 
  currentChannel, 
  onSelectChannel,
  currentUser
}) => {
  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col flex-shrink-0">
      {/* Server Header */}
      <div className="h-12 shadow-sm border-b border-[#1f2023] flex items-center px-4 hover:bg-[#35373c] cursor-pointer transition-colors">
        <h1 className="font-bold text-white truncate max-w-[180px]">{server.name}</h1>
        <svg className="ml-auto text-white" width="18" height="18" viewBox="0 0 24 24">
           <path fill="currentColor" d="M16.59 8.59003L12 13.17L7.41003 8.59003L6 10L12 16L18 10L16.59 8.59003Z"/>
        </svg>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        
        <div className="pt-2 px-2 pb-1 flex items-center text-[#949BA4] hover:text-[#dbdee1] cursor-pointer text-xs font-bold uppercase tracking-wide">
          <svg className="mr-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          Text Channels
        </div>

        {server.channels.map((channel) => (
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
            <span className={`font-medium truncate ${currentChannel.id === channel.id ? 'text-white' : ''}`}>
              {channel.name}
            </span>
          </button>
        ))}
      </div>

      {/* User Bar */}
      <div className="bg-[#232428] px-2 py-1.5 flex items-center">
        <div className="relative group cursor-pointer mr-2">
           <img 
            src={currentUser.avatarUrl} 
            alt={currentUser.username} 
            className="w-8 h-8 rounded-full object-cover bg-gray-500"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#232428] rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0 mr-1">
          <div className="text-white text-sm font-medium truncate">{currentUser.username}</div>
          <div className="text-[#b5bac1] text-xs truncate">Online</div>
        </div>
        <div className="flex">
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4147] text-[#b5bac1] hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11H5a1 1 0 000 2h14a1 1 0 000-2z" /></svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#3f4147] text-[#b5bac1] hover:text-white transition-colors">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;