import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ControlPanel from '../ControlPanel'; 

import InteractiveGrid from './InteractiveGrid';
import MatterCanvas from './MatterCanvas';
import Timebar from './Timebar';

// 🌟 Component แยกที่นำกลับมาใช้ซ้ำได้
const SharedSlider = ({ label, value, min, max, step, onChange }) => (
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
);

export default function SimulationWorkspace({ activeSim, isInteracting, onSaveControlState, onSavePhysicsState }) {
  const shouldHideLogo = isInteracting || activeSim !== null;
  const [simState, setSimState] = useState(null);

  // --- Timebar integration states ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false); 
  const [timeScale, setTimeScale] = useState(1);
  const [displayTime, setDisplayTime] = useState(0);

  // --- State สำหรับ ถังขยะ (Clear All) ---
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Use a ref for continuous time updates without causing top-level re-renders
  const timeStateRef = useRef({ time: 0, isPlaying: false, timeScale: 1, targetTime: null });

  // Update ref from state
  useEffect(() => { timeStateRef.current.isPlaying = isPlaying; }, [isPlaying]);
  useEffect(() => { timeStateRef.current.timeScale = timeScale; }, [timeScale]);

  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState('cursor');

  const [spawnConfig, setSpawnConfig] = useState({
    shape: 'circle',
    size: 1,
    color: '#FFB65A',
    mass: 10,
    restitution: 0.6
  });

  const cameraRef = useRef(activeSim?.physicsState?.camera || { zoom: 1, offset: {x:0, y:0} });
  const bodiesRef = useRef(activeSim?.physicsState?.bodies || {});
  const matterCanvasRef = useRef(null); 

  const handleControlUpdate = useCallback((state) => {
    setSimState(state);
    if (onSaveControlState) onSaveControlState(state);
  }, [onSaveControlState]);

  // Handle local UI rendering for the time counter (optimizing re-renders)
  useEffect(() => {
    let animationFrameId;
    const updateTimeDisplay = () => {
      setDisplayTime(timeStateRef.current.time);
      animationFrameId = requestAnimationFrame(updateTimeDisplay);
    };
    animationFrameId = requestAnimationFrame(updateTimeDisplay);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleTogglePlay = () => {
    if (!hasStartedOnce) setHasStartedOnce(true);
    const next = !timeStateRef.current.isPlaying;
    timeStateRef.current.isPlaying = next; // Immediate ref update for animation loop
    setIsPlaying(next); // React state for UI
  };

  const handleRestart = () => {
    timeStateRef.current.time = 0;
    timeStateRef.current.targetTime = null;
    timeStateRef.current.isPlaying = false;
    setIsPlaying(false);
    setDisplayTime(0);
    if (matterCanvasRef.current) matterCanvasRef.current.resetSimulation();
  };

  const handleSeek = (val) => {
    timeStateRef.current.isPlaying = false;
    setIsPlaying(false);
    
    timeStateRef.current.time = val;
    setDisplayTime(val);

    if (matterCanvasRef.current) {
      matterCanvasRef.current.resetSimulation({ targetTime: val, instant: true });
    }
  };

  const handleCameraChange = useCallback((camera) => {
    cameraRef.current = camera;
    if (onSavePhysicsState) onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current });
  }, [onSavePhysicsState]);

  const handlePhysicsChange = useCallback((bodies, isMoving) => {
    bodiesRef.current = bodies;
    if (onSavePhysicsState) {
       onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current }, false, isMoving);
    }
  }, [onSavePhysicsState]);

  // ฟังก์ชันดักจับการกด Toolbar (ถ้าเป็นถังขยะให้เปิด Modal แทนการสลับ Tool)
  const handleToolClick = (toolId) => {
    if (toolId === 'clearAll') {
      setIsClearModalOpen(true);
    } else {
      setActiveTool(toolId);
    }
  };

  // ฟังก์ชันยืนยันการลบ
  const handleClearAllConfirm = () => {
    setSimState(prev => {
      const currentState = prev || { gravity: 9.8, airResistance: false, objects: [] };
      const newState = {
         ...currentState,
         objects: [] 
      };
      if (onSaveControlState) onSaveControlState(newState);
      return newState;
    });
    setIsClearModalOpen(false);
  };

  const handleGridClick = useCallback((wx, wy) => {
    if (activeTool === 'add') {
      const newObj = {
        id: 'obj_' + Date.now(),
        shape: spawnConfig.shape,
        size: spawnConfig.size,
        color: spawnConfig.color,
        isSpawned: true,
        position: { x: wx, y: wy }, 
        values: { mass: spawnConfig.mass, restitution: spawnConfig.restitution }
      };

      setSimState(prev => {
        const currentState = prev || { gravity: 9.8, airResistance: false, objects: [] };
        const newState = {
           ...currentState,
           objects: [...(currentState.objects || []), newObj]
        };
        if (onSaveControlState) onSaveControlState(newState);
        return newState;
      });

    } else if (activeTool === 'erase') {
      const currentObjects = simState?.objects || [];
      const currentBodies = bodiesRef.current || {};
      
      let targetId = null;
      let minDistance = Infinity;

      for (const obj of currentObjects) {
         const pos = currentBodies[obj.id]?.position || obj.position;
         if (!pos) continue;
         
         const dx = wx - pos.x;
         const dy = wy - pos.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         
         if (dist < (obj.size || 1) && dist < minDistance) {
            minDistance = dist;
            targetId = obj.id;
         }
      }

      if (targetId) {
         setSimState(prev => {
            const newState = {
               ...prev,
               objects: prev.objects.filter(o => o.id !== targetId)
            };
            if (onSaveControlState) onSaveControlState(newState);
            return newState;
         });
      }
    }
  }, [activeTool, spawnConfig, simState, onSaveControlState]);

  const tools = [
    { id: 'cursor', title: 'เลือก / เลื่อนจอ (V)', icon: <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/> },
    { id: 'ruler', title: 'ไม้บรรทัด (R)', icon: <><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></> },
    { id: 'add', title: 'เพิ่มวัตถุ (A)', icon: <><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></> },
    { id: 'erase', title: 'ลบวัตถุ (E)', icon: <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></> },
    { id: 'velocity', title: 'เวกเตอร์ความเร็ว', color: 'text-blue-500', icon: <><path d="M7 7h10v10"/><path d="M7 17 17 7"/></> },
    { id: 'force', title: 'เวกเตอร์แรง', color: 'text-red-500', icon: <><path d="M7 7h10v10"/><path d="M7 17 17 7"/></> },
    { type: 'divider' }, // ตัวคั่น
    { id: 'clearAll', title: 'ลบวัตถุทั้งหมด', color: 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30', icon: <><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></> }
  ];

return (
    <div className="flex-1 flex flex-col h-full w-full relative">
      <AnimatePresence>
        {!shouldHideLogo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <h1 className="text-[80px] font-bold tracking-wide drop-shadow-sm">
              <span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span>
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {activeSim && activeSim.data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col h-full w-full overflow-hidden">
          <div className="px-8 pt-6 pb-4 min-w-0">
            <h2 className="text-[22px] font-bold text-[#343135] dark:text-[#D3DAD9] bg-[#D9CFC7] dark:bg-[#2B2D31] inline-block px-4 py-2 rounded-lg truncate max-w-[60%] shadow-sm border border-transparent dark:border-[#1E1F22]" title={`หัวข้อแบบจำลอง: ${activeSim.title}`}>
              หัวข้อแบบจำลอง: {activeSim.title}
            </h2>
          </div>

          <div className="flex-1 flex min-h-0 px-6 pb-6 gap-4">
            <div className="h-full rounded-2xl overflow-hidden border border-theme-border shadow-sm bg-theme-panel z-20 w-[280px] shrink-0 relative">
              {/* Properties locked overlay before first Play */}
              {!hasStartedOnce && (
                 <div className="absolute inset-0 z-50 bg-black/5 dark:bg-white/5 backdrop-blur-[1px] flex items-center justify-center p-4 text-center select-none pointer-events-none transition-all duration-300">
                    <div className="bg-white/90 dark:bg-black/90 px-4 py-2 rounded-xl shadow-lg border border-theme-border flex flex-col items-center">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-500 mb-1"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                       <span className="text-sm font-bold text-red-500">กด Play ก่อนเริ่มแก้ไข</span>
                    </div>
                 </div>
              )}
              <div className={`h-full ${!hasStartedOnce ? 'opacity-50 pointer-events-none' : ''}`}>
                <ControlPanel 
                  key={`${activeSim.id}-${simState?.objects?.length || 0}`} 
                  initialState={simState || activeSim.controlState || activeSim.data} 
                  simulationType={activeSim.simulationType || activeSim.data?.simulationType || 'default'} 
                  onUpdate={handleControlUpdate} 
                />
              </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-theme-border bg-white dark:bg-[#2B2D31] relative shadow-sm">
              
              {/* แถบเครื่องมือ */}
              <div className="absolute top-4 left-4 z-50 flex gap-2 items-start pointer-events-none">
                
                {/* กล่อง Toolbar */}
                <div 
                  className={`pointer-events-auto flex flex-col items-center bg-[#E5DDD4] dark:bg-[#313338] border border-theme-border rounded-[14px] shadow-md transition-all duration-300 ease-in-out overflow-hidden py-1`}
                  style={{ width: '40px', maxHeight: isToolbarOpen ? '500px' : '40px' }} 
                >
                  <div className={`flex flex-col items-center gap-1 w-full transition-all duration-300 overflow-hidden ${isToolbarOpen ? 'opacity-100 h-auto pb-2' : 'opacity-0 h-0 m-0 pb-0'}`}>
                     {tools.map((tool, idx) => {
                       if (tool.type === 'divider') {
                         return <div key={`div-${idx}`} className="w-6 h-[1px] bg-theme-border my-1 flex-shrink-0"></div>;
                       }
                       return (
                         <button
                           key={tool.id} 
                           onClick={() => handleToolClick(tool.id)} 
                           title={tool.title}
                           className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${activeTool === tool.id ? 'bg-white dark:bg-[#1E1F22] shadow-sm text-theme-primary' : 'text-theme-secondary hover:bg-[#D9CFC7] dark:hover:bg-[#3F4147] hover:text-theme-primary'} ${tool.color || ''}`}
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{tool.icon}</svg>
                         </button>
                       );
                     })}
                     <div className="w-6 h-[1px] bg-theme-border my-1 flex-shrink-0"></div>
                  </div>
                  <button onClick={() => setIsToolbarOpen(!isToolbarOpen)} className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-[#D9CFC7] dark:hover:bg-[#3F4147] transition-colors flex-shrink-0 cursor-pointer" title={isToolbarOpen ? "พับเครื่องมือ" : "ขยายเครื่องมือ"}>
                    {isToolbarOpen ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
                  </button>
                </div>

                {/* 🌟 กล่องตั้งค่าเสกวัตถุ */}
                <AnimatePresence>
                  {activeTool === 'add' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
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

                      <div className="w-[1px] h-6 bg-theme-border"></div>

                      <SharedSlider 
                        label="ขนาด:" 
                        min="0.5" max="4" step="0.1" 
                        value={spawnConfig.size} 
                        onChange={(e) => setSpawnConfig({...spawnConfig, size: parseFloat(e.target.value)})} 
                      />

                      <div className="w-[1px] h-6 bg-theme-border"></div>

                      <div className="flex gap-1">
                        {['#FFB65A', '#22C55E', '#3B82F6', '#EF4444', '#A855F7'].map(color => (
                          <button
                            key={color} onClick={() => setSpawnConfig({...spawnConfig, color})}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${spawnConfig.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Timebar — same level as toolbar */}
              <div className="absolute top-4 right-4 z-50 pointer-events-auto">
                <Timebar 
                  isPlaying={isPlaying}
                  timeScale={timeScale}
                  displayTime={displayTime}
                  onTogglePlay={handleTogglePlay}
                  onRestart={handleRestart}
                  onTimeScaleChange={setTimeScale}
                  onSeek={handleSeek}
                />
              </div>

              <InteractiveGrid initialCamera={activeSim.physicsState?.camera} onCameraChange={handleCameraChange} activeTool={activeTool} onGridClick={handleGridClick}>
                {({ size, offset, zoom }) => (
                  <MatterCanvas 
                    ref={matterCanvasRef}
                    size={size} offset={offset} zoom={zoom} 
                    simState={simState} initialPhysics={activeSim.physicsState} 
                    onPhysicsChange={handlePhysicsChange} activeTool={activeTool} 
                    spawnConfig={spawnConfig}
                    timeStateRef={timeStateRef}
                    setIsPlaying={setIsPlaying}
                  />
                )}
              </InteractiveGrid>

            </div>
          </div>
        </motion.div>
      )}

      {/* 🌟 Modal ยืนยันการลบทั้งหมด */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#313338] rounded-2xl shadow-2xl p-6 w-[320px] border border-theme-border font-['Chakra_Petch']"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </div>
                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">ยืนยันการเคลียร์พื้นที่?</h3>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">
                  วัตถุทั้งหมดในแบบจำลองจะถูกลบทิ้ง<br/>และไม่สามารถกู้คืนได้
                </p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setIsClearModalOpen(false)} 
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#3F4147] dark:hover:bg-[#4d5057] text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleClearAllConfirm} 
                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    ลบทิ้ง
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}