import React, { memo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

const HoldableButton = memo(({ onAction, className, children, title, tabIndex }) => {
  const timerRef = useRef(null);
  
  const start = useCallback(() => {
    onAction();
    timerRef.current = setTimeout(() => {
      timerRef.current = setInterval(onAction, 80);
    }, 400);
  }, [onAction]);

  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return (
    <button 
      tabIndex={tabIndex}
      onPointerDown={(e) => { e.stopPropagation(); start(); }}
      onPointerUp={(e) => { e.stopPropagation(); stop(); }}
      onPointerLeave={(e) => { e.stopPropagation(); stop(); }}
      onClick={(e) => e.stopPropagation()}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
});

export const VectorTooltip = ({ vectorEditor, setVectorEditor, updateVectorValue }) => {
  if (!vectorEditor) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.8 }} 
        className="fixed z-[300] bg-white dark:bg-[#2B2D31] rounded-[10px] shadow-lg border border-theme-border p-2 flex flex-col gap-2" 
        style={{ left: vectorEditor.screenX + 15, top: vectorEditor.screenY + 15 }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-bold text-theme-secondary flex items-center gap-1">
          {vectorEditor.type === 'velocity' ? 'เวกเตอร์ความเร็ว (v)' : 'เวกเตอร์แรง (F)'}
          {vectorEditor.type === 'velocity' ? <span className="w-2 h-2 rounded-full bg-blue-500" /> : <span className="w-2 h-2 rounded-full bg-red-500" />}
        </span>
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <div className="flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-md px-2 py-1 relative pr-8">
            <span className="text-xs text-theme-secondary font-['Chakra_Petch'] w-[35px]">ขนาด:</span>
            <input 
              autoFocus 
              type="number" 
              className="w-full bg-transparent text-sm font-medium outline-none text-theme-primary" 
              value={vectorEditor.magnitude} 
              onChange={(e) => { 
                e.stopPropagation();
                const val = Number(e.target.value) || 0; 
                setVectorEditor(prev => ({ ...prev, magnitude: val })); 
                updateVectorValue(vectorEditor.objId, vectorEditor.type, vectorEditor.index, { magnitude: val }); 
              }} 
              onKeyDown={(e) => e.stopPropagation()}
            />
            <div className="absolute right-1 top-1 bottom-1 flex flex-col bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden">
              <HoldableButton onAction={() => { 
                setVectorEditor(prev => { 
                  if (!prev) return null; 
                  const val = Number(prev.magnitude) + 1; 
                  updateVectorValue(prev.objId, prev.type, prev.index, { magnitude: val }); 
                  return { ...prev, magnitude: val }; 
                }); 
              }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5">
                <ArrowUpIcon />
              </HoldableButton>
              <HoldableButton onAction={() => { 
                setVectorEditor(prev => { 
                  if (!prev) return null; 
                  const val = Math.max(0, Number(prev.magnitude) - 1); 
                  updateVectorValue(prev.objId, prev.type, prev.index, { magnitude: val }); 
                  return { ...prev, magnitude: val }; 
                }); 
              }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 border-t border-[#d6cfbe]">
                <ArrowDownIcon />
              </HoldableButton>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-md px-2 py-1 relative pr-8">
            <span className="text-xs text-theme-secondary font-['Chakra_Petch'] w-[35px]">มุม:</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-sm font-medium outline-none text-theme-primary" 
              value={vectorEditor.angle} 
              onChange={(e) => { 
                e.stopPropagation();
                const val = Number(e.target.value) || 0; 
                setVectorEditor(prev => ({ ...prev, angle: val })); 
                updateVectorValue(vectorEditor.objId, vectorEditor.type, vectorEditor.index, { angle: val }); 
              }} 
              onKeyDown={(e) => e.stopPropagation()}
            />
            <div className="absolute right-1 top-1 bottom-1 flex flex-col bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden">
              <HoldableButton onAction={() => { 
                setVectorEditor(prev => { 
                  if (!prev) return null; 
                  const val = Number(prev.angle) + 1; 
                  updateVectorValue(prev.objId, prev.type, prev.index, { angle: val }); 
                  return { ...prev, angle: val }; 
                }); 
              }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5">
                <ArrowUpIcon />
              </HoldableButton>
              <HoldableButton onAction={() => { 
                setVectorEditor(prev => { 
                  if (!prev) return null; 
                  const val = Number(prev.angle) - 1; 
                  updateVectorValue(prev.objId, prev.type, prev.index, { angle: val }); 
                  return { ...prev, angle: val }; 
                }); 
              }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 border-t border-[#d6cfbe]">
                <ArrowDownIcon />
              </HoldableButton>
            </div>
          </div>
        </div>
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setVectorEditor(null); }} 
          onKeyDown={(e) => e.stopPropagation()}
          className="bg-theme-primary text-white text-xs font-bold py-1.5 rounded-md mt-1"
        >
          ตกลง
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
