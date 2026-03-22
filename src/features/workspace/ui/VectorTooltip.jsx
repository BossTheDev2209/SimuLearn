import React, { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ObjectAppearancePicker from '../../../components/ObjectAppearancePicker';

// --- Icons ---
const CloseIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const EditIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>;
const CheckIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;

export const VectorTooltip = ({ vectorEditor, setVectorEditor, updateVectorValue }) => {
  const [localState, setLocalState] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const pickerAnchorRef = useRef(null);
  
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
  const y = data.screenY !== undefined ? data.screenY - 120 : window.innerHeight / 2 - 100;

  const handleUpdate = (updates) => {
    const newState = { ...data, ...updates };
    setLocalState(newState);
    setVectorEditor(newState);
    updateVectorValue(data.objId, data.type, data.index, updates);
    
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1000);
  };

  const commitMag = () => {
    let val = parseFloat(magInput);
    if (!isNaN(val) && isFinite(val)) {
      if (val === 0) {
        updateVectorValue(data.objId, data.type, data.index, { remove: true });
        setVectorEditor(null);
        return;
      }
      
      // Safety Limit: Speed of Light (~3e8 units).
      // Prevents browser crash/Matter.js death from extreme values (99e+99) in velocity or force.
      const MAX_MAG = 299792458; 
      if (val > MAX_MAG) val = MAX_MAG;
      if (val < -MAX_MAG) val = -MAX_MAG;

      handleUpdate({ magnitude: val });
      setMagInput(String(val));
    } else {
      setMagInput(String(data.magnitude));
    }
  };

  const commitAngle = () => {
    let val = parseFloat(angleInput);
    if (!isNaN(val)) {
      // Normalize to 0-360
      let normalized = val % 360;
      if (normalized < 0) normalized += 360;
      normalized = Math.round(normalized * 10) / 10;
      
      handleUpdate({ angle: normalized });
      setAngleInput(String(normalized));
    } else {
      setAngleInput(String(data.angle));
    }
  };

  const stopAll = (e) => {
    e.stopPropagation();
    if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          key={`${data.objId}-${data.type}-${data.index}`}
          initial={{ opacity: 0, scale: 0.9, y: 5 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.9, y: 5 }}
          className="fixed z-[300] bg-theme-panel backdrop-blur-md rounded-xl shadow-2xl border border-theme-border p-2 flex flex-col gap-2 min-w-[170px] font-['Chakra_Petch']"
          style={{ left: x, top: y }}
          onPointerDown={stopAll}
          onPointerUp={stopAll}
          onMouseDown={stopAll}
          onMouseUp={stopAll}
          onClick={stopAll}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
               ref={pickerAnchorRef}
               onClick={() => setShowPicker(!showPicker)}
               className="w-3.5 h-3.5 rounded-full border-2 border-white/20 hover:scale-110 active:scale-95 transition-transform"
               style={{ backgroundColor: data.color }}
            />
            {showPicker && (
              <ObjectAppearancePicker 
                color={data.color}
                onColorChange={(c) => { handleUpdate({ color: c }); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
                getAnchor={() => pickerAnchorRef.current}
              />
            )}
            <input 
              className="bg-transparent text-[13px] font-bold text-theme-primary outline-none w-20 placeholder:opacity-30"
              value={data.name || ''}
              placeholder="Name..."
              onChange={(e) => handleUpdate({ name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
              onPointerDown={stopAll}
            />
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSaved && (
                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-[#4ADE80]">
                  <CheckIcon />
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => setVectorEditor(null)} className="text-theme-muted hover:text-[#FFB65A] transition-colors p-0.5">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 px-0.5">
          {/* Magnitude Row */}
          <div className="flex-1 flex flex-col gap-0.5 bg-black/20 dark:bg-white/5 border border-theme-border rounded-lg px-2 py-1.5 group focus-within:border-[#FFB65A]/50 transition-colors">
            <span className="text-[10px] text-theme-muted font-bold group-focus-within:text-[#FFB65A] transition-colors">
              {data.type === 'velocity' ? 'อัตราเร็ว' : 'แรงกระทำ'}
            </span>
            <div className="flex items-center justify-between">
              <input 
                type="text"
                className="w-full bg-transparent text-[13px] font-bold text-[#FFB65A] outline-none"
                value={magInput}
                onChange={(e) => setMagInput(e.target.value)}
                onBlur={commitMag}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
                onPointerDown={stopAll}
              />
              <span className="text-[10px] font-bold text-theme-muted">{data.type === 'velocity' ? 'm/s' : 'N'}</span>
            </div>
          </div>

          {/* Angle Row */}
          <div className="flex-1 flex flex-col gap-0.5 bg-black/20 dark:bg-white/5 border border-theme-border rounded-lg px-2 py-1.5 group focus-within:border-[#FFB65A]/50 transition-colors">
            <span className="text-[10px] text-theme-muted font-bold group-focus-within:text-[#FFB65A] transition-colors">
              มุมกับแนวระดับ
            </span>
            <div className="flex items-center justify-between">
              <input 
                type="text"
                className="w-full bg-transparent text-[13px] font-bold text-[#FFB65A] outline-none"
                value={angleInput}
                onChange={(e) => setAngleInput(e.target.value)}
                onBlur={commitAngle}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); e.stopPropagation(); }}
                onPointerDown={stopAll}
              />
              <span className="text-[10px] font-bold text-theme-muted">องศา</span>
            </div>
          </div>
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
