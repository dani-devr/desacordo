import React, { useState } from 'react';
import { User } from '../types';

interface UserSetupProps {
  onComplete: (user: User) => void;
}

const AVATAR_OPTIONS = [
  'https://picsum.photos/seed/felix/200/200',
  'https://picsum.photos/seed/ane/200/200',
  'https://picsum.photos/seed/bob/200/200',
  'https://picsum.photos/seed/sarah/200/200',
  'https://picsum.photos/seed/max/200/200',
];

const UserSetup: React.FC<UserSetupProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const newUser: User = {
      id: crypto.randomUUID(),
      username: username.trim(),
      avatarUrl: selectedAvatar,
      isBot: false,
      color: '#f2f3f5' // Default white-ish
    };
    onComplete(newUser);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-[#313338] p-8 rounded-lg shadow-2xl w-full max-w-md border border-[#1e1f22]">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome back!</h2>
        <p className="text-[#b5bac1] text-center mb-6">We're so excited to see you again!</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-[#b5bac1] text-xs font-bold uppercase tracking-wide mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1e1f22] text-white p-2.5 rounded border-none focus:ring-0 outline-none font-medium h-10"
              placeholder="How should we call you?"
              required
              autoFocus
            />
          </div>

          <div className="mb-8">
            <label className="block text-[#b5bac1] text-xs font-bold uppercase tracking-wide mb-3">
              Choose an Avatar
            </label>
            <div className="flex gap-3 justify-center">
              {AVATAR_OPTIONS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative rounded-full transition-all duration-200 ${
                    selectedAvatar === url ? 'ring-2 ring-offset-2 ring-indigo-500 ring-offset-[#313338] scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img
                    src={url}
                    alt="avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-2.5 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enter Server
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserSetup;
