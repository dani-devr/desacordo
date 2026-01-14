import React, { useState } from 'react';
import { User, FriendRequest } from '../types';
import { socketService } from '../services/socketService';

interface Props {
  friendRequests: FriendRequest[];
  friends: User[];
  allUsers: User[]; // Used to resolve names for requests
  currentUser: User;
}

const FriendList: React.FC<Props> = ({ friendRequests, friends, allUsers, currentUser }) => {
  const [tab, setTab] = useState<'ONLINE' | 'ALL' | 'PENDING' | 'ADD'>('ONLINE');
  const [addUsername, setAddUsername] = useState('');
  const [addMessage, setAddMessage] = useState('');

  const handleSendRequest = (e: React.FormEvent) => {
      e.preventDefault();
      const target = allUsers.find(u => u.username === addUsername);
      if (target) {
          socketService.sendFriendRequest(currentUser.id, target.id);
          setAddMessage(`Friend request sent to ${target.username}`);
          setAddUsername('');
      } else {
          setAddMessage('User not found.');
      }
  };

  const pendingIncoming = friendRequests.filter(r => r.toUserId === currentUser.id && r.status === 'pending');

  return (
    <div className="flex-1 bg-[#313338] flex flex-col">
       <div className="h-12 border-b border-[#26272d] flex items-center px-4 space-x-4">
          <div className="flex items-center text-white font-bold mr-4">
              <span className="text-[#949BA4] mr-2">@</span> Friends
          </div>
          <div className="h-6 w-[1px] bg-[#3f4147]" />
          <button onClick={() => setTab('ONLINE')} className={`${tab === 'ONLINE' ? 'text-white bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c]'} px-2 py-1 rounded`}>Online</button>
          <button onClick={() => setTab('ALL')} className={`${tab === 'ALL' ? 'text-white bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c]'} px-2 py-1 rounded`}>All</button>
          <button onClick={() => setTab('PENDING')} className={`${tab === 'PENDING' ? 'text-white bg-[#404249]' : 'text-[#b5bac1] hover:bg-[#35373c]'} px-2 py-1 rounded relative`}>
              Pending
              {pendingIncoming.length > 0 && <span className="ml-2 bg-[#f23f42] text-white text-[10px] px-1.5 rounded-full">{pendingIncoming.length}</span>}
          </button>
          <button onClick={() => setTab('ADD')} className={`${tab === 'ADD' ? 'text-[#23a559] bg-transparent' : 'bg-[#23a559] text-white'} px-2 py-1 rounded`}>Add Friend</button>
       </div>

       <div className="p-8 flex-1 overflow-y-auto">
          {tab === 'ADD' && (
              <div className="max-w-xl">
                  <h2 className="text-white font-bold text-lg mb-2">ADD FRIEND</h2>
                  <p className="text-[#b5bac1] text-sm mb-4">You can add friends with their Discordia username.</p>
                  <form onSubmit={handleSendRequest} className="relative">
                      <input 
                        value={addUsername}
                        onChange={e => setAddUsername(e.target.value)}
                        className={`w-full bg-[#1e1f22] p-3 rounded-lg border ${addMessage.includes('sent') ? 'border-green-500' : addMessage.includes('not') ? 'border-red-500' : 'border-black'} text-white outline-none focus:border-[#00A8FC]`} 
                        placeholder="You can add friends with their Discordia username."
                      />
                      <button type="submit" disabled={!addUsername} className="absolute right-2 top-2 bg-[#5865F2] text-white px-4 py-1.5 rounded disabled:opacity-50">Send Friend Request</button>
                  </form>
                  {addMessage && <p className={`mt-2 text-sm ${addMessage.includes('sent') ? 'text-green-500' : 'text-red-500'}`}>{addMessage}</p>}
              </div>
          )}

          {tab === 'PENDING' && (
              <div>
                   <h2 className="text-[#b5bac1] text-xs font-bold uppercase mb-4">Pending — {pendingIncoming.length}</h2>
                   {pendingIncoming.map(req => {
                       const u = allUsers.find(user => user.id === req.fromUserId);
                       if (!u) return null;
                       return (
                           <div key={req.id} className="flex items-center justify-between hover:bg-[#35373c] p-2 rounded group border-t border-[#3f4147]">
                               <div className="flex items-center">
                                   <img src={u.avatarUrl} className="w-8 h-8 rounded-full mr-3" />
                                   <span className="text-white font-bold">{u.username}</span>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => socketService.acceptFriendRequest(req.id, currentUser.id)} className="w-8 h-8 rounded-full bg-[#2b2d31] flex items-center justify-center text-green-500 hover:text-white hover:bg-green-500">
                                       ✓
                                   </button>
                                   <button className="w-8 h-8 rounded-full bg-[#2b2d31] flex items-center justify-center text-red-500 hover:text-white hover:bg-red-500">
                                       ✕
                                   </button>
                               </div>
                           </div>
                       );
                   })}
              </div>
          )}
          
          {(tab === 'ONLINE' || tab === 'ALL') && (
               <div>
                   <h2 className="text-[#b5bac1] text-xs font-bold uppercase mb-4">{tab === 'ONLINE' ? 'Online Friends' : 'All Friends'} — {friends.length}</h2>
                   {friends.filter(f => tab === 'ALL' || f.status === 'online').map(f => (
                       <div key={f.id} className="flex items-center justify-between hover:bg-[#35373c] p-2 rounded group border-t border-[#3f4147] cursor-pointer">
                           <div className="flex items-center">
                               <div className="relative mr-3">
                                   <img src={f.avatarUrl} className="w-8 h-8 rounded-full" />
                                   <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#313338] ${f.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                               </div>
                               <div>
                                   <div className="text-white font-bold">{f.username}</div>
                                   <div className="text-[#b5bac1] text-xs">{f.status === 'online' ? 'Online' : 'Offline'}</div>
                               </div>
                           </div>
                           <div className="flex gap-2 bg-[#2b2d31] p-1 rounded opacity-0 group-hover:opacity-100">
                               <button className="w-8 h-8 rounded-full flex items-center justify-center text-[#b5bac1] hover:text-white">
                                   <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
          )}
       </div>
    </div>
  );
};

export default FriendList;