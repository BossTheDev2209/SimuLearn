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
      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); start(); }}
      onPointerUp={(e) => { e.stopPropagation(); e.preventDefault(); stop(); }}
      onPointerLeave={(e) => { e.stopPropagation(); e.preventDefault(); stop(); }}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
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
        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-[11px] font-bold text-theme-secondary uppercase tracking-wider flex items-center gap-1.5">
            {vectorEditor.type === 'velocity' ? 'Velocity (v)' : 'Force (F)'}
            <div className={`w-2 h-2 rounded-full ${vectorEditor.type === 'velocity' ? 'bg-blue-500' : 'bg-red-500'}`} />
          </span>
          <span className="text-[10px] font-bold text-theme-muted bg-theme-sidebar px-1.5 py-0.5 rounded">
            {vectorEditor.type === 'velocity' ? 'm/s' : 'N'}
          </span>
        </div>

        <div className="flex flex-col gap-2 min-w-[160px]">
          {/* Name Field */}
          <div className="flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-lg px-2 py-1.5 border border-transparent focus-within:border-[#FFB65A]/50 transition-colors">
            <span className="text-[10px] font-bold text-theme-muted uppercase w-10">ป้าย:</span>
            <input 
              type="text" 
              placeholder="ชื่อเวกเตอร์..."
              className="flex-1 bg-transparent text-xs font-semibold outline-none text-theme-primary placeholder:text-theme-muted/50" 
              value={vectorEditor.name || ''} 
              onChange={(e) => { 
                const val = e.target.value;
                setVectorEditor(prev => ({ ...prev, name: val })); 
                updateVectorValue(vectorEditor.objId, vectorEditor.type, vectorEditor.index, { name: val }); 
              }} 
            />
          </div>

          <div className="flex gap-2">
            {/* Magnitude */}
            <div className="flex-1 flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-lg px-2 py-1.5 relative pr-7 border border-transparent focus-within:border-[#FFB65A]/50 transition-colors">
              <span className="text-[10px] font-bold text-theme-muted uppercase">เมา:</span>
              <input 
                autoFocus 
                type="number" 
                className="w-full bg-transparent text-xs font-semibold outline-none text-theme-primary" 
                value={vectorEditor.magnitude} 
                onChange={(e) => { 
                  const val = Number(e.target.value) || 0; 
                  setVectorEditor(prev => ({ ...prev, magnitude: val })); 
                  updateVectorValue(vectorEditor.objId, vectorEditor.type, vectorEditor.index, { magnitude: val }); 
                }} 
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
                }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 border-t border-[#d6cfbe] dark:border-white/5">
                  <ArrowDownIcon />
                </HoldableButton>
              </div>
            </div>

            {/* Angle */}
            <div className="flex-1 flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-lg px-2 py-1.5 relative pr-7 border border-transparent focus-within:border-[#FFB65A]/50 transition-colors">
              <span className="text-[10px] font-bold text-theme-muted uppercase">มุม:</span>
              <input 
                type="number" 
                className="w-full bg-transparent text-xs font-semibold outline-none text-theme-primary" 
                value={vectorEditor.angle} 
                onChange={(e) => { 
                  const val = Number(e.target.value) || 0; 
                  setVectorEditor(prev => ({ ...prev, angle: val })); 
                  updateVectorValue(vectorEditor.objId, vectorEditor.type, vectorEditor.index, { angle: val }); 
                }} 
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
                }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 border-t border-[#d6cfbe] dark:border-white/5">
                  <ArrowDownIcon />
                </HoldableButton>
              </div>
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex items-center justify-between p-1 bg-theme-sidebar/30 rounded-lg">
            <span className="text-[10px] font-bold text-theme-muted uppercase ml-1">สี:</span>
            <div className="flex gap-1.5">
              {(vectorEditor.type === 'velocity' 
                ? ['#3B82F6', '#60A5FA', '#2563EB', '#1D4ED8', '#1E40AF'] 
                : ['#EF4444', '#F87171', '#DC2626', '#B91C1C', '#991B1B']
              ).map(color => (
                <button 
                  key={color} 
                  onClick={() => {
                    setVectorEditor(prev => ({ ...prev, color }));
                    updateVectorValue(vectorEditor.objId, vectorEditor.type, vectorEditor.index, { color });
                  }}
                  className={`w-4 h-4 rounded-full border-2 transition-transform ${vectorEditor.color === color ? 'border-theme-primary scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setVectorEditor(null); }} 
          className="bg-[#FFB65A] hover:bg-[#FFB65A]/90 text-white text-[11px] font-bold py-2 rounded-lg mt-1 transition-colors shadow-sm"
        >
          ยืนยัน
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
