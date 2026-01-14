import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Channel, Message, User } from '../types';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isTyping: boolean;
  typingUser?: User;
  onlineUsers?: User[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  channel, 
  messages, 
  onSendMessage, 
  isTyping,
  typingUser,
}) => {
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isTyping, channel.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
      }
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0 relative">
      {/* Header */}
      <div className="h-12 border-b border-[#26272d] shadow-sm flex items-center px-4 flex-shrink-0 z-10 bg-[#313338]">
        <div className="text-2xl text-[#80848E] mr-2 font-light">
          {channel.type === 'DM' ? '@' : '#'}
        </div>
        <div className="font-bold text-white mr-4 truncate">{channel.name}</div>
        {channel.description && (
          <div className="text-[#949BA4] text-sm truncate hidden sm:block border-l border-[#3f4147] pl-4">
            {channel.description}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-4 pt-4">
        {messages.length === 0 && (
           <div className="mt-auto mb-6">
             <div className="w-16 h-16 bg-[#41434a] rounded-full flex items-center justify-center mb-4">
               <div className="text-4xl text-white font-light">{channel.type === 'DM' ? '@' : '#'}</div>
             </div>
             <h1 className="text-3xl font-bold text-white mb-2">Welcome to {channel.name}!</h1>
             <p className="text-[#b5bac1]">This is the beginning of the conversation.</p>
           </div>
        )}

        {messages.map((msg, index) => {
          // If msg.sender is missing (legacy/error), mock it to prevent crash
          const sender = msg.sender || { username: 'Unknown', avatarUrl: '', id: 'unknown', isBot: false };
          
          const prevMsg = messages[index - 1];
          const msgDate = new Date(msg.timestamp);
          const prevMsgDate = prevMsg ? new Date(prevMsg.timestamp) : new Date(0);
          
          // Group if same user and < 5 mins apart
          const isGrouped = prevMsg && 
            prevMsg.sender && 
            prevMsg.sender.id === sender.id && 
            (msgDate.getTime() - prevMsgDate.getTime() < 5 * 60 * 1000);

          return (
            <div 
              key={msg.id} 
              className={`group flex pr-4 hover:bg-[#2e3035]/60 -mx-4 px-4 relative ${isGrouped ? 'py-0.5' : 'mt-[17px] py-0.5'}`}
            >
              {!isGrouped ? (
                <>
                  <div className="flex-shrink-0 cursor-pointer mt-0.5">
                    <img 
                      src={sender.avatarUrl} 
                      alt={sender.username}
                      className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center">
                      <span className="font-medium text-white hover:underline cursor-pointer mr-2">
                        {sender.username}
                      </span>
                      {sender.isBot && (
                        <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded-[4px] py-[1px] uppercase font-bold flex items-center h-[15px] mt-[1px]">
                           Bot
                        </span>
                      )}
                      <span className="text-xs text-[#949BA4] ml-2 font-medium">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div className="text-[#dbdee1] markdown-content leading-[1.375rem]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 flex-shrink-0 text-[10px] text-[#949BA4] opacity-0 group-hover:opacity-100 text-right select-none leading-[1.375rem] mt-[1px]">
                     {formatTime(msg.timestamp).split('at ')[1]}
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                     <div className="text-[#dbdee1] markdown-content leading-[1.375rem]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                     </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {isTyping && typingUser && (
           <div className="mt-2 pl-[56px] flex items-center pb-2">
              <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="ml-2 text-sm text-[#b5bac1] font-bold">{typingUser.username} is typing...</span>
           </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 flex-shrink-0 z-10">
        <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center">
          <input
            type="text"
            className="bg-transparent flex-1 text-[#dbdee1] placeholder-[#949BA4] outline-none font-medium"
            placeholder={`Message ${channel.type === 'DM' ? '@' : '#'}${channel.name}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      
      <style>{`
        .markdown-content p { margin-bottom: 4px; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content code { background: #2b2d31; padding: 2px 4px; rounded: 3px; font-family: monospace; }
        .markdown-content pre { background: #2b2d31; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 4px 0; }
        .markdown-content pre code { background: transparent; padding: 0; }
        .markdown-content a { color: #00A8FC; text-decoration: none; }
        .markdown-content a:hover { text-decoration: underline; }
        .markdown-content blockquote { border-left: 4px solid #4e5058; padding-left: 8px; color: #949ba4; }
        .markdown-content ul { list-style-type: disc; padding-left: 20px; }
        .markdown-content ol { list-style-type: decimal; padding-left: 20px; }
        .markdown-content strong { font-weight: 700; color: white; }
      `}</style>
    </div>
  );
};

export default ChatArea;