import React, { useState, useRef, useEffect } from 'react';

export default function SimulationHistoryList({
  simulations,
  activeSimId,
  isHistoryLoading,
  isOpen,
  onSelectSimulation,
  onDeleteSimulation,
  onRenameSimulation,
  onShareSimulation,
  setToastMessage
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
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

  if (!isOpen) return null;

  return (
    <div className="w-full px-2 mt-2 flex-1 overflow-hidden flex flex-col">
      <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="w-full flex items-center justify-between text-[13px] font-bold text-theme-primary mb-3 px-2 py-1 group shrink-0">
        <span className="whitespace-nowrap">แบบจำลองของคุณ</span>
        <span className="text-theme-muted hover:text-theme-primary transition flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
          {isHistoryOpen
            ? <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          }
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 flex-1 ${isHistoryOpen ? 'max-h-full opacity-100' : 'max-h-0 opacity-0'}`}>
        <ul className="space-y-[2px] text-[14px] font-medium h-full overflow-y-auto custom-scrollbar" ref={menuRef}>
          
          {isHistoryLoading ? (
            <li className="flex flex-col gap-1 mt-1 px-1">
              {[75, 55, 90, 45, 65].map((w, i) => (
                <div key={i} className="flex items-center h-10 px-3 rounded-lg">
                  <div className="w-5 h-5 rounded-full skeleton-shimmer shrink-0" />
                  <div
                    className="h-3.5 skeleton-shimmer rounded-full ml-3"
                    style={{ width: `${w}%` }}
                  />
                </div>
              ))}
            </li>
          ) : simulations.length === 0 ? (
            <li className="px-2 py-3 text-[13px] text-theme-muted italic text-center">ยังไม่มีแบบจำลอง</li>
          ) : (
            simulations.map((sim, index) => (
              <li
                key={sim.id}
                onClick={() => { if (renamingId !== sim.id) onSelectSimulation(sim.id); }}
                className={`group/item relative cursor-pointer rounded-lg px-2 py-2 transition-colors duration-200 flex items-center justify-between ${
                  activeSimId === sim.id
                    ? 'bg-[#FFB65A] text-gray-900 dark:bg-theme-hover dark:text-white font-bold'
                    : activeMenu === index
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
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
                    className="flex-1 mr-1 bg-theme-main text-theme-primary text-[14px] font-medium rounded px-1.5 py-0.5 outline-none border border-theme-border focus:border-[#FFB65A]"
                  />
                ) : (
                  <span className="truncate flex-1 mr-1">{sim.title}</span>
                )}

                {renamingId !== sim.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === index ? null : index); }}
                    className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer ${
                      activeMenu === index
                        ? 'opacity-100 bg-black/10 dark:bg-white/10 text-theme-primary'
                        : 'opacity-0 group-hover/item:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 text-theme-muted hover:text-theme-primary'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                )}

                {/* Dropdown */}
                {activeMenu === index && (
                  <div className="absolute right-0 top-full mt-1 w-[170px] bg-theme-panel border border-theme-border rounded-xl shadow-xl z-50 py-1.5 text-[13px] font-medium overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); handleShare(sim); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-theme-primary hover:bg-theme-hover transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>
                      <span>แชร์</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleStartRename(sim); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-theme-primary hover:bg-theme-hover transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                      <span>เปลี่ยนชื่อ</span>
                    </button>
                    <div className="my-1 mx-3 border-t border-theme-border"></div>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteSimulation(sim.id); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[#FFB65A] hover:bg-[#FFB65A]/10 dark:hover:bg-[#FFB65A]/20 transition-colors cursor-pointer">
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
  );
}
