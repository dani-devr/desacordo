import React, { useState, useRef, useEffect } from 'react';
import { Server, User, Role, Invite } from '../types';
import { socketService } from '../services/socketService';

interface Props {
  server: Server;
  currentUser: User;
  onClose: () => void;
}

const ServerSettingsModal: React.FC<Props> = ({ server, currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROLES' | 'INVITES'>('OVERVIEW');
  const [name, setName] = useState(server.name);
  const [icon, setIcon] = useState(server.iconUrl);
  const [invites, setInvites] = useState<Invite[]>(server.invites || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check permissions (Basic check, real check on backend)
  const canEdit = server.ownerId === currentUser.id; 
  // In a real app, we would also check roles here for UI feedback

  useEffect(() => {
     socketService.onInviteGenerated((invite) => {
         if(invite.serverId === server.id) setInvites(prev => [...prev, invite]);
     });
  }, [server.id]);

  const handleSaveOverview = () => {
    socketService.updateServerSettings(server.id, currentUser.id, { name, iconUrl: icon });
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIcon(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateInvite = () => {
      socketService.generateInvite(server.id, currentUser.id);
  };

  const handleCreateRole = () => {
      const newRole: Partial<Role> = { name: 'New Role', color: '#99AAB5', permissions: [] };
      socketService.createRole(server.id, currentUser.id, newRole);
      onClose(); // Close to refresh for now, ideally optimistic update
  };

  if (!canEdit && activeTab === 'OVERVIEW') {
      return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
             <div className="bg-[#313338] p-8 rounded text-white text-center">
                 <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                 <p className="mb-4 text-[#b5bac1]">You do not have permission to manage this server.</p>
                 <button onClick={onClose} className="px-4 py-2 bg-[#5865F2] rounded">Close</button>
             </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex z-50 animate-in fade-in duration-200">
      {/* Sidebar */}
      <div className="w-[30%] bg-[#2b2d31] flex flex-col items-end py-12 pr-6">
         <div className="w-48">
            <h2 className="text-[#949BA4] text-xs font-bold uppercase mb-2 px-2">{server.name}</h2>
            <button onClick={() => setActiveTab('OVERVIEW')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'OVERVIEW' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>Overview</button>
            <button onClick={() => setActiveTab('ROLES')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'ROLES' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>Roles</button>
            <button onClick={() => setActiveTab('INVITES')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'INVITES' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>Invites</button>
            
            <div className="h-[1px] bg-[#3f4147] my-2" />
            <button onClick={onClose} className="w-full text-left px-2 py-1.5 rounded text-[#f23f42] hover:bg-[#35373c]">Exit</button>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#313338] py-12 pl-10 pr-20 overflow-y-auto">
         {activeTab === 'OVERVIEW' && (
             <div className="max-w-xl">
                 <h1 className="text-xl font-bold text-white mb-6">Server Overview</h1>
                 <div className="flex gap-8 mb-8">
                    <div className="flex-shrink-0 relative group w-24 h-24">
                        <img src={icon} className="w-24 h-24 rounded-full object-cover" />
                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer rounded-full text-white text-xs font-bold">CHANGE</div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Server Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none" />
                    </div>
                 </div>
                 <button onClick={handleSaveOverview} className="bg-[#23a559] text-white px-6 py-2.5 rounded font-medium hover:bg-[#1a7f44]">Save Changes</button>
             </div>
         )}

         {activeTab === 'ROLES' && (
             <div>
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-white">Roles</h1>
                    <button onClick={handleCreateRole} className="bg-[#5865F2] text-white px-3 py-1.5 rounded text-sm">Create Role</button>
                 </div>
                 <div className="space-y-1">
                     {server.roles?.map(role => (
                         <div key={role.id} className="flex items-center justify-between bg-[#2b2d31] p-3 rounded">
                             <div className="flex items-center">
                                 <div className="w-3 h-3 rounded-full mr-3" style={{ background: role.color }} />
                                 <span className="text-white font-medium">{role.name}</span>
                             </div>
                             <div className="text-[#b5bac1] text-xs">
                                 {role.permissions.join(', ') || 'No Permissions'}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {activeTab === 'INVITES' && (
             <div>
                 <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-white">Invites</h1>
                    <button onClick={handleGenerateInvite} className="bg-[#5865F2] text-white px-3 py-1.5 rounded text-sm">Generate Code</button>
                 </div>
                 <div className="space-y-1">
                     {invites.length === 0 && <p className="text-[#b5bac1]">No active invites.</p>}
                     {invites.map(inv => (
                         <div key={inv.code} className="flex items-center justify-between bg-[#2b2d31] p-3 rounded group">
                             <div className="flex flex-col">
                                 <span className="text-white font-mono select-all">https://discordia.ai/invite/{inv.code}</span>
                                 <span className="text-[#b5bac1] text-xs">Used {inv.uses} times</span>
                             </div>
                             <button onClick={() => navigator.clipboard.writeText(`https://discordia.ai/invite/${inv.code}`)} className="text-[#5865F2] text-sm hover:underline">Copy</button>
                         </div>
                     ))}
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default ServerSettingsModal;