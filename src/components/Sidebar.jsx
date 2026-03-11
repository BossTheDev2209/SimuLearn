import { useState, useRef, useEffect } from 'react';
import logoImg from '../assets/Stylized Atomic Structure Logo-Photoroom.png';

export default function Sidebar({ 
  simulations, 
  activeSimId, 
  onNewSimulation, 
  onSelectSimulation, 
  onDeleteSimulation, 
  onRenameSimulation, 
  onShareSimulation, 
  onHomeClick, 
  onSearchClick,
  onSettingsClick,
  userName,
  onLogout 
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (renamingId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => setTimeout(timer);
    }
  }, [toastMessage]);

  const handleStartRename = (sim) => {
    setRenamingId(sim.id);
    setRenameValue(sim.title);
    setActiveMenu(null);
  };

  const handleConfirmRename = () => {
    if (renamingId !== null && renameValue.trim()) {
      onRenameSimulation(renamingId, renameValue);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleCancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const handleShare = (sim) => {
    onShareSimulation(sim.id);
    setActiveMenu(null);
    setToastMessage('คัดลอกลิงก์แล้ว!');
  };

  return (
    <div className={`${isOpen ? 'w-[240px]' : 'w-[64px]'} bg-theme-sidebar flex flex-col justify-between border-r border-theme-border h-full z-10 transition-all duration-300 flex-shrink-0`}>
      <div className={`p-4 ${!isOpen && 'px-2'} flex flex-col items-center flex-1 overflow-hidden`}>
        
        {/* Logo & Toggle (ของเดิม) */}
        <div className={`flex items-center w-full ${isOpen ? 'justify-between' : 'justify-center'} mb-8 mt-2`}>
          {isOpen && (
             <div className="flex items-center">
               <button onClick={onHomeClick} className="bg-theme-accent text-white rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm overflow-hidden mr-2 cursor-pointer hover:scale-110 active:scale-95 transition-transform">
                  <img src={logoImg} alt="logo" className="w-full h-full object-cover shadow-sm bg-white" />
               </button>
             </div>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-theme-secondary hover:text-white transition cursor-pointer p-1 rounded-md hover:bg-white/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              {isOpen ? <line x1="15" y1="3" x2="15" y2="21"></line> : <line x1="9" y1="3" x2="9" y2="21"></line>}
            </svg>
          </button>
        </div>

        <div className="space-y-2 mb-8 w-full">
          <button onClick={onNewSimulation} title="แบบจำลองใหม่" className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2 w-full text-left' : 'justify-center w-full p-2'} text-[14px] text-theme-primary font-bold hover:bg-theme-hover hover:text-white rounded-lg transition cursor-pointer`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            {isOpen && <span className="truncate">แบบจำลองใหม่</span>}
          </button>
          <button onClick={onSearchClick} title="ค้นหาแบบจำลอง" className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2 w-full text-left' : 'justify-center w-full p-2'} text-[14px] text-theme-primary font-bold hover:bg-theme-hover hover:text-white rounded-lg transition cursor-pointer`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            {isOpen && <span className="truncate">ค้นหาแบบจำลอง</span>}
          </button>
        </div>

        {isOpen && (
          <div className="w-full px-2 mt-2 flex-1 overflow-hidden flex flex-col">
            <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="w-full flex items-center justify-between text-[13px] font-bold text-theme-accent-text mb-3 px-2 py-1 group shrink-0">
              <span>แบบจำลองของคุณ</span>
              <span className="text-theme-muted hover:text-theme-primary transition flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/10">
                {isHistoryOpen ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 flex-1 ${isHistoryOpen ? 'max-h-full opacity-100' : 'max-h-0 opacity-0'}`}>
              <ul className="space-y-[2px] text-[14px] text-theme-secondary font-medium h-full overflow-y-auto custom-scrollbar" ref={menuRef}>
                {simulations.length === 0 ? (
                  <li className="px-2 py-3 text-[13px] text-theme-muted italic text-center">ยังไม่มีแบบจำลอง</li>
                ) : (
                  simulations.map((sim, index) => (
                    <li key={sim.id} onClick={() => { if (renamingId !== sim.id) onSelectSimulation(sim.id); }} className={`group/item relative cursor-pointer rounded-lg px-2 py-2 transition-colors duration-200 flex items-center justify-between ${activeSimId === sim.id ? 'bg-theme-active text-white font-bold' : activeMenu === index ? 'bg-theme-hover text-white' : 'hover:bg-theme-hover hover:text-white'}`}>
                      {renamingId === sim.id ? (
                        <input ref={renameInputRef} type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmRename(); if (e.key === 'Escape') handleCancelRename(); }} onBlur={handleConfirmRename} onClick={(e) => e.stopPropagation()} className="flex-1 mr-1 bg-theme-main text-theme-primary text-[14px] font-medium rounded px-1.5 py-0.5 outline-none border border-theme-border-hover focus:border-[#D3A068]" />
                      ) : ( <span className="truncate flex-1 mr-1">{sim.title}</span> )}
                      {renamingId !== sim.id && (
                        <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === index ? null : index); }} className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${activeMenu === index ? 'opacity-100 bg-white/10 text-theme-primary' : 'opacity-0 group-hover/item:opacity-100 hover:bg-white/10 text-theme-muted hover:text-theme-primary'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      )}
                      {activeMenu === index && (
                        <div className="absolute right-0 top-full mt-1 w-[170px] bg-theme-panel border border-theme-border rounded-xl shadow-xl z-50 py-1.5 text-[13px] font-medium overflow-hidden">
                          <button onClick={(e) => { e.stopPropagation(); handleShare(sim); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-theme-secondary hover:bg-theme-hover hover:text-white transition-colors cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg><span>แชร์</span></button>
                          <button onClick={(e) => { e.stopPropagation(); handleStartRename(sim); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-theme-secondary hover:bg-theme-hover hover:text-white transition-colors cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg><span>เปลี่ยนชื่อ</span></button>
                          <div className="my-1 mx-3 border-t border-theme-border"></div>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteSimulation(sim.id); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>ลบประวัติ</span></button>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification (ของเดิม) */}
      {toastMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-theme-panel border border-theme-border text-theme-primary text-[13px] font-medium px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      <div 
        ref={profileRef}
        className={`p-4 flex items-center justify-between ${isOpen ? 'border-t border-theme-border' : 'justify-center border-t border-theme-border pt-4 mb-2'} shrink-0 relative`}
      >
        <div 
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className={`flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-white/5 p-1.5 -ml-1.5 rounded-lg transition-colors w-full ${!isOpen && 'justify-center'}`}
        >
          <div className="w-8 h-8 bg-[#FFB65A] border border-[#C59355]/30 rounded-full flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-sm">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          {isOpen && (
            <div className="leading-tight overflow-hidden flex-1">
              <p className="text-[13px] font-bold text-theme-primary truncate">{userName}</p>
              <p className="text-[10px] font-bold text-theme-muted mt-0.5 truncate uppercase tracking-tighter">
                {userName.includes("Guest") ? "Guest Mode" : "Student"}
              </p>
            </div>
          )}
        </div>

        {/* Profile Options Menu */}
        {isProfileMenuOpen && (
          <div className={`absolute ${isOpen ? 'left-4 w-[200px]' : 'left-full ml-4 w-[170px]'} bottom-[calc(100%-8px)] bg-theme-panel border border-theme-border rounded-xl shadow-xl z-50 py-1.5 text-[13px] font-medium overflow-hidden`}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsProfileMenuOpen(false); onSettingsClick?.(); }}
              className="mx-1 w-[calc(100%-8px)] flex items-center gap-3 px-3 py-2.5 text-theme-secondary hover:text-white hover:bg-theme-hover rounded-lg transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
                <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span>การตั้งค่า</span>
            </button>
            <div className="my-1 mx-3 border-t border-theme-border"></div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsProfileMenuOpen(false); onLogout(); }} 
              className="mx-1 w-[calc(100%-8px)] flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
    </div>
  );
}