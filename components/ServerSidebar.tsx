import React from 'react';
import { Server } from '../types';

interface ServerSidebarProps {
  servers: Server[];
  activeServerId: string;
  onSelectServer: (server: Server) => void;
  onAddServer: () => void;
  onSelectHome: () => void;
  notifications: Record<string, number>;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({ 
  servers, 
  activeServerId, 
  onSelectServer,
  onAddServer,
  onSelectHome,
  notifications
}) => {
  // Aggregate notifications per server
  const getServerNotificationCount = (serverId: string) => {
      // Find all channels belonging to this server
      const server = servers.find(s => s.id === serverId);
      if (!server) return 0;
      return server.channels.reduce((acc, ch) => acc + (notifications[ch.id] || 0), 0);
  };
  
  // Aggregate DM notifications
  const homeNotificationCount = Object.keys(notifications).filter(id => id.includes('_') || id === 'global').reduce((acc, id) => acc + notifications[id], 0);

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 space-y-2 overflow-y-auto h-full flex-shrink-0 no-scrollbar">
      {/* Home / Direct Messages */}
      <div className="relative group">
         <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r my-auto transition-all duration-200 ${activeServerId === 'HOME' ? 'h-10' : 'h-0 group-hover:h-5'}`} />
        <button 
          onClick={onSelectHome}
          className={`w-12 h-12 rounded-[16px] flex items-center justify-center text-white transition-all duration-200 ${activeServerId === 'HOME' ? 'bg-[#5865F2]' : 'bg-[#313338] group-hover:bg-[#5865F2]'}`}
        >
          {/* Discord Logo Fixed */}
          <svg width="28" height="20" viewBox="0 0 28 20" fill="currentColor"><path d="M23.0212 1.67671C21.3107 0.879656 19.5079 0.318797 17.6584 0C17.4038 0.461463 17.123 1.09117 16.9248 1.55837C14.9701 1.26871 13.0116 1.26871 11.085 1.55837C10.8868 1.09117 10.6021 0.461463 10.3514 0C8.50193 0.318797 6.69906 0.879656 4.98858 1.67671C1.55171 6.81156 0.622346 11.8344 1.08056 16.7865C3.37687 18.4897 5.60268 19.5251 7.79468 20C8.33146 19.2787 8.81846 18.5132 9.24355 17.7056C8.45265 17.4042 7.70014 17.0396 6.99342 16.6111C7.18529 16.4705 7.37337 16.3218 7.55395 16.1661C11.7505 18.0934 16.2878 18.0934 20.4357 16.1661C20.6163 16.3218 20.8043 16.4705 21.0001 16.6111C20.2894 17.0435 19.5329 17.4081 18.7381 17.7056C19.1631 18.5132 19.654 19.2787 20.1908 20C22.3828 19.5251 24.6086 18.4897 26.9049 16.7865C27.4262 11.1611 26.0463 6.16279 23.0212 1.67671ZM9.68041 13.6383C8.39754 13.6383 7.34085 12.4456 7.34085 10.994C7.34085 9.5424 8.37155 8.34973 9.68041 8.34973C10.9981 8.34973 12.0476 9.5424 12.0216 10.994C12.0216 12.4456 10.9981 13.6383 9.68041 13.6383ZM18.3161 13.6383C17.0332 13.6383 15.9765 12.4456 15.9765 10.994C15.9765 9.5424 17.0072 8.34973 18.3161 8.34973C19.6338 8.34973 20.6833 9.5424 20.6573 10.994C20.6573 12.4456 19.6338 13.6383 18.3161 13.6383Z"/></svg>
        </button>
        {homeNotificationCount > 0 && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#f23f42] rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#1e1f22]">
                {homeNotificationCount > 9 ? '9+' : homeNotificationCount}
            </div>
        )}
      </div>

      <div className="w-8 h-[2px] bg-[#35363C] rounded-lg mx-auto" />

      {/* Dynamic Servers */}
      {servers.map((server) => {
        const isActive = activeServerId === server.id;
        const notifCount = getServerNotificationCount(server.id);
        
        return (
          <div key={server.id} className="relative group w-full flex justify-center">
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r my-auto transition-all duration-200 ${isActive ? 'h-10' : 'h-0 group-hover:h-5'}`} />
            <button 
                onClick={() => onSelectServer(server)}
                className={`w-12 h-12 rounded-[24px] bg-[#313338] transition-all duration-200 overflow-hidden hover:shadow-xl group-hover:rounded-[16px] ${isActive ? 'rounded-[16px] outline outline-2 outline-green-600' : 'group-hover:bg-[#5865F2]'}`}
            >
               <img src={server.iconUrl} alt={server.name} className="w-full h-full object-cover" />
            </button>
            {notifCount > 0 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#f23f42] rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#1e1f22]">
                    {notifCount > 9 ? '9+' : notifCount}
                </div>
            )}
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