import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const FollowMenu = ({ isFollowMenuOpen, setIsFollowMenuOpen, simState, followedObjectId, setFollowedObjectId }) => {
  return (
    <AnimatePresence>
      {isFollowMenuOpen && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white dark:bg-[#313338] border border-theme-border rounded-[14px] shadow-lg p-3 flex flex-col gap-2 pointer-events-auto min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] font-bold text-theme-primary">ติดตามวัตถุ</span>
            <button onClick={() => setIsFollowMenuOpen(false)} className="text-theme-muted hover:text-red-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
            {(simState?.objects || []).length === 0 && <span className="text-xs text-theme-muted text-center py-2">ไม่มีวัตถุในแบบจำลอง</span>}
            {simState?.objects?.map(obj => (
              <button 
                key={obj.id} 
                onClick={() => { setFollowedObjectId(obj.id); setIsFollowMenuOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${followedObjectId === obj.id ? 'bg-[#FF9E2A]/20 text-[#FF9E2A] border-[#FF9E2A]/30 border' : 'bg-gray-50 dark:bg-gray-800/50 text-theme-secondary hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: obj.color }} />
                <span className="truncate flex-1">{obj.shape === 'circle' ? 'วงกลม' : obj.shape === 'rectangle' ? 'สี่เหลี่ยม' : 'สามเหลี่ยม'}</span>
              </button>
            ))}
          </div>
          {(simState?.objects || []).length > 0 && (
            <button onClick={() => setFollowedObjectId(null)} className="mt-1 text-[11px] font-bold text-red-500 uppercase tracking-tighter hover:bg-red-50 dark:hover:bg-red-500/10 py-1.5 rounded-md transition-all text-center">Clear Track</button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
