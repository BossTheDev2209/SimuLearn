import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 9;

export const FollowMenu = ({ isFollowMenuOpen, simState, followedObjectId, setFollowedObjectId, activeTool }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const objects = simState?.objects?.filter(o => o.isSpawned) || [];

  const totalPages = Math.ceil(objects.length / ITEMS_PER_PAGE);
  const displayedObjects = useMemo(() => {
    return objects.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  }, [objects, currentPage]);

  // Reset page if it exceeds total pages
  if (currentPage >= totalPages && totalPages > 0) {
    setCurrentPage(totalPages - 1);
  }

  return (
    <AnimatePresence>
      {isFollowMenuOpen && activeTool === 'focus' && (
        <motion.div 
          initial={{ opacity: 0, x: -15, scale: 0.95 }} 
          animate={{ opacity: 1, x: 0, scale: 1 }} 
          exit={{ opacity: 0, x: -15, scale: 0.95 }} 
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute left-[64px] top-[256px] flex flex-col pointer-events-auto z-50 bg-theme-panel dark:bg-[#313338] border border-theme-border rounded-[20px] shadow-2xl p-4 w-[280px]"
        >
          {/* Grid Layout 3x3 */}
          <div className="grid grid-cols-3 gap-2 min-h-[180px]">
            {objects.length === 0 ? (
              <div className="col-span-3 flex items-center justify-center p-8 opacity-40">
                <span className="text-[11px] font-bold text-theme-muted font-['Chakra_Petch']">ไม่มีวัตถุ</span>
              </div>
            ) : (
              displayedObjects.map((obj) => (
                <div 
                  key={obj.id}
                  onClick={() => setFollowedObjectId(obj.id)}
                  className={`
                    group relative flex flex-col items-center justify-center gap-2 p-2 rounded-[12px] transition-all cursor-pointer border h-[64px]
                    ${followedObjectId === obj.id 
                      ? 'bg-white dark:bg-[#1E1F22] border-[#FFB65A]/60 shadow-md scale-[1.05] z-10' 
                      : 'bg-transparent border-transparent hover:bg-theme-hover dark:hover:bg-[#3F4147] hover:border-theme-border/50'}
                  `}
                >
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-black/10 shadow-sm shrink-0" 
                    style={{ backgroundColor: obj.color }} 
                  />
                  <span className={`text-[10px] font-bold text-center w-full truncate font-['Chakra_Petch'] transition-colors ${followedObjectId === obj.id ? 'text-[#FFB65A]' : 'text-theme-primary'}`}>
                    {obj.name || 'วัตถุ'}
                  </span>
                  
                  {followedObjectId === obj.id && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFollowedObjectId(null);
                      }}
                      className="absolute -top-1 -right-1 p-0.5 bg-[#FFB65A] text-white rounded-full shadow-lg scale-90 hover:opacity-90 transition-all font-bold"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-theme-border/30">
              <button 
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg hover:bg-theme-hover dark:hover:bg-[#3F4147] transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-theme-secondary group-hover:text-theme-primary">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </button>

              <div className="flex gap-1.5">
                {[...Array(totalPages)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentPage ? 'w-4 bg-[#FFB65A]' : 'w-1.5 bg-theme-border opacity-50'}`} 
                  />
                ))}
              </div>

              <button 
                disabled={currentPage === totalPages - 1}
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                className="p-1.5 rounded-lg hover:bg-theme-hover dark:hover:bg-[#3F4147] transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-theme-secondary group-hover:text-theme-primary">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
