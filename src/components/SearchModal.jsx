import { useState, useRef, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchModal({ isOpen, onClose, simulations, onNewSimulation, onSelectSimulation }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  // Auto-focus
  useEffect(() => {
    let timer;
    if (isOpen && inputRef.current) {
      timer = setTimeout(() => inputRef.current.focus(), 100);
    }
    return () => clearTimeout(timer);
  }, [isOpen]);

  // close with esc
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose]);

  const filtered = query.trim() === ''
    ? simulations
    : simulations.filter((sim) =>
        sim.title.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/*blur bg*/}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()} // กัน Modal ปิดเวลาคลิกข้างใน
            className="relative w-full max-w-[620px] bg-theme-sidebar rounded-2xl shadow-2xl overflow-hidden border border-theme-border flex flex-col"
          >
            <div className="flex items-center gap-3 px-6 py-5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-theme-muted">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาแบบจำลองของคุณ..."
                className="flex-1 bg-transparent outline-none text-[17px] text-theme-primary placeholder-[#80848E] font-medium tracking-wide"
              />
              <button
                onClick={handleClose}
                className="text-theme-muted hover:text-white transition cursor-pointer p-1.5 rounded-full hover:bg-white/5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="border-t border-theme-border/50" />

            {/*Results*/}
            <div className="max-h-[480px] overflow-y-auto px-3 py-3 custom-scrollbar">
              
              {/*New Simulation btn*/}
              <button
                onClick={() => { onNewSimulation(); handleClose(); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-theme-main/50 hover:bg-theme-main transition-all cursor-pointer mb-3 group border border-theme-border/30"
              >
                <div className="bg-theme-accent/10 p-2 rounded-lg group-hover:bg-theme-accent/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFAA44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-theme-primary font-bold">เริ่มแบบจำลองใหม่</p>
                  <p className="text-[12px] text-theme-muted font-medium">สร้างแบบจำลองใหม่ได้ทันที</p>
                </div>
              </button>

              {/*History*/}
              {filtered.length > 0 ? (
                <div className="mt-1">
                  <p className="text-[11px] uppercase tracking-wider text-theme-accent-text font-bold px-4 py-2 select-none">
                    {query.trim() ? 'ผลการค้นหา' : 'ประวัติการทดลองล่าสุด'}
                  </p>
                  {filtered.map((sim) => (
                    <button
                      key={sim.id}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-theme-hover transition-colors cursor-pointer group"
                      onClick={() => { onSelectSimulation(sim.id); handleClose(); }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-theme-muted group-hover:text-[#FFAA44] transition-colors">
                        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      <span className="text-[15px] text-theme-secondary font-medium group-hover:text-white transition-colors truncate">
                        {sim.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 opacity-30">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-theme-muted mb-4">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <p className="text-[15px] text-theme-muted font-bold">ไม่พบรายการที่ค้นหา</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}