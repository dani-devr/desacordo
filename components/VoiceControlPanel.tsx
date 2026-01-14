import React, { useState } from 'react';
import { User } from '../types';

interface Props {
    onDisconnect: () => void;
    currentUser: User;
    channelName: string;
}

const VoiceControlPanel: React.FC<Props> = ({ onDisconnect, currentUser, channelName }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);

    return (
        <div className="bg-[#232428] border-b border-[#1e1f22] p-2">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center text-[#23a559] text-xs font-bold">
                    <svg className="mr-1" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2zm5 10v-2c0-.55-.45-1-1-1s-1 .45-1 1v2c0 1.66-1.34 3-3 3s-3-1.34-3-3v-2c0-.55-.45-1-1-1s-1 .45-1 1v2c0 2.76 2.24 5 5 5s5-2.24 5-5z"/></svg>
                    <span>Voice Connected</span>
                </div>
                <button onClick={onDisconnect} className="text-[#b5bac1] hover:text-white" title="Disconnect">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                </button>
            </div>
            <div className="text-[#b5bac1] text-xs truncate mb-2">{channelName} / {currentUser.username}</div>
            
            <div className="flex justify-between">
                <button 
                    onClick={() => setIsMuted(!isMuted)} 
                    className={`flex-1 flex justify-center p-1 rounded hover:bg-[#35373c] ${isMuted ? 'text-red-500' : 'text-[#b5bac1]'}`}
                >
                    {isMuted ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l2.97 2.97c-.85.38-1.78.6-2.77.6-3.61 0-6.55-2.63-7-6.08H4.1c.47 4.22 3.82 7.55 8.15 7.95V21h1.5v-2.15c.67-.06 1.32-.22 1.93-.45l3.05 3.05L20 20.18 4.27 3z"/></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                    )}
                </button>
                <button 
                    onClick={() => setIsDeafened(!isDeafened)}
                    className={`flex-1 flex justify-center p-1 rounded hover:bg-[#35373c] ${isDeafened ? 'text-red-500' : 'text-[#b5bac1]'}`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v9.28a4.39 4.39 0 00-1.5 1.5L8 16.28V6h4zm7 3v7.28l-2 2V6h2zM3.41 1.86L2 3.27 4.73 6H4v10.28l-.63 2.12c-.17.65.25 1.32.92 1.48.11.02.21.03.32.03.53 0 .99-.33 1.15-.83L6.39 17h6.33l4 4 1.41-1.41L3.41 1.86zm9.01 13.56l-3.35-3.35c.44-.24.94-.39 1.48-.39.73 0 1.39.28 1.87.74z"/></svg>
                </button>
            </div>
        </div>
    );
};

export default VoiceControlPanel;