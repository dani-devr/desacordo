import React, { useState, useEffect, useRef } from 'react';
import { Channel, Message, User } from '../types';
import { MOCK_USERS, BOT_GENERAL, BOT_DEV, BOT_CASUAL } from '../constants';

interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isTyping: boolean;
  typingUser?: User;
}

const SYSTEM_MENTIONS = [
  { id: 'everyone', username: 'everyone', isBot: false, avatarUrl: '', color: '#FFFFFF' },
  { id: 'here', username: 'here', isBot: false, avatarUrl: '', color: '#FFFFFF' },
];

const ALL_MENTIONABLE_USERS = [
  ...SYSTEM_MENTIONS,
  ...MOCK_USERS,
  BOT_GENERAL,
  BOT_DEV,
  BOT_CASUAL
];

const MentionText: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  
  const parts = content.split(/(@\w+)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/^@\w+/)) {
          const isSystemMention = part === '@everyone' || part === '@here';
          return (
            <span 
              key={i}
              className={`rounded-[3px] px-[2px] cursor-pointer transition-colors font-medium
                ${isSystemMention 
                  ? 'bg-[#5865f2]/30 text-[#dee0fc] hover:bg-[#5865f2] hover:text-white' 
                  : 'bg-[#41434a] text-[#c9cdfb] hover:bg-[#5865f2] hover:text-white'}`}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

const ChatArea: React.FC<ChatAreaProps> = ({ 
  channel, 
  messages, 
  onSendMessage, 
  isTyping,
  typingUser
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle Input Changes and Trigger Mention Menu
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Regex to detect if we are typing a mention at the end or after a space
    // Matches "@something" at the end of string
    const match = value.match(/@(\w*)$/);
    
    if (match) {
      setShowMentions(true);
      setMentionFilter(match[1].toLowerCase());
      setMentionCursorIndex(0); // Reset selection
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    // Replace the partial mention with the full username
    const newValue = inputValue.replace(/@(\w*)$/, `@${username} `);
    setInputValue(newValue);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredMentions = ALL_MENTIONABLE_USERS.filter(u => 
    u.username.toLowerCase().startsWith(mentionFilter)
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionCursorIndex(prev => (prev > 0 ? prev - 1 : filteredMentions.length - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionCursorIndex(prev => (prev < filteredMentions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleMentionSelect(filteredMentions[mentionCursorIndex].username);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        onSendMessage(inputValue);
        setInputValue('');
        setShowMentions(false);
      }
    }
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0 relative">
      {/* Chat Header */}
      <div className="h-12 border-b border-[#26272d] shadow-sm flex items-center px-4 flex-shrink-0 z-10 bg-[#313338]">
        <div className="text-2xl text-[#80848E] mr-2 font-light">#</div>
        <div className="font-bold text-white mr-4 truncate">{channel.name}</div>
        <div className="text-[#949BA4] text-sm truncate hidden sm:block border-l border-[#3f4147] pl-4">
          {channel.description}
        </div>
        
        <div className="ml-auto flex items-center space-x-4 text-[#b5bac1]">
           <svg className="hover:text-[#dbdee1] cursor-pointer" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 13v-2H6v2h12zm0-7v2H6V6h12zm0 12v-2H6v2h12z"/></svg>
           <svg className="hover:text-[#dbdee1] cursor-pointer" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-4 pt-4">
        <div className="mt-auto mb-6">
           <div className="w-16 h-16 bg-[#41434a] rounded-full flex items-center justify-center mb-4">
             <div className="text-4xl text-white font-light">#</div>
           </div>
           <h1 className="text-3xl font-bold text-white mb-2">Welcome to #{channel.name}!</h1>
           <p className="text-[#b5bac1]">This is the start of the #{channel.name} channel.</p>
        </div>

        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const msgDate = new Date(msg.timestamp);
          const prevMsgDate = prevMsg ? new Date(prevMsg.timestamp) : new Date(0);
          
          const isGrouped = prevMsg && prevMsg.sender.id === msg.sender.id && (msgDate.getTime() - prevMsgDate.getTime() < 5 * 60 * 1000);
          const isMentioned = msg.content && (msg.content.includes('@everyone') || msg.content.includes('@here') || (typingUser && msg.content.includes(`@${typingUser.username}`)));
          
          return (
            <div 
              key={msg.id} 
              className={`group flex pr-4 hover:bg-[#2e3035]/60 -mx-4 px-4 relative ${isGrouped ? 'py-0.5' : 'mt-[17px] py-0.5'} ${isMentioned ? 'bg-[#444038] hover:bg-[#4d483f]' : ''}`}
            >
              {isMentioned && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#faa61a]"></div>}
              
              {!isGrouped ? (
                <>
                  <div className="flex-shrink-0 cursor-pointer mt-0.5">
                    <img 
                      src={msg.sender.avatarUrl} 
                      alt={msg.sender.username}
                      className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center">
                      <span className="font-medium text-white hover:underline cursor-pointer mr-2">
                        {msg.sender.username}
                      </span>
                      {msg.sender.isBot && (
                        <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded-[4px] py-[1px] uppercase font-bold flex items-center h-[15px] mt-[1px]">
                           Bot
                        </span>
                      )}
                      <span className="text-xs text-[#949BA4] ml-2 font-medium">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className={`text-[#dbdee1] whitespace-pre-wrap leading-[1.375rem] ${msg.sender.isBot ? 'font-light' : ''}`}>
                      <MentionText content={msg.content} />
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 flex-shrink-0 text-[10px] text-[#949BA4] opacity-0 group-hover:opacity-100 text-right select-none leading-[1.375rem] mt-[1px]">
                     {formatTime(msg.timestamp).split('at ')[1]}
                  </div>
                  <div className="flex-1 min-w-0 ml-4">
                     <p className={`text-[#dbdee1] whitespace-pre-wrap leading-[1.375rem] ${msg.sender.isBot ? 'font-light' : ''}`}>
                      <MentionText content={msg.content} />
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {isTyping && typingUser && (
           <div className="mt-[17px] pl-[56px] animate-pulse flex items-center">
              <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                 <div className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-[#b5bac1] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="ml-2 text-sm text-[#b5bac1] font-bold">{typingUser.username} is typing...</span>
           </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Mention Autocomplete Menu */}
      {showMentions && filteredMentions.length > 0 && (
        <div className="absolute bottom-[68px] left-4 bg-[#2b2d31] rounded-md shadow-2xl border border-[#1e1f22] w-64 overflow-hidden z-20">
          <div className="text-[#b5bac1] text-[10px] font-bold uppercase px-3 py-2 bg-[#313338]">
            Members matching @{mentionFilter}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredMentions.map((user, idx) => (
              <div 
                key={user.id}
                onClick={() => handleMentionSelect(user.username)}
                onMouseEnter={() => setMentionCursorIndex(idx)}
                className={`flex items-center px-3 py-2 cursor-pointer ${
                  idx === mentionCursorIndex ? 'bg-[#404249]' : 'hover:bg-[#35373c]'
                }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full mr-3" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center mr-3">
                    <span className="text-white text-xs font-bold">@</span>
                  </div>
                )}
                <div>
                   <div className="text-white text-sm font-medium flex items-center">
                     {user.username}
                     {user.isBot && <span className="ml-1 bg-[#5865F2] text-white text-[10px] px-1 rounded uppercase">Bot</span>}
                   </div>
                   {(user.id === 'everyone' || user.id === 'here') && (
                      <div className="text-[#b5bac1] text-xs">Notify everyone</div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 pb-6 flex-shrink-0 z-10">
        <div className="bg-[#383a40] rounded-lg px-4 py-2.5 flex items-center">
          <div className="cursor-pointer text-[#b5bac1] hover:text-[#dbdee1] mr-4">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="bg-transparent flex-1 text-[#dbdee1] placeholder-[#949BA4] outline-none font-medium"
            placeholder={`Message #${channel.name}`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <div className="flex space-x-3 ml-3 text-[#b5bac1]">
             <svg className="cursor-pointer hover:text-[#dbdee1]" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5zM8.5 11c.83 0 1.5-1.12 1.5-2.5S9.33 6 8.5 6 7 7.12 7 8.5 7.67 11 8.5 11zm7 0c.83 0 1.5-1.12 1.5-2.5S16.33 6 15.5 6 14 7.12 14 8.5 14.67 11 15.5 11z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
