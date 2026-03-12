import React, { useState, useEffect } from 'react';

export default function ChatArea({ messages, onSendMessage, setIsInteracting }) {
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Use a derived boolean or state to track if we've sent anything yet.
  const hasSentMessage = messages.length > 0;
  
  // The input elevates when focused, has text, or a message has been sent.
  const isActive = isFocused || inputText.length > 0 || hasSentMessage;

  useEffect(() => {
    setIsInteracting(isActive);
  }, [isActive, setIsInteracting]);

  const handleSend = () => {
    if (!inputText.trim() || hasSentMessage) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div 
      className={`w-full max-w-[700px] mx-auto px-6 absolute left-1/2 -translate-x-1/2 z-20 flex flex-col justify-end pointer-events-none transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isActive ? 'bottom-1/2 translate-y-1/2 scale-105' : 'bottom-8 translate-y-0 scale-100'
      }`}
    >
      
      <div className={`relative flex items-center bg-[#C9B59C] dark:bg-[#44444E] border-none rounded-[28px] p-[6px] shadow-sm drop-shadow-md transition-all duration-500 ${hasSentMessage ? 'opacity-50 pointer-events-none' : 'pointer-events-auto'}`}>
        
        {/* เลื่อนกล่องซ้ายมือ */}
        <div className="relative group ml-[2px]">
          <button className="flex items-center justify-center w-10 h-10 rounded-full text-[#1E1F22] dark:text-[#949BA4] transition hover:bg-black/10 dark:hover:bg-[#52525E] hover:text-black dark:hover:text-white cursor-pointer disabled:opacity-50" disabled={hasSentMessage}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-gray-800 dark:bg-[#1E1F22] text-white text-[13px] font-medium py-2 px-3 rounded-[8px] tracking-wide shadow-lg border border-transparent dark:border-[#3F4147]">
            แนบไฟล์เอกสารหรือรูปภาพและอื่นๆ
          </div>
        </div>

        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={hasSentMessage}
          placeholder={hasSentMessage ? "กำลังจำลอง..." : "วันนี้เราทดลองอะไรกันดี?"} 
          className="flex-1 bg-transparent text-[#F9F8F6] dark:text-[#DBDEE1] py-[10px] px-3 outline-none placeholder-[#F9F8F6] dark:placeholder-[#949BA4] font-medium text-[17px] tracking-wide disabled:opacity-80 drop-shadow-sm"
        />

        {/* เลื่อนกล่องขวามือ */}
        <div className="relative group mr-[2px]">
          <button onClick={handleSend} disabled={hasSentMessage} className="flex items-center justify-center w-10 h-10 rounded-full text-[#1E1F22] dark:text-[#949BA4] transition hover:bg-black/10 dark:hover:bg-[#52525E] hover:text-black dark:hover:text-white cursor-pointer disabled:opacity-50">
             {inputText.trim().length > 0 ? (
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
             ) : (
               <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
             )}
          </button>
          
          {inputText.trim().length === 0 && (
             <div className="absolute left-1/2 -translate-x-1/2 -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-gray-800 dark:bg-[#1E1F22] text-white text-[13px] font-medium py-2 px-3 rounded-[8px] tracking-wide shadow-lg z-50 border border-transparent dark:border-[#3F4147]">
               สั่งการด้วยเสียง
             </div>
          )}
        </div>
      </div>

      <div className={`text-center mt-3 pointer-events-auto transition-opacity duration-700 ${isActive ? 'opacity-0' : 'opacity-100'}`}>
        <p className="text-[13px] text-[#C9B59C] dark:text-theme-muted font-medium tracking-wide drop-shadow-sm">
          By messaging with SimuLearn, you agree to our <a href="#" className="underline text-[#C59355] dark:text-theme-primary font-bold hover:opacity-80 transition-opacity">Terms</a> and <a href="#" className="underline text-[#C59355] dark:text-theme-primary font-bold hover:opacity-80 transition-opacity">Policy</a>.
        </p>
      </div>
    </div>
  );
}