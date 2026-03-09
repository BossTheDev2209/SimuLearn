import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchModal({ isOpen, onClose, simulations, onNewSimulation, onSelectSimulation }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Auto-focus เมื่อเปิด Modal
  useEffect(() => {
    let timer;
    if (isOpen && inputRef.current) {
      timer = setTimeout(() => inputRef.current.focus(), 100);
    }
    if (!isOpen) setQuery('');
    return () => clearTimeout(timer);
  }, [isOpen]);

  // ปิดด้วยปุ่ม Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const filtered = query.trim() === ''
    ? simulations
    : simulations.filter((sim) =>
        sim.title.toLowerCase().includes(query.toLowerCase())
      );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/*blur background*/}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()} // กัน Modal ปิดเวลาคลิกข้างใน
            className="relative w-full max-w-[620px] bg-[#EBE5DD] rounded-2xl shadow-2xl overflow-hidden border border-[#DCD5CB] flex flex-col"
          >
            <div className="flex items-center gap-3 px-6 py-5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-500">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาแบบจำลองของคุณ..."
                className="flex-1 bg-transparent outline-none text-[17px] text-gray-800 placeholder-gray-500 font-medium tracking-wide"
              />
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-black transition cursor-pointer p-1.5 rounded-full hover:bg-black/5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="border-t border-[#DCD5CB]/50" />

            {/*Results*/}
            <div className="max-h-[480px] overflow-y-auto px-3 py-3 custom-scrollbar">
              
              {/*New Simulation Button*/}
              <button
                onClick={() => { onNewSimulation(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-4 rounded-xl bg-[#FAF9F6]/50 hover:bg-[#FAF9F6] transition-all cursor-pointer mb-3 group border border-[#DCD5CB]/30"
              >
                <div className="bg-[#FFAA44]/10 p-2 rounded-lg group-hover:bg-[#FFAA44]/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFAA44" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-gray-800 font-bold">เริ่มแบบจำลองใหม่</p>
                  <p className="text-[12px] text-gray-500 font-medium">สร้างแบบจำลองใหม่ได้ทันที</p>
                </div>
              </button>

              {/*History*/}
              {filtered.length > 0 ? (
                <div className="mt-1">
                  <p className="text-[11px] uppercase tracking-wider text-[#D3A068] font-bold px-4 py-2 select-none">
                    {query.trim() ? 'ผลการค้นหา' : 'ประวัติการทดลองล่าสุด'}
                  </p>
                  {filtered.map((sim) => (
                    <button
                      key={sim.id}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#DCD5CB] transition-colors cursor-pointer group"
                      onClick={() => { onSelectSimulation(sim.id); onClose(); }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400 group-hover:text-[#FFAA44] transition-colors">
                        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      <span className="text-[15px] text-gray-700 font-medium group-hover:text-black transition-colors truncate">
                        {sim.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 opacity-30">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 mb-4">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  <p className="text-[15px] text-gray-600 font-bold">ไม่พบรายการที่ค้นหา</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}