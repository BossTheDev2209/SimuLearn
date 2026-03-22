import React from 'react';


const tools = [
  { id: 'cursor', title: 'เลือก / เลื่อนจอ (V)', icon: <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/> },
  { id: 'ruler', title: 'ไม้บรรทัด (R)', icon: <><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></> },
  { id: 'add', title: 'เพิ่มวัตถุ (A)', icon: <><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></> },
  { id: 'erase', title: 'ลบวัตถุ (E)', icon: <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></> },
  { id: 'velocity', title: 'เวกเตอร์ความเร็ว', color: 'text-blue-500', icon: <><path d="M7 7h10v10"/><path d="M7 17 17 7"/></> },
  { id: 'force', title: 'เวกเตอร์แรง', color: 'text-red-500', icon: <><path d="M7 7h10v10"/><path d="M7 17 17 7"/></> },
  { type: 'divider' },
  { id: 'focus', title: 'ติดตามวัตถุ (F)', color: 'text-[#FFB65A]', icon: <><circle cx="12" cy="12" r="3"/><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></> },
  { id: 'clearAll', title: 'ลบวัตถุทั้งหมด', color: 'text-[#FFB65A] hover:bg-[#FFB65A]/10 dark:hover:bg-[#FFB65A]/20', icon: <><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></> }
];

export const Toolbar = ({ activeTool, isToolbarOpen, handleToolClick, setIsToolbarOpen }) => {
  return (
    <div className="pointer-events-auto flex flex-col items-center bg-[#E5DDD4] dark:bg-[#313338] border border-theme-border rounded-[14px] shadow-md transition-all duration-300 ease-in-out overflow-hidden py-1" style={{ width: '40px', maxHeight: isToolbarOpen ? '500px' : '40px' }}>
      <div className={`flex flex-col items-center gap-1 w-full transition-all duration-300 overflow-hidden ${isToolbarOpen ? 'opacity-100 h-auto pb-2' : 'opacity-0 h-0 m-0 pb-0'}`}>
        {tools.map((tool, idx) => tool.type === 'divider' ? (
          <div key={`div-${idx}`} className="w-6 h-[1px] bg-theme-border my-1 flex-shrink-0" />
        ) : (
          <button 
            key={tool.id} 
            onClick={() => handleToolClick(tool.id)} 
            title={tool.title} 
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${activeTool === tool.id ? 'bg-white dark:bg-[#1E1F22] shadow-sm text-theme-primary' : 'text-theme-secondary hover:bg-[#D9CFC7] dark:hover:bg-[#3F4147] hover:text-theme-primary'} ${tool.color || ''}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {tool.icon}
            </svg>
          </button>
        ))}
      </div>
      <button 
        onClick={() => setIsToolbarOpen(!isToolbarOpen)} 
        className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-[#D9CFC7] dark:hover:bg-[#3F4147] transition-colors flex-shrink-0 cursor-pointer"
      >
        {isToolbarOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        )}
      </button>
    </div>
  );
};
