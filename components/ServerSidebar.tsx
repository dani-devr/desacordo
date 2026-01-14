import React from 'react';
import { Server } from '../types';

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (server: Server) => void;
  onAddServer: () => void;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({ 
  servers, 
  activeServerId, 
  onSelectServer,
  onAddServer
}) => {
  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 overflow-y-auto h-full flex-shrink-0 no-scrollbar">
      {/* Home / Direct Messages - Just a placeholder for now */}
      <div className="relative group">
         <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r my-auto h-2 transition-all duration-200 group-hover:h-5" />
        <button className="w-12 h-12 bg-[#5865F2] rounded-[16px] flex items-center justify-center text-white transition-all duration-200">
          <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor">
            <path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4069 0.461742 17.1749 0.934541 16.9708 1.4184C15.0172 1.11817 13.0924 1.11817 11.1388 1.4184C10.9192 0.934541 10.6872 0.461742 10.4357 0C8.58618 0.318797 6.78337 0.879656 5.07292 1.67671C1.51968 7.02999 0.548443 12.2461 1.02672 17.3828C3.17296 18.9837 5.25368 19.9547 7.28714 20.5786C7.78508 19.8924 8.23253 19.1668 8.61864 18.404C7.88214 18.1226 7.17519 17.7788 6.50275 17.3828C6.67894 17.2519 6.85513 17.108 7.0192 16.9511C11.1897 18.8921 15.7001 18.8921 19.8248 16.9511C19.9889 17.108 20.1651 17.2519 20.3413 17.3828C19.6689 17.7788 18.9619 18.1226 18.2254 18.404C18.6115 19.1668 19.059 19.8924 19.5569 20.5786C21.5904 19.9547 23.6711 18.9837 25.8173 17.3828C26.4026 11.3698 24.8398 6.16584 23.0212 1.67671ZM9.68041 13.6383C8.43793 13.6383 7.42695 12.4878 7.42695 11.0877C7.42695 9.68761 8.41119 8.53706 9.68041 8.53706C10.9496 8.53706 11.9606 9.68761 11.9339 11.0877C11.9339 12.4878 10.9496 13.6383 9.68041 13.6383ZM18.4161 13.6383C17.1736 13.6383 16.1627 12.4878 16.1627 11.0877C16.1627 9.68761 17.1469 8.53706 18.4161 8.53706C19.6853 8.53706 20.6963 9.68761 20.6696 11.0877C20.6696 12.4878 19.6853 13.6383 18.4161 13.6383Z" />
          </svg>
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