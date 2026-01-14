import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Channel, Message, User } from '../types';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string, attachments?: {id: string, type: 'image'|'video'|'file', url: string, name: string}[]) => void;
  isTyping: boolean;
  typingUser?: User;
  onUserClick?: (user: User) => void;
  mentionableUsers: User[];
  currentUser: User;
}

const LinkEmbed = ({ url }: { url: string }) => {
    let domain = '';
    try {
        domain = new URL(url).hostname;
    } catch (e) {
        return null;
    }
    
    return (
        <div className="mt-2 bg-[#2b2d31] border-l-4 border-[#313338] rounded p-3 max-w-md">
            <div className="text-[#b5bac1] text-xs uppercase font-bold">{domain}</div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#00A8FC] hover:underline font-medium block truncate">{url}</a>
            <div className="text-[#dbdee1] text-sm mt-1">External Link detected. Be careful.</div>
        </div>
    );
};

const ChatArea: React.FC<ChatAreaProps> = ({ 
  channel, 
  messages, 
  onSendMessage, 
  isTyping,
  typingUser,
  onUserClick,
  mentionableUsers,
  currentUser
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isTyping, channel.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if(showMentionPopup && mentionFilter) {
          // Select first mention if enter is pressed while popup is open
          const filtered = mentionableUsers.filter(u => u.username.toLowerCase().startsWith(mentionFilter.toLowerCase()));
          if (filtered.length > 0) insertMention(filtered[0]);
          return;
      }
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
        setShowEmojiPicker(false);
        setShowMentionPopup(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      // Simple mention detection
      const lastWord = val.split(' ').pop();
      if (lastWord && lastWord.startsWith('@') && lastWord.length > 1) {
          setMentionFilter(lastWord.slice(1));
          setShowMentionPopup(true);
      } else {
          setShowMentionPopup(false);
      }
  };

  const insertMention = (user: User) => {
      const words = inputValue.split(' ');
      words.pop(); // Remove the partial @mention
      setInputValue(words.join(' ') + ` @${user.username} `);
      setShowMentionPopup(false);
      inputRef.current?.focus();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue(prev => prev + emojiData.emoji);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Determine simplified type
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      
      onSendMessage("", [{
        id: crypto.randomUUID(),
        type,
        url: base64,
        name: file.name
      }]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    if (isToday) return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const extractLinks = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      return matches || [];
  };

  // Components for Markdown
  const renderComponents = {
    p: ({children}: any) => {
        const content = React.Children.toArray(children);
        return (
            <p className="mb-1">
                {content.map((child: any, i) => {
                    if (typeof child === 'string') {
                        // Regex to find @username
                        const parts = child.split(/(@\w+)/g);
                        return parts.map((part, j) => {
                            if (part.startsWith('@')) {
                                const username = part.substring(1);
                                const isMe = username === currentUser.username;
                                return <span key={j} className={`${isMe ? 'bg-[#504514] text-[#f0b132] hover:bg-[#504514]' : 'bg-[#414652] text-[#c9cdfb] hover:bg-[#5865F2] hover:text-white'} font-medium px-0.5 rounded cursor-pointer transition-colors`}>{part}</span>;
                            }
                            return part;
                        });
                    }
                    return child;
                })}
            </p>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0 relative h-full">
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
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-4 pt-4" onClick={() => setShowEmojiPicker(false)}>
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
          const sender = msg.sender || { username: 'Unknown', avatarUrl: '', id: 'unknown', isBot: false };
          const prevMsg = messages[index - 1];
          const msgDate = new Date(msg.timestamp);
          const prevMsgDate = prevMsg ? new Date(prevMsg.timestamp) : new Date(0);
          
          const isGrouped = prevMsg && 
            prevMsg.senderId === sender.id && 
            (msgDate.getTime() - prevMsgDate.getTime() < 5 * 60 * 1000);

          const links = extractLinks(msg.content);
          const isMentioningMe = msg.content.includes(`@${currentUser.username}`);

          return (
            <div 
              key={msg.id} 
              className={`group flex pr-4 hover:bg-[#2e3035]/60 -mx-4 px-4 relative ${isGrouped ? 'py-0.5' : 'mt-[17px] py-0.5'} ${isMentioningMe ? 'bg-[#504514]/30 hover:bg-[#504514]/50 border-l-2 border-[#f0b132]' : ''}`}
            >
              {!isGrouped ? (
                <>
                  <div className="flex-shrink-0 cursor-pointer mt-0.5" onClick={() => onUserClick?.(sender)}>
                    <img src={sender.avatarUrl} alt={sender.username} className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"/>
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center">
                      <span onClick={() => onUserClick?.(sender)} className="font-medium text-white hover:underline cursor-pointer mr-2">{sender.username}</span>
                      {sender.isBot && <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded uppercase font-bold flex items-center h-[15px] mt-[1px]">Bot</span>}
                      {sender.isNitro && <span className="ml-1 text-[#f47fff] text-xs cursor-help" title="Nitro Subscriber">♦</span>}
                      <span className="text-xs text-[#949BA4] ml-2 font-medium">{formatTime(msg.timestamp)}</span>
                    </div>
                    {/* Attachments */}
                    {msg.attachments?.map(att => (
                        <div key={att.id} className="mt-2 mb-1">
                            {att.type === 'image' && (
                                <img src={att.url} alt={att.name} className="max-w-full max-h-[300px] rounded-lg border border-[#2b2d31]" />
                            )}
                            {att.type === 'video' && (
                                <video src={att.url} controls className="max-w-full max-h-[300px] rounded-lg" />
                            )}
                            {att.type === 'file' && (
                                <div className="bg-[#2b2d31] p-3 rounded flex items-center max-w-sm border border-[#313338]">
                                    <div className="mr-3 text-[#dbdee1]">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[#00A8FC] font-medium truncate">{att.name}</div>
                                        <div className="text-[#949BA4] text-xs">Unknown Size</div>
                                    </div>
                                    <a href={att.url} download={att.name} className="ml-3 text-[#b5bac1] hover:text-white">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                    {/* Text Content */}
                    {msg.content && (
                        <div className="text-[#dbdee1] markdown-content leading-[1.375rem]">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={renderComponents}
                        >
                            {msg.content}
                        </ReactMarkdown>
                        </div>
                    )}
                    {/* Link Embeds */}
                    {links.map((link, i) => <LinkEmbed key={i} url={link} />)}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 flex-shrink-0 text-[10px] text-[#949BA4] opacity-0 group-hover:opacity-100 text-right select-none leading-[1.375rem] mt-[1px]">
                     {formatTime(msg.timestamp).split('at ')[1]}
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                     {/* Attachments Grouped */}
                    {msg.attachments?.map(att => (
                        <div key={att.id} className="mt-1 mb-1">
                             {att.type === 'image' && <img src={att.url} alt={att.name} className="max-w-full max-h-[300px] rounded-lg border border-[#2b2d31]" />}
                             {att.type === 'video' && <video src={att.url} controls className="max-w-full max-h-[300px] rounded-lg" />}
                             {att.type === 'file' && (
                                <div className="bg-[#2b2d31] p-3 rounded flex items-center max-w-sm border border-[#313338]">
                                    <div className="text-[#00A8FC] font-medium truncate flex-1">{att.name}</div>
                                    <a href={att.url} download={att.name} className="ml-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></a>
                                </div>
                             )}
                        </div>
                    ))}
                     {msg.content && (
                         <div className="text-[#dbdee1] markdown-content leading-[1.375rem]">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={renderComponents}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                     )}
                     {links.map((link, i) => <LinkEmbed key={i} url={link} />)}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {isTyping && typingUser && (
           <div className="mt-2 pl-[56px] flex items-center pb-2">
              <span className="text-sm text-[#b5bac1] font-bold animate-pulse">{typingUser.username} is typing...</span>
           </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="px-4 pb-6 flex-shrink-0 z-10 relative">
        {showMentionPopup && (
            <div className="absolute bottom-[70px] left-4 bg-[#2b2d31] rounded-lg shadow-xl w-64 border border-[#1e1f22] overflow-hidden z-50">
                <div className="bg-[#1e1f22] px-3 py-1 text-xs text-[#949ba4] font-bold uppercase">Members matching @{mentionFilter}</div>
                <div className="max-h-48 overflow-y-auto">
                    {mentionableUsers.filter(u => u.username.toLowerCase().startsWith(mentionFilter.toLowerCase())).map(u => (
                        <div 
                            key={u.id} 
                            onClick={() => insertMention(u)}
                            className="flex items-center px-3 py-2 hover:bg-[#404249] cursor-pointer"
                        >
                            <img src={u.avatarUrl} className="w-6 h-6 rounded-full mr-2"/>
                            <span className="text-white font-medium">{u.username}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center relative">
          
          {/* File Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-6 h-6 rounded-full bg-[#b5bac1] hover:text-white flex items-center justify-center mr-3 hover:bg-[#dbdee1] transition-colors"
          >
            <span className="text-[#313338] font-bold text-lg leading-none pb-0.5">+</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            // accept all
            onChange={handleFileChange}
          />

          <input
            ref={inputRef}
            type="text"
            className="bg-transparent flex-1 text-[#dbdee1] placeholder-[#949BA4] outline-none font-medium"
            placeholder={`Message ${channel.type === 'DM' ? '@' : '#'}${channel.name}`}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          
          {/* Emoji Button */}
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="ml-2 text-[#b5bac1] hover:text-[#dbdee1] grayscale hover:grayscale-0 transition-all"
          >
             <div className="w-6 h-6 text-xl">😃</div>
          </button>
        </div>

        {showEmojiPicker && (
            <div className="absolute bottom-20 right-4 z-50 shadow-2xl rounded-xl">
                <EmojiPicker 
                    theme={Theme.DARK} 
                    onEmojiClick={handleEmojiClick}
                    lazyLoadEmojis={true}
                />
            </div>
        )}
      </div>
      
      <style>{`
        .markdown-content p { margin-bottom: 4px; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content code { background: #2b2d31; padding: 2px 4px; rounded: 3px; font-family: monospace; }
        .markdown-content pre { background: #2b2d31; padding: 8px; border-radius: 4px; overflow-x: auto; margin: 4px 0; }
        .markdown-content pre code { background: transparent; padding: 0; }
        .markdown-content a { color: #00A8FC; text-decoration: none; }
        .markdown-content a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
};

export default ChatArea;