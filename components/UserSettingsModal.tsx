import React, { useState, useRef } from 'react';
import { User } from '../types';
import { socketService } from '../services/socketService';

interface Props {
  user: User;
  onClose: () => void;
}

const UserSettingsModal: React.FC<Props> = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'NITRO'>('PROFILE');
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [banner, setBanner] = useState(user.bannerUrl || '');
  
  // Nitro Form
  const [cardNumber, setCardNumber] = useState('');
  const [nitroLoading, setNitroLoading] = useState(false);

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

  const handleSaveProfile = () => {
      socketService.updateProfile(user.id, { username, bio, avatarUrl: avatar, bannerUrl: banner });
      onClose();
  };

  const handleBuyNitro = (e: React.FormEvent) => {
      e.preventDefault();
      setNitroLoading(true);
      // Simulate API call
      setTimeout(() => {
          socketService.updateProfile(user.id, { isNitro: true });
          setNitroLoading(false);
          onClose();
      }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="flex w-[800px] h-[600px] bg-[#313338] rounded-lg overflow-hidden shadow-2xl relative">
          
          {/* Sidebar */}
          <div className="w-[30%] bg-[#2b2d31] flex flex-col pt-12 pr-4 items-end">
               <div className="w-40">
                   <h2 className="text-[#949BA4] text-xs font-bold uppercase mb-2 px-2">User Settings</h2>
                   <button onClick={() => setActiveTab('PROFILE')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'PROFILE' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>My Account</button>
                   <button onClick={() => setActiveTab('NITRO')} className={`w-full text-left px-2 py-1.5 rounded mb-0.5 ${activeTab === 'NITRO' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#35373c]'}`}>
                       <span className="text-[#f47fff]">Nitro</span>
                   </button>
                   <div className="h-[1px] bg-[#3f4147] my-2" />
                   <button onClick={onClose} className="w-full text-left px-2 py-1.5 rounded text-[#f23f42] hover:bg-[#35373c]">Exit</button>
               </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-[#313338] relative overflow-y-auto">
              <button onClick={onClose} className="absolute top-4 right-4 text-[#b5bac1] hover:text-white z-10 flex flex-col items-center">
                  <span className="border-2 border-[#b5bac1] rounded-full w-8 h-8 flex items-center justify-center font-bold">X</span>
                  <span className="text-xs font-bold mt-1">ESC</span>
              </button>

              {activeTab === 'PROFILE' && (
                  <div className="p-10">
                      <h1 className="text-xl font-bold text-white mb-6">My Profile</h1>
                      
                      {/* Preview Card */}
                      <div className="bg-[#111214] rounded-lg overflow-hidden mb-8 max-w-sm">
                          <div className="h-24 bg-[#5865F2] relative">
                             {banner && <img src={banner} className="w-full h-full object-cover" />}
                             <div className="absolute top-2 right-2 cursor-pointer bg-black/50 p-1 rounded text-xs text-white" onClick={() => bannerInputRef.current?.click()}>✎</div>
                          </div>
                          <div className="px-4 pb-4 relative">
                              <div className="absolute -top-10 left-4 w-20 h-20 rounded-full bg-[#111214] p-1.5">
                                  <img src={avatar} className="w-full h-full rounded-full object-cover" />
                                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[8px] cursor-pointer font-bold" onClick={() => avatarInputRef.current?.click()}>EDIT</div>
                              </div>
                              <div className="mt-12">
                                  <div className="text-white font-bold text-lg">{username} {user.isNitro && <span className="text-[#f47fff]">♦</span>}</div>
                                  <div className="text-[#b5bac1] text-xs">#{user.id.substring(0,4)}</div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-4 max-w-sm">
                          <div>
                              <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Display Name</label>
                              <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none" />
                          </div>
                          <div>
                              <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">About Me</label>
                              <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none h-24 resize-none" />
                          </div>
                      </div>

                      {/* GIF Support Explicitly Added to Accept */}
                      <input type="file" ref={avatarInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={e => handleFileChange(e, setAvatar)} />
                      <input type="file" ref={bannerInputRef} className="hidden" accept="image/png, image/jpeg, image/gif" onChange={e => handleFileChange(e, setBanner)} />
                      
                      <p className="text-[#b5bac1] text-xs mt-2 italic">Pro Tip: We support GIFs for both avatars and banners!</p>

                      <div className="mt-8 flex justify-end max-w-sm">
                           <button onClick={handleSaveProfile} className="bg-[#23a559] text-white px-6 py-2 rounded font-medium">Save Changes</button>
                      </div>
                  </div>
              )}

              {activeTab === 'NITRO' && (
                  <div className="p-10">
                      <div className="bg-gradient-to-r from-[#b473f5] to-[#f47fff] p-8 rounded-lg text-white mb-8 text-center">
                          <h1 className="text-3xl font-extrabold mb-2">Discordia Nitro</h1>
                          <p className="mb-4 font-medium">Unleash more fun with supercharged perks!</p>
                          <div className="flex justify-center space-x-4 text-sm font-bold">
                              <div className="bg-black/20 px-3 py-1 rounded">Custom Emojis</div>
                              <div className="bg-black/20 px-3 py-1 rounded">Bigger Uploads</div>
                              <div className="bg-black/20 px-3 py-1 rounded">Profile Badge</div>
                          </div>
                      </div>

                      {user.isNitro ? (
                          <div className="text-center">
                              <h2 className="text-2xl font-bold text-white mb-4">You have Nitro!</h2>
                              <p className="text-[#b5bac1]">Thanks for supporting Discordia.</p>
                          </div>
                      ) : (
                          <div className="max-w-md mx-auto">
                              <h2 className="text-white font-bold mb-4">Subscribe Now (Test Mode)</h2>
                              <form onSubmit={handleBuyNitro} className="space-y-4">
                                  <div>
                                      <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Card Number (Fake)</label>
                                      <input 
                                        required 
                                        placeholder="0000 0000 0000 0000" 
                                        value={cardNumber} 
                                        onChange={e => setCardNumber(e.target.value)}
                                        className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none border border-[#1e1f22] focus:border-[#5865F2]" 
                                      />
                                  </div>
                                  <div className="flex gap-4">
                                      <div className="flex-1">
                                          <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Exp</label>
                                          <input placeholder="MM/YY" className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none" />
                                      </div>
                                      <div className="flex-1">
                                          <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">CVC</label>
                                          <input placeholder="123" className="w-full bg-[#1e1f22] text-white p-2.5 rounded outline-none" />
                                      </div>
                                  </div>
                                  <button type="submit" disabled={nitroLoading} className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded font-bold mt-4">
                                      {nitroLoading ? 'Processing...' : 'Subscribe - $9.99/mo'}
                                  </button>
                              </form>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;