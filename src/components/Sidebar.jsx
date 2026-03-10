import { useState, useRef, useEffect } from 'react';
import logoImg from '../assets/Stylized Atomic Structure Logo-Photoroom.png';

export default function Sidebar({ simulations, activeSimId, onNewSimulation, onSelectSimulation, onDeleteSimulation, onRenameSimulation, onShareSimulation, onHomeClick, onSearchClick }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus rename input
  useEffect(() => {
    if (renamingId !== null && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
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
    <div className={`${isOpen ? 'w-[240px]' : 'w-[64px]'} bg-[#EBE5DD] flex flex-col justify-between border-r border-[#DCD5CB] h-full z-10 transition-all duration-300 flex-shrink-0`}>
      <div className={`p-4 ${!isOpen && 'px-2'} flex flex-col items-center flex-1 overflow-hidden`}>
        {/* Logo & Toggle */}
        <div className={`flex items-center w-full ${isOpen ? 'justify-between' : 'justify-center'} mb-8 mt-2`}>
          {isOpen && (
             <div className="flex items-center">
               <button
                 onClick={onHomeClick}
                 className="bg-[#FFAA44] text-white rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm overflow-hidden mr-2 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
               >
                  <img src={logoImg} alt="logo" className="w-full h-full object-cover shadow-sm bg-white" />
               </button>
             </div>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700 hover:text-black transition cursor-pointer p-1 rounded-md hover:bg-black/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              {isOpen ? <line x1="15" y1="3" x2="15" y2="21"></line> : <line x1="9" y1="3" x2="9" y2="21"></line>}
            </svg>
          </button>
        </div>

        {/*MainBtn*/}
        <div className="space-y-2 mb-8 w-full">
          <button onClick={onNewSimulation} title="แบบจำลองใหม่" className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2 w-full text-left' : 'justify-center w-full p-2'} text-[14px] text-gray-800 font-bold hover:bg-[#DCD5CB] hover:text-black rounded-lg transition cursor-pointer`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            {isOpen && <span className="truncate">แบบจำลองใหม่</span>}
          </button>
          <button onClick={onSearchClick} title="ค้นหาแบบจำลอง" className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2 w-full text-left' : 'justify-center w-full p-2'} text-[14px] text-gray-800 font-bold hover:bg-[#DCD5CB] hover:text-black rounded-lg transition cursor-pointer`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            {isOpen && <span className="truncate">ค้นหาแบบจำลอง</span>}
          </button>
        </div>

        {/*ChatHistory*/}
        {isOpen && (
          <div className="w-full px-2 mt-2 flex-1 overflow-hidden flex flex-col">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full flex items-center justify-between text-[13px] font-bold text-[#D3A068] mb-3 px-2 py-1 group shrink-0"
            >
              <span>แบบจำลองของคุณ</span>
              <span className="text-gray-400 hover:text-gray-700 transition flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/10">
                {isHistoryOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                )}
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 flex-1 ${isHistoryOpen ? 'max-h-full opacity-100' : 'max-h-0 opacity-0'}`}>
              <ul className="space-y-[2px] text-[14px] text-gray-700 font-medium h-full overflow-y-auto custom-scrollbar" ref={menuRef}>
                {simulations.length === 0 ? (
                  <li className="px-2 py-3 text-[13px] text-gray-400 italic text-center">ยังไม่มีแบบจำลอง</li>
                ) : (
                  simulations.map((sim, index) => (
                    <li
                      key={sim.id}
                      onClick={() => { if (renamingId !== sim.id) onSelectSimulation(sim.id); }}
                      className={`group/item relative cursor-pointer rounded-lg px-2 py-2 transition-colors duration-200 flex items-center justify-between ${
                        activeSimId === sim.id
                          ? 'bg-[#D5CBBD] text-black font-bold'
                          : activeMenu === index
                          ? 'bg-[#DCD5CB] text-black'
                          : 'hover:bg-[#DCD5CB] hover:text-black'
                      }`}
                    >
                      {renamingId === sim.id ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                          onBlur={handleConfirmRename}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 mr-1 bg-white/80 text-black text-[14px] font-medium rounded px-1.5 py-0.5 outline-none border border-[#D3A068]/50 focus:border-[#D3A068]"
                        />
                      ) : (
                        <span className="truncate flex-1 mr-1">{sim.title}</span>
                      )}

                      {/*Ellipsis Button*/}
                      {renamingId !== sim.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === index ? null : index); }}
                          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${
                            activeMenu === index
                              ? 'opacity-100 bg-black/10 text-gray-800'
                              : 'opacity-0 group-hover/item:opacity-100 hover:bg-black/10 text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      )}

                      {/*Dropdown Context Menu*/}
                      {activeMenu === index && (
                        <div className="absolute right-0 top-full mt-1 w-[170px] bg-[#FAF6F0] border border-[#DCD5CB] rounded-xl shadow-xl z-50 py-1.5 text-[13px] font-medium overflow-hidden">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShare(sim); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-[#EBE5DD] transition-colors cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
                            <span>แชร์</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRename(sim); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-[#EBE5DD] transition-colors cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                            <span>เปลี่ยนชื่อ</span>
                          </button>
                          <div className="my-1 mx-3 border-t border-[#DCD5CB]"></div>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSimulation(sim.id); setActiveMenu(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            <span>ลบประวัติ</span>
                          </button>
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-[#FAF6F0] border border-[#DCD5CB] text-gray-800 text-[13px] font-medium px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/*UserProfile*/}
      <div className={`p-4 flex items-center ${isOpen ? 'gap-3 border-t border-[#DCD5CB]/50' : 'justify-center border-t border-[#DCD5CB]/50 pt-4 mb-2'} shrink-0`}>
        <div className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        {isOpen && (
          <div className="leading-none overflow-hidden">
            <p className="text-[13px] font-bold text-gray-900 truncate">John Doe</p>
            <p className="text-[10px] font-bold text-gray-500 mt-1 truncate">Student</p>
          </div>
        )}
      </div>
    </div>
  );
}