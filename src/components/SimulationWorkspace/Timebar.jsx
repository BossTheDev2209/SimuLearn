import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- SVG Icons Components ---
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
export const RestartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>;
export const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
export const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

export default function Timebar({
  isPlaying,
  timeScale,
  displayTime,
  onTogglePlay,
  onRestart,
  onTimeScaleChange,
}) {
  const [isTimebarOpen, setIsTimebarOpen] = useState(true);

  return (
    <div className="relative font-['Chakra_Petch'] text-gray-800" onPointerDown={e => e.stopPropagation()}>
      <div className="flex flex-col gap-2 items-end">
        {/* Main Bar */}
        <div 
          className="flex items-center bg-[#e8e2d5] dark:bg-[#313338] rounded-xl shadow-md border border-[#d6cfbe] dark:border-[#1E1F22] h-10 transition-all duration-300 ease-in-out py-1 group/timebar"
          style={{ width: isTimebarOpen ? 'auto' : '48px', minWidth: '40px' }}
        >
          <div className="flex items-center text-gray-700 dark:text-gray-300 bg-[#dcd6c7] dark:bg-[#3F4147] rounded-lg p-1.5 ml-1 shadow-inner flex-shrink-0">
            <ClockIcon />
          </div>
          
          <div className={`flex items-center overflow-hidden transition-all duration-300 ${isTimebarOpen ? 'opacity-100 max-w-[500px]' : 'opacity-0 max-w-0'}`}>
            <button 
              onClick={onRestart} 
              className="bg-[#FFB65A] hover:opacity-90 text-white p-1.5 rounded-lg mx-1.5 transition-all shadow-sm active:scale-95 flex-shrink-0" 
              title="รีสตาร์ทเวลา"
            >
              <RestartIcon />
            </button>
            
            <button 
              onClick={onTogglePlay} 
              className="hover:bg-[#dcd6c7] dark:hover:bg-[#3F4147] text-gray-800 dark:text-gray-300 p-1.5 rounded-lg mr-1.5 transition-colors active:scale-95 flex-shrink-0" 
              title="เล่น/หยุด"
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            
            <div className="flex items-center bg-[#dcd6c7] dark:bg-[#3F4147] rounded-lg px-2.5 py-1 text-[11px] font-bold gap-3 shadow-inner h-full mr-1 flex-shrink-0">
              {[0.1, 0.5, 1, 2, 5, 10].map(speed => (
                <button 
                  key={speed}
                  onClick={() => onTimeScaleChange(speed)}
                  className={`${timeScale === speed ? 'text-black dark:text-white scale-110 font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} transition-all`}
                >
                  x{speed}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setIsTimebarOpen(!isTimebarOpen)} 
            className="p-1 w-8 h-8 flex items-center justify-center hover:bg-[#dcd6c7] dark:hover:bg-[#3F4147] text-gray-800 dark:text-gray-300 rounded-lg transition-colors flex-shrink-0 cursor-pointer mx-1"
          >
            {isTimebarOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {/* Time Display Pill (Read-only) */}
        <AnimatePresence>
          {isTimebarOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center bg-[#e8e2d5] dark:bg-[#313338] text-gray-800 dark:text-gray-200 rounded-xl px-4 py-1.5 shadow-sm border border-[#d6cfbe] dark:border-[#1E1F22] h-9"
            >
              <span className="text-sm font-bold opacity-70 mr-1">t:</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white min-w-[32px] text-center">
                {(displayTime ?? 0).toFixed(1)}
              </span>
              <span className="text-sm font-bold opacity-70 ml-1">s</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}