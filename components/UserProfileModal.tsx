import React from 'react';
import { User, Server } from '../types';
import { socketService } from '../services/socketService';

interface Props {
  user: User;
  currentUser: User;
  onClose: () => void;
  server?: Server; // Context for roles
  onStartDM?: (user: User) => void;
}

const UserProfileModal: React.FC<Props> = ({ user, currentUser, onClose, server, onStartDM }) => {
  const isSelf = user.id === currentUser.id;
  const isFriend = currentUser.friendIds?.includes(user.id);
  
  // Permission Check for Roles
  const canManageRoles = server && (
      server.ownerId === currentUser.id ||
      server.roles.some(r => 
        server.userRoles?.[currentUser.id]?.includes(r.id) && 
        (r.permissions.includes('ADMIN') || r.permissions.includes('MANAGE_SERVER'))
      )
  );

  const handleAddFriend = () => {
    socketService.sendFriendRequest(currentUser.id, user.id);
  };

  const handleSendMessage = () => {
     onStartDM?.(user);
     onClose();
  };

  const handleToggleRole = (roleId: string) => {
      if (server) {
          socketService.assignRole(server.id, currentUser.id, user.id, roleId);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#111214] w-[600px] rounded-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
          
          {/* Banner */}
          <div className="h-[210px] relative" style={{ backgroundColor: user.color || '#5865F2' }}>
             {user.bannerUrl && <img src={user.bannerUrl} className="w-full h-full object-cover" alt="banner" />}
             <button onClick={onClose} className="absolute top-4 right-4 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
             </button>
          </div>

          <div className="px-4 pb-4 relative bg-[#111214]">
             {/* Avatar */}
             <div className="absolute -top-[64px] left-4 p-2 bg-[#111214] rounded-full">
                <div className="w-[120px] h-[120px] rounded-full overflow-hidden relative">
                   <img src={user.avatarUrl} className="w-full h-full object-cover" alt={user.username} />
                </div>
                {/* Status Indicator */}
                <div className={`absolute bottom-3 right-3 w-8 h-8 rounded-full border-[6px] border-[#111214] ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
             </div>

             {/* Badges/Actions */}
             <div className="flex justify-end pt-3 min-h-[60px] space-x-2">
                 {!isSelf && (
                     <>
                        <button onClick={handleSendMessage} className="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
                           Send Message
                        </button>
                        {!isFriend && (
                            <button onClick={handleAddFriend} className="bg-[#23a559] hover:bg-[#1a7f44] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">
                               Add Friend
                            </button>
                        )}
                     </>
                 )}
             </div>

             {/* Info */}
             <div className="mt-4 bg-[#111214] p-4 rounded-lg">
                 <h2 className="text-2xl font-bold text-white flex items-center">
                    {user.username}
                    {user.isBot && <span className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0.5 rounded ml-2 align-middle uppercase">BOT</span>}
                 </h2>
                 <p className="text-[#b5bac1] text-sm mt-1">{user.username}</p>
                 
                 <div className="w-full h-[1px] bg-[#2f3136] my-4" />

                 <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-2">About Me</h3>
                 <p className="text-[#dbdee1] text-sm whitespace-pre-wrap leading-relaxed mb-6">
                     {user.bio || "This user hasn't written a bio yet."}
                 </p>

                 {/* ROLES SECTION */}
                 {server && (
                    <div className="mb-4">
                        <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-2">Roles</h3>
                        <div className="flex flex-wrap gap-2">
                             {(server.userRoles?.[user.id] || []).length === 0 && <span className="text-[#949ba4] text-sm">No roles</span>}
                             {server.roles
                                .filter(r => server.userRoles?.[user.id]?.includes(r.id))
                                .map(r => (
                                   <div key={r.id} className="flex items-center px-2 py-1 rounded bg-[#2b2d31] border border-[#1e1f22]">
                                      <div className="w-3 h-3 rounded-full mr-2" style={{ background: r.color }}></div>
                                      <span className="text-xs font-medium text-[#dbdee1]">{r.name}</span>
                                   </div>
                                ))
                             }
                        </div>

                        {canManageRoles && !isSelf && (
                            <div className="mt-4 pt-4 border-t border-[#2f3136]">
                                <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-2">Manage Roles</h3>
                                <div className="space-y-1">
                                    {server.roles.map(r => (
                                        <label key={r.id} className="flex items-center justify-between hover:bg-[#2f3136] p-2 rounded cursor-pointer">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ background: r.color }} />
                                                <span className="text-[#dbdee1] text-sm">{r.name}</span>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={server.userRoles?.[user.id]?.includes(r.id) || false}
                                                onChange={() => handleToggleRole(r.id)}
                                                className="form-checkbox h-4 w-4 text-[#5865F2] rounded border-gray-500 bg-[#1e1f22]"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                 )}
                 
                 <div className="mt-4">
                     <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-2">Member Since</h3>
                     <p className="text-[#dbdee1] text-sm">Jan 12, 2024</p>
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default UserProfileModal;