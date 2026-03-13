import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const ClearModal = ({ isClearModalOpen, setIsClearModalOpen, handleClearAllConfirm }) => {
  return (
    <AnimatePresence>
      {isClearModalOpen && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#313338] rounded-2xl shadow-2xl p-6 w-[320px] border border-theme-border font-['Chakra_Petch'] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">ยืนยันการเคลียร์พื้นที่?</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">วัตถุทั้งหมดในแบบจำลองจะถูกลบทิ้ง<br/>และไม่สามารถกู้คืนได้</p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setIsClearModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#3F4147] text-gray-700 dark:text-gray-200 rounded-xl font-bold">ยกเลิก</button>
              <button onClick={handleClearAllConfirm} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors">ลบทิ้ง</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
