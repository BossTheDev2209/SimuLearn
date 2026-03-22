import React, { useState, useEffect } from 'react';
import logoImg from '../assets/Stylized Atomic Structure Logo-Photoroom.png';
import SimulationHistoryList from './Sidebar/SimulationHistoryList';
import UserProfileMenu from './Sidebar/UserProfileMenu';

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
  onLogout,
  isHistoryLoading
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <div className={`${isOpen ? 'w-[240px]' : 'w-[64px]'} bg-theme-sidebar flex flex-col justify-between border-r border-theme-border h-full z-10 transition-all duration-300 flex-shrink-0 overflow-hidden`}>
      <div className={`p-4 ${!isOpen && 'px-2'} flex flex-col items-center flex-1 overflow-hidden`}>
        
        {/* ส่วนหัวโลโก้ และปุ่มยืดหด */}
        <div className={`flex items-center w-full ${isOpen ? 'justify-between' : 'justify-center'} mb-8 mt-2`}>
          {isOpen && (
             <div className="flex items-center">
               <button onClick={onHomeClick} className="bg-[#FFB65A] text-white rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm overflow-hidden mr-2 cursor-pointer hover:scale-110 active:scale-95 transition-transform">
                  <img src={logoImg} alt="logo" className="w-full h-full object-cover shadow-sm bg-white" />
               </button>
             </div>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-theme-muted hover:text-theme-primary transition cursor-pointer p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              {isOpen ? <line x1="15" y1="3" x2="15" y2="21"></line> : <line x1="9" y1="3" x2="9" y2="21"></line>}
            </svg>
          </button>
        </div>

        {/* ปุ่มสร้างใหม่ / ค้นหา */}
        <div className="space-y-2 mb-8 w-full">
          <button onClick={onNewSimulation} title="แบบจำลองใหม่" className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2 w-full text-left' : 'justify-center w-full p-2'} text-[14px] text-theme-primary font-bold hover:bg-theme-hover rounded-lg transition cursor-pointer`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            {isOpen && <span className="truncate whitespace-nowrap">แบบจำลองใหม่</span>}
          </button>
          <button onClick={onSearchClick} title="ค้นหาแบบจำลอง" className={`flex items-center ${isOpen ? 'gap-3 px-3 py-2 w-full text-left' : 'justify-center w-full p-2'} text-[14px] text-theme-primary font-bold hover:bg-theme-hover rounded-lg transition cursor-pointer`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            {isOpen && <span className="truncate whitespace-nowrap">ค้นหาแบบจำลอง</span>}
          </button>
        </div>

        {/* ส่วนประวัติ */}
        <SimulationHistoryList 
          simulations={simulations}
          activeSimId={activeSimId}
          isHistoryLoading={isHistoryLoading}
          isOpen={isOpen}
          onSelectSimulation={onSelectSimulation}
          onDeleteSimulation={onDeleteSimulation}
          onRenameSimulation={onRenameSimulation}
          onShareSimulation={onShareSimulation}
          setToastMessage={setToastMessage}
        />
      </div>

      {/* Toast Message */}
      {toastMessage && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-20 bg-theme-panel border border-theme-border text-theme-primary text-[13px] font-medium px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* โปรไฟล์ผู้ใช้ */}
      <UserProfileMenu 
        userName={userName}
        onLogout={onLogout}
        isOpen={isOpen}
        onSettingsClick={onSettingsClick}
      />
    </div>
  );
}