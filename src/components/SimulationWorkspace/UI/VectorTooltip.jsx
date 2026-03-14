import React, { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icons ---
const CloseIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const EditIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>;
const MagIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 10 6-6"/><path d="m3 21 3-3"/><path d="M7 21h14"/><path d="M3 17v4h4"/></svg>;
const AngleIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21H3V3"/><path d="M18 3c.8 4.4-4.2 7.8-7.7 8.1"/><circle cx="12" cy="12" r="1"/></svg>;
const CheckIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;

export const VectorTooltip = ({ vectorEditor, setVectorEditor, updateVectorValue }) => {
  const [localState, setLocalState] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  
  // Local string states for inputs to avoid numeric "stuck" behavior
  const [magInput, setMagInput] = useState('');
  const [angleInput, setAngleInput] = useState('');

  useEffect(() => {
    if (vectorEditor) {
      setLocalState({ ...vectorEditor });
      setMagInput(String(vectorEditor.magnitude));
      setAngleInput(String(vectorEditor.angle));
    }
  }, [vectorEditor]);

  const isVisible = !!vectorEditor;
  const data = localState;

  if (!data) return null;

  // Default to a centered-ish position if coordinates are missing (e.g. from Control Panel)
  const x = data.screenX !== undefined ? data.screenX + 15 : window.innerWidth / 2 - 75;
  const y = data.screenY !== undefined ? data.screenY + 15 : window.innerHeight / 2 - 100;

  const handleUpdate = (updates) => {
    const newState = { ...data, ...updates };
    setLocalState(newState);
    setVectorEditor(newState);
    updateVectorValue(data.objId, data.type, data.index, updates);
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1000);
  };

  const commitMag = () => {
    const val = parseFloat(magInput);
    if (!isNaN(val)) handleUpdate({ magnitude: val });
    else setMagInput(String(data.magnitude));
  };

  const commitAngle = () => {
    const val = parseFloat(angleInput);
    if (!isNaN(val)) handleUpdate({ angle: val });
    else setAngleInput(String(data.angle));
  };

  const accentColor = data.type === 'velocity' ? '#3B82F6' : '#EF4444';

  const stopAll = (e) => {
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          key={`${data.objId}-${data.type}-${data.index}`}
          initial={{ opacity: 0, y: 10, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="fixed z-[300] bg-white/95 dark:bg-[#1E1F22]/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 p-2 flex flex-col gap-1.5 min-w-[130px] font-['Chakra_Petch']"
          style={{ left: x, top: y }}
          onPointerDown={stopAll}
          onPointerUp={stopAll}
          onMouseDown={stopAll}
          onMouseUp={stopAll}
          onClick={stopAll}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-1.5 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="text-gray-400 opacity-60"><EditIcon /></div>
            <input 
              className="bg-transparent text-[11px] font-bold text-theme-primary outline-none w-14"
              value={data.name || ''}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
              onPointerDown={stopAll}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <AnimatePresence>
              {showSaved && (
                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-[#4ADE80]">
                  <CheckIcon />
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => setVectorEditor(null)} className="text-gray-400 hover:text-theme-primary transition-colors p-0.5">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 px-1 pb-1">
          <div className="flex-1 flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 rounded-lg px-2 py-1.5">
            <div className="text-gray-400"><MagIcon /></div>
            <input 
              type="text"
              className="w-full bg-transparent text-[12px] font-bold text-theme-primary outline-none"
              value={magInput}
              onChange={(e) => setMagInput(e.target.value)}
              onBlur={commitMag}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
              onPointerDown={stopAll}
            />
            <span className="text-[9px] font-bold text-gray-400">{data.type === 'velocity' ? 'm/s' : 'N'}</span>
          </div>
          <div className="flex-1 flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 rounded-lg px-2 py-1.5">
            <div className="text-gray-400"><AngleIcon /></div>
            <input 
              type="text"
              className="w-full bg-transparent text-[12px] font-bold text-theme-primary outline-none"
              value={angleInput}
              onChange={(e) => setAngleInput(e.target.value)}
              onBlur={commitAngle}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
              onPointerDown={stopAll}
            />
            <span className="text-[9px] font-bold text-gray-400">°</span>
          </div>
        </div>

        {/* Color Dots */}
        <div className="flex items-center justify-between px-1">
          <div className="flex gap-1.5">
            {(localState.type === 'velocity' 
              ? ['#3B82F6', '#60A5FA', '#2563EB', '#38BDF8', '#1E40AF'] 
              : ['#EF4444', '#F87171', '#DC2626', '#FB7185', '#991B1B']
            ).map(color => (
              <button 
                key={color} 
                onClick={() => handleUpdate({ color })}
                className={`w-2.5 h-2.5 rounded-full transition-transform ${localState.color === color ? 'ring-2 ring-gray-300 dark:ring-white/30 scale-125' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
