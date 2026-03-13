import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ControlPanel from '../ControlPanel';
import InteractiveGrid from './InteractiveGrid';
import MatterCanvas from './MatterCanvas';
import Timebar, { ArrowUpIcon, ArrowDownIcon } from './Timebar';

// 🌟 Component แยกที่นำกลับมาใช้ซ้ำได้
const HoldableButton = ({ onAction, className, children, title, tabIndex }) => {
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
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
};

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
  const [vectorEditor, setVectorEditor] = useState(null);

  // --- Timebar integration states ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false); 
  const [timeScale, setTimeScale] = useState(1);
  const [displayTime, setDisplayTime] = useState(0);
  const snapshotRef = useRef(null); 

  // --- State สำหรับ ถังขยะ และ Tooltip (Toast) ---
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [spawnToast, setSpawnToast] = useState(null); // เก็บข้อความแจ้งเตือนเสกไม่ได้

  // Use a ref for continuous time updates without causing top-level re-renders
  const timeStateRef = useRef({ time: 0, isPlaying: false, timeScale: 1, targetTime: null });

  // Update ref from state
  useEffect(() => { 
    timeStateRef.current.isPlaying = isPlaying; 
    if (isPlaying) setVectorEditor(null);
  }, [isPlaying]);
  useEffect(() => { timeStateRef.current.timeScale = timeScale; }, [timeScale]);

  // Spacebar = Play / Pause, R = Restart
  // Use refs so listener is registered only once on mount
  const hasStartedOnceRef = useRef(hasStartedOnce);
  useEffect(() => { hasStartedOnceRef.current = hasStartedOnce; }, [hasStartedOnce]);
  const handleRestartRef = useRef(null); // will point to handleRestart after it's defined below

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        const nextState = !timeStateRef.current.isPlaying;
        timeStateRef.current.isPlaying = nextState;
        setIsPlaying(nextState);
        if (!hasStartedOnceRef.current) setHasStartedOnce(true);
      }

      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRestartRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // Only register once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState('cursor');

  const [spawnConfig, setSpawnConfig] = useState({
    shape: 'circle',
    size: 1,
    color: '#FFB65A',
    mass: 10,
    restitution: 0
  });

  const cameraRef = useRef(activeSim?.physicsState?.camera || { zoom: 1, offset: {x:0, y:0} });
  const bodiesRef = useRef(activeSim?.physicsState?.bodies || {});
  const matterCanvasRef = useRef(null);
  const controlPanelRef = useRef(null); // Imperative handle to ControlPanel
  const [restartToken, setRestartToken] = useState(0); // Increment to remount ControlPanel

  // 🌟 3. แก้บัคกระพริบ/ค้างตอนปรับขนาด
  const handleControlUpdate = useCallback((state) => {
    // ใช้ stringify เช็คว่าค่าเปลี่ยนจริงๆ ถึงจะอนุญาตให้อัปเดต State (กันลูปนรก)
    setSimState(prev => {
      if (JSON.stringify(prev) === JSON.stringify(state)) return prev;
      return state;
    });
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
    
    // 🌟 Save snapshot before starting simulation
    if (next && !timeStateRef.current.isPlaying) {
      snapshotRef.current = {
        simState: JSON.parse(JSON.stringify(simState))
      };
    }
    
    timeStateRef.current.isPlaying = next; 
    setIsPlaying(next); 
  };

  const handleRestart = () => {
    timeStateRef.current.time = 0;
    timeStateRef.current.targetTime = null;
    timeStateRef.current.isPlaying = false;
    setIsPlaying(false);
    setDisplayTime(0);

    // 🌟 Roll back properties to the snapshot before "Play"
    if (snapshotRef.current) {
      const restored = snapshotRef.current.simState;
      setSimState(restored);
      if (onSaveControlState) onSaveControlState(restored);
    }

    if (matterCanvasRef.current) matterCanvasRef.current.resetSimulation();
  };
  // Keep ref in sync so the keyboard shortcut always calls the latest version
  handleRestartRef.current = handleRestart;

  // 🌟 2. รองรับการกรอเวลากลับ (Rewind) ผ่านเลขที่พิมพ์
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

  const handleToolClick = (toolId) => {
    if (toolId === 'clearAll') {
      setIsClearModalOpen(true);
    } else {
      setActiveTool(toolId);
      setVectorEditor(null); // Clear vector editor when changing tools
    }
  };

  const handleClearAllConfirm = () => {
    // Route through ControlPanel so it stays the single owner of object state
    if (controlPanelRef.current?.clearAll) {
      controlPanelRef.current.clearAll();
    }
    setIsClearModalOpen(false);
  };

  // ฟังก์ชันโชว์แจ้งเตือน
  const showToast = (message) => {
    setSpawnToast({ message, id: Date.now() });
    setTimeout(() => setSpawnToast(null), 3000); // ปิดเองใน 3 วิ
  };

  // 🌟 4. Grid click handler — with optional grid snapping
  const handleGridClick = useCallback((wx, wy) => {
    if (activeTool === 'add') {

      // Apply grid snapping: round to nearest integer world unit
      const snapped = simState?.gridSnapping;
      const fx = snapped ? Math.round(wx) : wx;
      const fy = snapped ? Math.round(wy) : wy;

      // Physics body radius = obj.size world units. Use 1.1x padding.
      const overlapRadiusBase = 1.1;
      const requiredRadius = spawnConfig.size * overlapRadiusBase;

      // Check if click position overlaps any existing object
      const currentObjects = simState?.objects || [];
      const currentBodies = bodiesRef.current || {};
      for (const obj of currentObjects) {
        const pos = currentBodies[obj.id]?.position || obj.position;
        if (!pos) continue;
        const dx = fx - pos.x;
        const dy = fy - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const objRadius = (obj.size || 1) * overlapRadiusBase;
        if (dist < requiredRadius + objRadius) {
          showToast('ไม่สามารถเสกวัตถุตรงนี้ได้');
          return;
        }
      }

      // Spawn at final position
      const newObj = {
        id: 'obj_' + Date.now(),
        shape: spawnConfig.shape,
        size: spawnConfig.size,
        color: spawnConfig.color,
        isSpawned: true,
        position: { x: fx, y: fy },
        values: { mass: spawnConfig.mass, restitution: spawnConfig.restitution }
      };
      if (controlPanelRef.current?.addObject) {
        controlPanelRef.current.addObject(newObj);
      }

    } else if (activeTool === 'erase') {
      const currentObjects = simState?.objects || [];
      const currentBodies = bodiesRef.current || {};
      
      // 🌟 Check if clicking a VECTOR first
      const vectorHit = matterCanvasRef.current?.findVectorAt(wx, wy);
      if (vectorHit) {
        setSimState(prev => {
          const newState = {
            ...prev,
            objects: prev.objects.map(o => {
              if (o.id === vectorHit.objId) {
                const newValues = { ...o.values };
                if (vectorHit.type === 'velocity') { delete newValues.velocity; delete newValues.angle; }
                if (vectorHit.type === 'force') { delete newValues.force; delete newValues.forceAngle; }
                return { ...o, values: newValues };
              }
              return o;
            })
          };
          if (onSaveControlState) onSaveControlState(newState);
          return newState;
        });
        return;
      }

      let targetId = null;
      let minDistance = Infinity;

      for (const obj of currentObjects) {
         const pos = currentBodies[obj.id]?.position || obj.position;
         if (!pos) continue;
         
         const dx = wx - pos.x;
         const dy = wy - pos.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         
         if (dist < (obj.size || 1) * 2.5 && dist < minDistance) {
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

  const handleGridPointerDown = useCallback((wx, wy, e) => {
    if (activeTool === 'velocity' || activeTool === 'force') {
      let nx = wx, ny = wy;
      if (simState?.gridSnapping) {
         nx = Math.round(wx);
         ny = Math.round(wy);
      }
      return matterCanvasRef.current?.startVectorDrag(nx, ny, activeTool) || false;
    }
    return false;
  }, [activeTool, simState?.gridSnapping]);

  const handleGridPointerMove = useCallback((wx, wy, e) => {
    if (activeTool === 'velocity' || activeTool === 'force') {
      let nx = wx, ny = wy;
      if (simState?.gridSnapping) {
         nx = Math.round(wx);
         ny = Math.round(wy);
      }
      matterCanvasRef.current?.moveVectorDrag(nx, ny);
    }
  }, [activeTool, simState?.gridSnapping]);

  const handleGridPointerUp = useCallback((wx, wy, e) => {
    if (activeTool === 'velocity' || activeTool === 'force') {
      const v = matterCanvasRef.current?.endVectorDrag(wx, wy);
      if (v) {
        const dx = v.currentX - v.startX;
        const dy = v.currentY - v.startY;
        const dragDist = Math.sqrt(dx*dx + dy*dy);
        
        // Find existing object
        const obj = simState?.objects?.find(o => o.id === v.objId);
        if (!obj) return;
        
        let magnitude, angle;
        if (dragDist < 0.2) { // just a click
          magnitude = activeTool === 'velocity' ? (obj.values?.velocity || 0) : (obj.values?.force || 0);
          angle = activeTool === 'velocity' ? (obj.values?.angle || 0) : (obj.values?.forceAngle || 0);
        } else {
          // multiplier 5 matches the matter canvas scale 0.2
          magnitude = Math.round(dragDist * 5 * 10) / 10; 
          angle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));
          if (v.type === 'velocity') {
             controlPanelRef.current?.updateObjectValues(v.objId, { velocity: magnitude, angle: angle });
          } else {
             controlPanelRef.current?.updateObjectValues(v.objId, { force: magnitude, forceAngle: angle });
          }
        }
        
        setVectorEditor({ 
           objId: v.objId, 
           type: activeTool, 
           magnitude, 
           angle, 
           screenX: e.clientX, 
           screenY: e.clientY 
        });
      } else {
        setVectorEditor(null);
      }
    } else if (activeTool === 'cursor') {
      setVectorEditor(null);
    }
  }, [activeTool, simState]);

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

      {/* 🌟 Toast แจ้งเตือนเสกไม่ได้ (จะเด้งตรงกลางจอ) */}
      <AnimatePresence>
        {spawnToast && (
          <motion.div 
            key={spawnToast.id}
            initial={{ opacity: 0, y: -20, x: '-50%' }} 
            animate={{ opacity: 1, y: 0, x: '-50%' }} 
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-24 left-1/2 z-[200] bg-red-500 text-white px-5 py-2.5 rounded-xl shadow-2xl font-bold border-2 border-red-700/30 flex items-center gap-2 text-sm font-['Chakra_Petch']"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {spawnToast.message}
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
              <div className="h-full">
                <ControlPanel
                  ref={controlPanelRef}
                  key={`${activeSim.id}-${restartToken}`}
                  initialState={simState || activeSim.controlState || activeSim.data}
                  simulationType={activeSim.simulationType || activeSim.data?.simulationType || 'default'}
                  isLocked={isPlaying}
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

                {/* กล่องตั้งค่าเสกวัตถุ */}
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
              <InteractiveGrid 
                initialCamera={activeSim.physicsState?.camera} 
                onCameraChange={handleCameraChange} 
                activeTool={activeTool} 
                onGridClick={handleGridClick}
                onGridPointerDown={handleGridPointerDown}
                onGridPointerMove={handleGridPointerMove}
                onGridPointerUp={handleGridPointerUp}
              >
                {({ size, offset, zoom }) => (
                  <>
                    <MatterCanvas 
                      ref={matterCanvasRef}
                      size={size} offset={offset} zoom={zoom} 
                      simState={simState} initialPhysics={activeSim.physicsState} 
                      onPhysicsChange={handlePhysicsChange} activeTool={activeTool} 
                      spawnConfig={spawnConfig}
                      gridSnapping={!!simState?.gridSnapping}
                      showCursorCoords={!!simState?.showCursorCoords}
                      showResultantVector={!!simState?.showResultantVector}
                      timeStateRef={timeStateRef}
                      setIsPlaying={setIsPlaying}
                    />

                    {/* Vector Editor Overlay */}
                    <AnimatePresence>
                      {vectorEditor && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="fixed z-[300] bg-white dark:bg-[#2B2D31] rounded-[10px] shadow-lg border border-theme-border p-2 flex flex-col gap-2"
                          style={{ left: vectorEditor.screenX + 15, top: vectorEditor.screenY + 15 }}
                        >
                          <div className="flex justify-between items-center px-1">
                            <span className="text-xs font-bold text-theme-secondary flex items-center gap-1">
                              {vectorEditor.type === 'velocity' ? 'เวกเตอร์ความเร็ว (v)' : 'เวกเตอร์แรง (F)'}
                              {vectorEditor.type === 'velocity' ? <span className="w-2 h-2 rounded-full bg-blue-500"></span> : <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            <div className="flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-md px-2 py-1 relative pr-8">
                              <span className="text-xs text-theme-secondary shrink-0 font-['Chakra_Petch']" style={{width: 35}}>ขนาด:</span>
                              <input 
                                autoFocus
                                type="number" 
                                className="w-full bg-transparent text-sm font-medium outline-none text-theme-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                value={vectorEditor.magnitude}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setVectorEditor(prev => ({ ...prev, magnitude: val }));
                                  if (vectorEditor.type === 'velocity') {
                                    controlPanelRef.current?.updateObjectValues(vectorEditor.objId, { velocity: val });
                                  } else {
                                    controlPanelRef.current?.updateObjectValues(vectorEditor.objId, { force: val });
                                  }
                                }}
                              />
                              <div className="absolute right-1 top-1 bottom-1 flex flex-col bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden">
                                <HoldableButton 
                                  tabIndex={-1} 
                                  onAction={() => {
                                    setVectorEditor(prev => {
                                      if (!prev) return null;
                                      const val = Number(prev.magnitude) + 1;
                                      if (prev.type === 'velocity') controlPanelRef.current?.updateObjectValues(prev.objId, { velocity: val });
                                      else controlPanelRef.current?.updateObjectValues(prev.objId, { force: val });
                                      return { ...prev, magnitude: val };
                                    });
                                  }} 
                                  className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 text-gray-600 dark:text-gray-300"
                                >
                                  <ArrowUpIcon />
                                </HoldableButton>
                                <HoldableButton 
                                  tabIndex={-1} 
                                  onAction={() => {
                                    setVectorEditor(prev => {
                                      if (!prev) return null;
                                      const val = Math.max(0, Number(prev.magnitude) - 1);
                                      if (prev.type === 'velocity') controlPanelRef.current?.updateObjectValues(prev.objId, { velocity: val });
                                      else controlPanelRef.current?.updateObjectValues(prev.objId, { force: val });
                                      return { ...prev, magnitude: val };
                                    });
                                  }} 
                                  className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 text-gray-600 dark:text-gray-300 border-t border-[#d6cfbe] dark:border-[#1E1F22]"
                                >
                                  <ArrowDownIcon />
                                </HoldableButton>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-[#F3F4F6] dark:bg-[#1E1F22] rounded-md px-2 py-1 relative pr-8">
                              <span className="text-xs text-theme-secondary shrink-0 font-['Chakra_Petch']" style={{width: 35}}>มุม:</span>
                              <input 
                                type="number" 
                                className="w-full bg-transparent text-sm font-medium outline-none text-theme-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                value={vectorEditor.angle}
                                onChange={(e) => {
                                  let val = Number(e.target.value) || 0;
                                  setVectorEditor(prev => ({ ...prev, angle: val }));
                                  if (vectorEditor.type === 'velocity') {
                                    controlPanelRef.current?.updateObjectValues(vectorEditor.objId, { angle: val });
                                  } else {
                                    controlPanelRef.current?.updateObjectValues(vectorEditor.objId, { forceAngle: val });
                                  }
                                }}
                              />
                              <div className="absolute right-1 top-1 bottom-1 flex flex-col bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden">
                                <HoldableButton 
                                  tabIndex={-1} 
                                  onAction={() => {
                                    setVectorEditor(prev => {
                                      if (!prev) return null;
                                      const val = Number(prev.angle) + 1;
                                      if (prev.type === 'velocity') controlPanelRef.current?.updateObjectValues(prev.objId, { angle: val });
                                      else controlPanelRef.current?.updateObjectValues(prev.objId, { forceAngle: val });
                                      return { ...prev, angle: val };
                                    });
                                  }} 
                                  className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 text-gray-600 dark:text-gray-300"
                                >
                                  <ArrowUpIcon />
                                </HoldableButton>
                                <HoldableButton 
                                  tabIndex={-1} 
                                  onAction={() => {
                                    setVectorEditor(prev => {
                                      if (!prev) return null;
                                      const val = Number(prev.angle) - 1;
                                      if (prev.type === 'velocity') controlPanelRef.current?.updateObjectValues(prev.objId, { angle: val });
                                      else controlPanelRef.current?.updateObjectValues(prev.objId, { forceAngle: val });
                                      return { ...prev, angle: val };
                                    });
                                  }} 
                                  className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 text-gray-600 dark:text-gray-300 border-t border-[#d6cfbe] dark:border-[#1E1F22]"
                                >
                                  <ArrowDownIcon />
                                </HoldableButton>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => setVectorEditor(null)}
                            className="bg-theme-primary text-white text-xs font-bold py-1.5 rounded-md hover:opacity-90 transition-opacity w-full mt-1"
                          >
                            ตกลง
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
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