import React, { useState, useRef } from 'react';

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (serverData: { name: string, iconUrl?: string }) => void;
}

const CreateServerModal: React.FC<CreateServerModalProps> = ({ onClose, onCreate }) => {
  const [serverName, setServerName] = useState('');
  const [icon, setIcon] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setIcon(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    onCreate({ name: serverName.trim(), iconUrl: icon });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#313338] rounded-lg shadow-2xl w-full max-w-[440px] overflow-hidden">
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Customize Your Server</h2>
          <p className="text-[#b5bac1] text-sm px-4">Give your new server a personality with a name and an icon.</p>

          <form onSubmit={handleSubmit} className="mt-6 text-left">
             <div className="flex justify-center mb-6">
                <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed border-[#4e5058] rounded-full flex items-center justify-center bg-[#313338] text-white overflow-hidden cursor-pointer">
                    {icon ? <img src={icon} className="w-full h-full object-cover" /> : <span className="text-xs uppercase font-bold text-[#b5bac1]">Upload</span>}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
             </div>

            <div className="mb-4">
              <label className="block text-[#b5bac1] text-xs font-bold uppercase tracking-wide mb-2">Server Name</label>
              <input type="text" value={serverName} onChange={(e) => setServerName(e.target.value)} className="w-full bg-[#1e1f22] text-white p-2.5 rounded border-none focus:ring-0 outline-none font-medium h-10" placeholder="My Awesome Server" required autoFocus />
            </div>
          </form>
        </div>

        <div className="bg-[#2b2d31] p-4 flex justify-between items-center">
             <button onClick={onClose} className="text-white hover:underline text-sm font-medium px-4">Back</button>
             <button onClick={handleSubmit} disabled={!serverName.trim()} className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-medium px-6 py-2.5 rounded transition-colors disabled:opacity-50">Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerModal;