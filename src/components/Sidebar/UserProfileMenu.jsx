import React, { useState, useEffect, useRef } from 'react';

export default function UserProfileMenu({ userName, onLogout, isOpen, onSettingsClick }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      ref={profileRef}
      className={`p-4 flex items-center justify-between ${isOpen ? 'border-t border-theme-border' : 'justify-center border-t border-theme-border pt-4 mb-2'} shrink-0 relative`}
    >
      <div 
        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
        className={`flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1.5 -ml-1.5 rounded-lg transition-colors w-full ${!isOpen && 'justify-center'}`}
      >
        <div className="w-8 h-8 bg-[#FFB65A] border border-[#C59355]/30 rounded-full flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
          {userName ? userName.charAt(0).toUpperCase() : 'U'}
        </div>
        {isOpen && (
          <div className="leading-tight overflow-hidden flex-1">
            <p className="text-[13px] font-bold text-theme-primary truncate">{userName}</p>
            <p className="text-[10px] font-bold text-theme-muted mt-0.5 truncate uppercase tracking-tighter">
              {userName?.includes("Guest") ? "Guest Mode" : "Student"}
            </p>
          </div>
        )}
      </div>

      {isProfileMenuOpen && (
        <div className={`absolute ${isOpen ? 'left-4 w-[200px]' : 'left-full ml-4 w-[170px]'} bottom-[calc(100%-8px)] bg-theme-panel border border-theme-border rounded-xl shadow-xl z-50 py-1.5 text-[13px] font-medium overflow-hidden`}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsProfileMenuOpen(false); onSettingsClick?.(); }}
            className="mx-1 w-[calc(100%-8px)] flex items-center gap-3 px-3 py-2.5 text-theme-primary hover:bg-theme-hover rounded-lg transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>การตั้งค่า</span>
          </button>
          <div className="my-1 mx-3 border-t border-theme-border"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsProfileMenuOpen(false); onLogout(); }} 
            className="mx-1 w-[calc(100%-8px)] flex items-center gap-3 px-3 py-2.5 text-[#FFB65A] hover:bg-[#FFB65A]/10 dark:hover:bg-[#FFB65A]/20 rounded-lg transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  );
}
