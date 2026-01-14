import React, { useState, useRef, useEffect } from 'react';
import { Server, User, Role, Invite } from '../types';
import { socketService } from '../services/socketService';

interface Props {
  server: Server;
  currentUser: User;
  onClose: () => void;
}

const ServerSettingsModal: React.FC<Props> = ({ server, currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ROLES' | 'INVITES' | 'BOOST'>('OVERVIEW');
  const [name, setName] = useState(server.name);
  const [icon, setIcon] = useState(server.iconUrl);
  const [vanityUrl, setVanityUrl] = useState(server.vanityUrl || '');
  const [invites, setInvites] = useState<Invite[]>(server.invites || []);
  const [roles, setRoles] = useState<Role[]>(server.roles || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = server.ownerId === currentUser.id; 

  useEffect(() => {
     socketService.onInviteGenerated((invite) => {
         if(invite.serverId === server.id) setInvites(prev => [...prev, invite]);
     });
  }, [server.id]);

  useEffect(() => {
    setRoles(server.roles || []);
  }, [server.roles]);

  const handleSaveOverview = () => {
    socketService.updateServerSettings(server.id, currentUser.id, { name, iconUrl: icon, vanityUrl });
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
  };

  const togglePermission = (roleId: string, perm: string) => {
      const updatedRoles = roles.map(r => {
          if (r.id !== roleId) return r;
          const newPerms = r.permissions.includes(perm) 
             ? r.permissions.filter(p => p !== perm)
             : [...r.permissions, perm];
          return { ...r, permissions: newPerms };
      });
      setRoles(updatedRoles);
      // Sync immediately for simplicity, usually explicit save
      socketService.updateServerSettings(server.id, currentUser.id, { roles: updatedRoles });
  };
  
  const handleBoost = () => {
      socketService.boostServer(server.id, currentUser.id);
  };

  if (!canEdit && activeTab !== 'BOOST') {
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
            {canEdit && (
                <>
                    <button onClick={() => setActiveTab('OVERVIEW')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'OVERVIEW' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>Overview</button>
                    <button onClick={() => setActiveTab('ROLES')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'ROLES' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>Roles</button>
                    <button onClick={() => setActiveTab('INVITES')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'INVITES' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>Invites</button>
                </>
            )}
            <button onClick={() => setActiveTab('BOOST')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'BOOST' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>
                <span className="text-[#f47fff]">Server Boost</span>
            </button>
            
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
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Server Name</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none" />
                        </div>
                        
                        {server.boostLevel >= 3 && (
                            <div className="p-4 bg-gradient-to-r from-[#b473f5] to-[#f47fff] rounded-lg">
                                <label className="block text-white text-xs font-bold uppercase mb-2">Vanity URL (Level 3 Unlocked)</label>
                                <div className="flex items-center">
                                    <span className="text-white/80 mr-2">desacordo.onrender.com/invite/</span>
                                    <input 
                                        value={vanityUrl} 
                                        onChange={e => setVanityUrl(e.target.value)} 
                                        className="bg-black/20 text-white p-2 rounded outline-none flex-1 placeholder-white/50" 
                                        placeholder="cool-server"
                                    />
                                </div>
                            </div>
                        )}
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
                 <div className="space-y-4">
                     {roles?.map(role => (
                         <div key={role.id} className="bg-[#2b2d31] p-4 rounded">
                             <div className="flex items-center mb-3">
                                 <div className="w-4 h-4 rounded-full mr-3" style={{ background: role.color }} />
                                 <input 
                                    className="bg-transparent text-white font-medium outline-none flex-1"
                                    value={role.name}
                                    readOnly // Edit name via full update later if needed
                                 />
                             </div>
                             <div className="space-y-2">
                                 {['ADMIN', 'MANAGE_SERVER', 'MANAGE_CHANNELS'].map(perm => (
                                     <label key={perm} className="flex items-center cursor-pointer">
                                         <input 
                                            type="checkbox" 
                                            checked={role.permissions.includes(perm)}
                                            onChange={() => togglePermission(role.id, perm)}
                                            className="form-checkbox h-4 w-4 text-[#5865F2] rounded border-gray-500 bg-[#1e1f22]"
                                         />
                                         <span className="ml-2 text-[#b5bac1] text-sm capitalize">{perm.replace('_', ' ')}</span>
                                     </label>
                                 ))}
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
                 {server.vanityUrl && (
                     <div className="mb-4 bg-[#2b2d31] p-3 rounded flex items-center justify-between border border-[#f47fff]">
                         <div className="flex flex-col">
                             <span className="text-[#f47fff] text-xs font-bold uppercase mb-1">Vanity URL</span>
                             <span className="text-white font-mono">https://desacordo.onrender.com/invite/{server.vanityUrl}</span>
                         </div>
                         <button onClick={() => navigator.clipboard.writeText(`https://desacordo.onrender.com/invite/${server.vanityUrl}`)} className="text-[#f47fff] text-sm hover:underline">Copy</button>
                     </div>
                 )}
                 <div className="space-y-1">
                     {invites.length === 0 && <p className="text-[#b5bac1]">No active invites.</p>}
                     {invites.map(inv => (
                         <div key={inv.code} className="flex items-center justify-between bg-[#2b2d31] p-3 rounded group">
                             <div className="flex flex-col">
                                 <span className="text-white font-mono select-all">https://desacordo.onrender.com/invite/{inv.code}</span>
                                 <span className="text-[#b5bac1] text-xs">Used {inv.uses} times</span>
                             </div>
                             <button onClick={() => navigator.clipboard.writeText(`https://desacordo.onrender.com/invite/${inv.code}`)} className="text-[#5865F2] text-sm hover:underline">Copy</button>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {activeTab === 'BOOST' && (
             <div className="max-w-xl text-center pt-8">
                 <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f47fff] to-[#5865F2] flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M13 6v5h5V7.75L13 6zm-2 10v-5H6v3.25L11 16zm4.5 1.5l1.25-2.25L19 14l-1-4-4 1 .75 2.25L12.5 15.5 15.5 17.5zM7 10l1 4 4-1-.75-2.25L9 8.5 7 10zm-3 2l1.25 2.25L4 15.5l3.25 2L6 14.25 5 12zm13-5l-1.25-2.25L20 3.5l-3.25-2L18 4.75 19 7z"/></svg>
                    </div>
                 </div>
                 <h1 className="text-2xl font-bold text-white mb-2">Boost this Server</h1>
                 <p className="text-[#b5bac1] mb-8">
                     Unlock perks like <span className="text-white font-bold">Vanity URLs (Level 3)</span> by boosting. <br/>Current Level: <span className="text-white font-bold">{server.boostLevel}</span>
                 </p>
                 
                 <div className="grid grid-cols-3 gap-4 mb-8 text-left">
                     <div className={`p-4 rounded border ${server.boostLevel >= 1 ? 'border-[#f47fff] bg-[#f47fff]/10' : 'border-[#2b2d31] bg-[#2b2d31]'}`}>
                         <div className="font-bold text-white mb-1">Level 1</div>
                         <div className="text-xs text-[#b5bac1]">More Emoji Slots</div>
                     </div>
                     <div className={`p-4 rounded border ${server.boostLevel >= 2 ? 'border-[#f47fff] bg-[#f47fff]/10' : 'border-[#2b2d31] bg-[#2b2d31]'}`}>
                         <div className="font-bold text-white mb-1">Level 2</div>
                         <div className="text-xs text-[#b5bac1]">Better Audio</div>
                     </div>
                     <div className={`p-4 rounded border ${server.boostLevel >= 3 ? 'border-[#f47fff] bg-[#f47fff]/10' : 'border-[#2b2d31] bg-[#2b2d31]'}`}>
                         <div className="font-bold text-white mb-1">Level 3</div>
                         <div className="text-xs text-[#b5bac1]">Vanity URL</div>
                     </div>
                 </div>

                 <button 
                    onClick={handleBoost} 
                    className="bg-[#f47fff] hover:bg-[#d856e2] text-white font-bold px-8 py-3 rounded-full transition-colors flex items-center justify-center mx-auto"
                 >
                     <svg className="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M4 6V4h16v2H4zm14 14v-2H6v2h12zm-7-3l-4-6h2V7h6v4h2l-4 6h-2z"/></svg>
                     Boost Server
                 </button>
             </div>
         )}
      </div>
    </div>
  );
};

export default ServerSettingsModal;