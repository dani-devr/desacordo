import React, { useState, useRef } from 'react';
import { User } from '../types';
import { socketService } from '../services/socketService';

interface Props {
  user: User;
  onClose: () => void;
}

const UserSettingsModal: React.FC<Props> = ({ user, onClose }) => {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [banner, setBanner] = useState(user.bannerUrl || '');
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFn: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFn(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
      socketService.updateProfile(user.id, { username, bio, avatarUrl: avatar, bannerUrl: banner });
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#313338] w-full max-w-[600px] rounded-lg overflow-hidden shadow-2xl relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-[#b5bac1] hover:text-white z-10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
          
          {/* Banner */}
          <div className="h-[120px] bg-[#1e1f22] relative group">
              {banner && <img src={banner} className="w-full h-full object-cover" />}
              <div onClick={() => bannerInputRef.current?.click()} className="absolute top-2 right-2 bg-black/50 p-2 rounded cursor-pointer opacity-0 group-hover:opacity-100 text-white text-xs">Edit Banner</div>
              <input type="file" ref={bannerInputRef} className="hidden" onChange={e => handleFileChange(e, setBanner)} />
          </div>

          <div className="px-6 pb-6 relative">
              {/* Avatar */}
              <div className="w-[100px] h-[100px] rounded-full p-1.5 bg-[#313338] absolute -top-[50px] left-6 group">
                  <img src={avatar} className="w-full h-full rounded-full object-cover" />
                  <div onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer text-white text-[10px] font-bold">CHANGE</div>
                  <input type="file" ref={avatarInputRef} className="hidden" onChange={e => handleFileChange(e, setAvatar)} />
              </div>

              <div className="mt-14 space-y-4">
                  <div>
                      <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Display Name</label>
                      <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none" />
                  </div>
                  
                  <div>
                      <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">About Me</label>
                      <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none h-24 resize-none" />
                  </div>

                  <div className="flex justify-end pt-4">
                      <button onClick={onClose} className="text-white hover:underline mr-4">Cancel</button>
                      <button onClick={handleSave} className="bg-[#23a559] text-white px-6 py-2 rounded font-medium">Save Changes</button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;