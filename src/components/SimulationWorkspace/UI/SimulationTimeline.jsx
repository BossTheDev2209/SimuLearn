import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '../Timebar';

export const SimulationTimeline = ({ 
  isTimelineCollapsed, 
  setIsTimelineCollapsed, 
  isPlaying, 
  displayTime, 
  maxTime, 
  handleTogglePlay, 
  handleSeek 
}) => {
  return (
    <div className="absolute bottom-4 right-4 z-40 flex justify-end pointer-events-none">
      <motion.div animate={{ width: isTimelineCollapsed ? 48 : 400, height: isTimelineCollapsed ? 48 : 60, borderRadius: isTimelineCollapsed ? 24 : 20 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="bg-white/90 dark:bg-[#313338]/90 backdrop-blur-md shadow-2xl border border-theme-border pointer-events-auto relative overflow-hidden">
        <button onClick={() => setIsTimelineCollapsed(false)} className={`absolute right-0 top-0 w-12 h-12 flex items-center justify-center text-[#FFB65A] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10 ${isTimelineCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none scale-75'}`}><ChevronLeftIcon /></button>
        <div className={`absolute right-0 top-0 bottom-0 w-[400px] p-3 flex items-center gap-4 transition-all ${isTimelineCollapsed ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'}`}>
          <button onClick={handleTogglePlay} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#FFB65A] text-white shadow-sm active:scale-95">
            {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 3 14 9-14 9V3z"/></svg>}
          </button>
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-end mb-0.5"><span className="text-[11px] font-bold text-theme-muted uppercase">Simulation</span><span className="text-[12px] font-bold text-theme-primary font-['Chakra_Petch']">{displayTime.toFixed(2)}s <span className="opacity-40 font-normal">/ {maxTime.toFixed(2)}s</span></span></div>
            <div className="relative group h-4 flex items-center">
              <div className="absolute inset-0 h-1 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-red-400 dark:bg-red-500" style={{ width: `${maxTime > 0 ? (displayTime / maxTime) * 100 : 0}%` }} /></div>
              <input type="range" min="0" max={maxTime || 0.1} step="0.01" value={displayTime} onChange={(e) => handleSeek(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
              <div className="absolute w-3 h-3 bg-white dark:bg-[#1E1F22] border-2 border-red-500 rounded-full shadow-sm top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `calc(${maxTime > 0 ? (displayTime / maxTime) * 100 : 0}% - 6px)` }} />
            </div>
          </div>
          <button onClick={() => setIsTimelineCollapsed(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-theme-secondary rounded-lg transition-colors ml-1"><ChevronRightIcon /></button>
        </div>
      </motion.div>
    </div>
  );
};
