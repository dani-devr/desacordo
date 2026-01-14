import React, { useState, useRef } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const body = isLogin 
      ? { email, password } 
      : { email, password, username, avatarUrl: avatar };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[url('https://cdn.discordapp.com/attachments/887856753457197096/1090382346768834610/bg_login.png')] bg-cover bg-center">
      <div className="bg-[#313338] p-8 rounded-md shadow-lg w-full max-w-[480px]">
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {isLogin ? 'Welcome Back!' : 'Create an Account'}
        </h2>
        
        {error && <div className="bg-[#f23f42] text-white p-2 rounded text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="flex justify-center mb-4">
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-24 h-24 rounded-full bg-[#1e1f22] border-2 border-dashed border-[#b5bac1] flex items-center justify-center cursor-pointer overflow-hidden hover:border-white"
                 >
                   {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <span className="text-[#b5bac1] text-xs">Upload Avatar</span>}
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>
              <div>
                <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Username</label>
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#5865F2]" />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#5865F2]" />
          </div>

          <div>
            <label className="block text-[#b5bac1] text-xs font-bold uppercase mb-2">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded focus:outline-none focus:ring-2 focus:ring-[#5865F2]" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-2.5 rounded transition-colors">
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Register')}
          </button>
        </form>

        <div className="mt-4 text-sm text-[#b5bac1] text-center">
          {isLogin ? "Need an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-[#00A8FC] hover:underline">
            {isLogin ? 'Register' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;