import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SharedSlider = memo(({ label, value, min, max, step, onChange }) => (
  <div className="flex items-center gap-2 px-1">
    {label && <span className="text-xs font-semibold text-theme-muted">{label}</span>}
    <input 
      type="range" 
      min={min} max={max} step={step} 
      value={value}
      onChange={onChange}
      className="w-20 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#FFB65A]"
      title={`ปัจจุบัน: ${value}`}
    />
  </div>
));

export const SpawnOverlay = ({ activeTool, spawnConfig, setSpawnConfig }) => {
  if (activeTool !== 'add') return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, x: -10 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -10 }} 
        className="bg-white dark:bg-[#313338] border border-theme-border rounded-[14px] shadow-lg p-2 flex items-center gap-3 pointer-events-auto"
      >
        <select 
          className="bg-[#F2F3F5] dark:bg-[#1E1F22] text-sm text-theme-primary border border-theme-border rounded-lg px-2 py-1.5 outline-none focus:border-[#FFB65A] cursor-pointer appearance-none text-center pr-3" 
          value={spawnConfig.shape} 
          onChange={(e) => setSpawnConfig({...spawnConfig, shape: e.target.value})}
        >
          <option value="circle">วงกลม</option>
          <option value="rectangle">สี่เหลี่ยม</option>
          <option value="polygon-3">สามเหลี่ยม</option>
        </select>
        <div className="w-[1px] h-6 bg-theme-border" />
        <SharedSlider 
          label="ขนาด:" min="0.1" max="10" step="0.1" 
          value={spawnConfig.size} 
          onChange={(e) => setSpawnConfig({...spawnConfig, size: parseFloat(e.target.value)})} 
        />
        <div className="w-[1px] h-6 bg-theme-border" />
        <div className="flex gap-1">
          {['#FFB65A', '#22C55E', '#3B82F6', '#EF4444', '#A855F7'].map(color => (
            <button 
              key={color} 
              onClick={() => setSpawnConfig({...spawnConfig, color})} 
              className={`w-6 h-6 rounded-full border-2 transition-all ${spawnConfig.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`} 
              style={{ backgroundColor: color }} 
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
