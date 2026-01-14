import React from 'react';
import { Server } from '../types';

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (server: Server) => void;
  onAddServer: () => void;
  onSelectHome: () => void;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({ 
  servers, 
  activeServerId, 
  onSelectServer,
  onAddServer,
  onSelectHome
}) => {
  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 overflow-y-auto h-full flex-shrink-0 no-scrollbar">
      {/* Home / Direct Messages */}
      <div className="relative group">
         <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r my-auto transition-all duration-200 ${activeServerId === 'HOME' ? 'h-10' : 'h-0 group-hover:h-5'}`} />
        <button 
          onClick={onSelectHome}
          className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-white transition-all duration-200 ${activeServerId === 'HOME' ? 'bg-[#5865F2]' : 'bg-[#313338] group-hover:bg-[#5865F2]'}`}
        >
          <img src="https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" alt="Home" className="w-7 h-5" />
        </button>
      </div>

      <div className="w-8 h-[2px] bg-[#35363C] rounded-lg mx-auto" />

      {/* Dynamic Servers */}
      {servers.map((server) => {
        const isActive = activeServerId === server.id;
        return (
          <div key={server.id} className="relative group w-full flex justify-center">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r my-auto transition-all duration-200 ${isActive ? 'h-10' : 'h-0 group-hover:h-5'}`} />
            <button 
                onClick={() => onSelectServer(server)}
                className={`w-12 h-12 rounded-[24px] bg-[#313338] transition-all duration-200 overflow-hidden hover:shadow-xl group-hover:rounded-[16px] ${isActive ? 'rounded-[16px] outline outline-2 outline-green-600' : 'group-hover:bg-[#5865F2]'}`}
            >
               <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
            </button>
          </div>
        );
      })}

       {/* Add Server Button */}
       <div className="relative group w-full flex justify-center">
         <button 
            onClick={onAddServer}
            className="w-12 h-12 rounded-[24px] bg-[#313338] flex items-center justify-center text-[#23a559] group-hover:bg-[#23a559] group-hover:text-white group-hover:rounded-[16px] transition-all duration-200"
         >
           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M13 11H21V13H13V21H11V13H3V11H11V3H13V11Z" />
           </svg>
         </button>
       </div>
    </div>
  );
};

export default ServerSidebar;