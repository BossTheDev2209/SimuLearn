import React, { useState, useRef, useCallback, useEffect, memo, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ControlPanel from '../ControlPanel/ControlPanel';
import InteractiveGrid from './InteractiveGrid/index';
import MatterCanvas from './MatterCanvas/index';
import Timebar, { ArrowUpIcon, ArrowDownIcon, RestartIcon, ChevronLeftIcon, ChevronRightIcon } from './Timebar';

// 🌟 Import Hooks
import { useSimulationHistory } from './hooks/useSimulationHistory';
import { useTimeManagement } from './hooks/useTimeManagement';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';

const TrackingArrows = ({ objects, bodies, offset, zoom, size, onTeleport }) => {
  if (!objects || !bodies) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-[400]">
      {objects.map(obj => {
        const body = bodies[obj.id];
        if (!body) return null;

        const screenX = (body.position.x * 100 * zoom) + (size.w / 2 + offset.x);
        const screenY = (size.h / 2 + offset.y) - (body.position.y * 100 * zoom);
        
        const margin = 40;
        const isOffScreen = screenX < margin || screenX > size.w - margin || screenY < margin || screenY > size.h - margin;
        
        if (!isOffScreen) return null;

        const edgeX = Math.max(margin, Math.min(size.w - margin, screenX));
        const edgeY = Math.max(margin, Math.min(size.h - margin, screenY));
        
        const dx = body.position.x - ((-offset.x) / (100 * zoom));
        const dy = body.position.y - (offset.y / (100 * zoom));
        const dist = Math.sqrt(dx*dx + dy*dy).toFixed(1);
        const opacity = Math.max(0.35, 1 - (dist / 1000));

        return (
          <div key={obj.id} className="absolute flex items-center gap-2 pointer-events-auto" style={{ left: edgeX, top: edgeY, opacity, transform: 'translate(-50%, -50%)' }}>
            <div 
              className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[10px]" 
              style={{ borderRightColor: obj.color, transform: `rotate(${Math.atan2(screenY - edgeY, screenX - edgeX)}rad)` }} 
            />
            <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-2 backdrop-blur-md border border-white/10 shadow-xl">
              <span className="font-bold">{dist}m</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onTeleport(body.position.x, body.position.y); }}
                className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                title="Teleport to Object"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 🌟 ห่อด้วย memo
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
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      className={className}
      title={title}
    >
      {children}
    </button>
  );
});

// 🌟 ห่อด้วย memo
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

const SimulationWorkspace = forwardRef(({ activeSim, isInteracting, onSaveControlState, onSavePhysicsState }, ref) => {
  const shouldHideLogo = isInteracting || activeSim !== null;
  const [simState, setSimState] = useState(null);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

  // 🌟 Extract state and handlers using useWorkspaceState hook
  const {
    activeTool,
    vectorEditor, setVectorEditor,
    isToolbarOpen, setIsToolbarOpen,
    isClearModalOpen, setIsClearModalOpen,
    spawnToast,
    spawnConfig, setSpawnConfig,
    showToast,
    handleToolClick
  } = useWorkspaceState();

  const cameraRef = useRef(activeSim?.physicsState?.camera || { zoom: 1, offset: {x:0, y:0} });
  const bodiesRef = useRef(activeSim?.physicsState?.bodies || {});
  const matterCanvasRef = useRef(null);
  const controlPanelRef = useRef(null);
  const [restartToken, setRestartToken] = useState(0);

  // 🌟 ใช้ Custom Hooks
  const { pushToHistory, undoRef, redoRef } = useSimulationHistory(simState, setSimState, onSaveControlState);
  
  const { 
    isPlaying, setIsPlaying, hasStartedOnce, timeScale, setTimeScale, 
    displayTime, maxTime, timeStateRef, handleTogglePlay: _originalHandleTogglePlay, handleRestart, handleSeek 
  } = useTimeManagement(simState, setSimState, onSaveControlState, matterCanvasRef, controlPanelRef);

  const handleTogglePlay = useCallback(() => {
    if (displayTime >= maxTime && !isPlaying) return;
    _originalHandleTogglePlay();
  }, [displayTime, maxTime, isPlaying, _originalHandleTogglePlay]);

  // 🌟 Forward imperative handle to expose control methods
  useImperativeHandle(ref, () => ({
    handleRestart,
    handleTogglePlay,
    handleSeek,
    pushToHistory
  }));

  // เคลียร์ Vector Editor เมื่อกำลังเล่น
  useEffect(() => { 
    if (isPlaying) setVectorEditor(null);
  }, [isPlaying, setVectorEditor]);
  
  // Sync simState back to App
  useEffect(() => {
    if (simState && onSaveControlState) {
      onSaveControlState(simState);
    }
  }, [simState, onSaveControlState]);

  const updateVectorValue = useCallback((objId, type, index, changes) => {
    const obj = simState?.objects?.find(o => o.id === objId);
    if (!obj) return;
    
    const values = { ...obj.values };
    const key = type === 'velocity' ? 'velocities' : 'forces';
    const arr = [...(values[key] || [])];
    if (index !== null && arr[index]) {
      arr[index] = { ...arr[index], ...changes };
    } else if (index === null) {
      // Legacy updates
      if (type === 'velocity') {
          if (changes.magnitude !== undefined) values.velocity = changes.magnitude;
          if (changes.angle !== undefined) values.angle = changes.angle;
      } else {
          if (changes.magnitude !== undefined) values.force = changes.magnitude;
          if (changes.angle !== undefined) values.forceAngle = changes.angle;
      }
    }
    values[key] = arr;

    if (controlPanelRef.current?.updateObjectValues) {
      controlPanelRef.current.updateObjectValues(objId, values);
    }
  }, [simState]);

  const handleRestartRef = useRef(handleRestart);
  useEffect(() => { handleRestartRef.current = handleRestart; }, [handleRestart]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (displayTime < maxTime) handleTogglePlay();
      }

      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRestartRef.current?.();
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        let restored = null;
        if (e.shiftKey) restored = redoRef.current?.();
        else restored = undoRef.current?.();
        
        if (restored && controlPanelRef.current?.resetState) {
          controlPanelRef.current.resetState(restored);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        const restored = redoRef.current?.();
        if (restored && controlPanelRef.current?.resetState) {
          controlPanelRef.current.resetState(restored);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, undoRef, redoRef]);

  const handleControlUpdate = useCallback((state) => {
    setSimState(prev => {
      if (JSON.stringify(prev) === JSON.stringify(state)) return prev;
      return state;
    });
  }, []);

  const handleCameraChange = useCallback((camera) => {
    cameraRef.current = camera;
    if (onSavePhysicsState) onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current });
  }, [onSavePhysicsState]);

  const handleTeleport = useCallback((wx, wy) => {
    const newOffset = {
      x: -(wx * 100 * cameraRef.current.zoom),
      y: (wy * 100 * cameraRef.current.zoom)
    };
    handleCameraChange({ ...cameraRef.current, offset: newOffset });
  }, [handleCameraChange]);

  const handlePhysicsChange = useCallback((bodies, isMoving) => {
    bodiesRef.current = bodies;
    if (onSavePhysicsState) {
       onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current }, false, isMoving);
    }
  }, [onSavePhysicsState]);

  const handleClearAllConfirm = () => {
    pushToHistory(simState);
    if (controlPanelRef.current?.clearAll) {
      controlPanelRef.current.clearAll();
    }
    setIsClearModalOpen(false);
  };

  const handleGridClick = useCallback((wx, wy, unitStep = 1) => {
    if (activeTool === 'add') {
      const snapped = simState?.gridSnapping;
      const fx = snapped ? Math.round(wx / unitStep) * unitStep : wx;
      const fy = snapped ? Math.round(wy / unitStep) * unitStep : wy;

      const overlapRadiusBase = 1.1;
      const requiredRadius = spawnConfig.size * overlapRadiusBase;

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

      pushToHistory(simState);
      const newObj = {
        id: 'obj_' + Date.now(),
        shape: spawnConfig.shape,
        size: spawnConfig.size,
        color: spawnConfig.color,
        isSpawned: true,
        position: { x: fx, y: fy },
        values: { 
          mass: spawnConfig.mass, 
          restitution: spawnConfig.restitution,
          height: fy
        }
      };
      if (controlPanelRef.current?.addObject) {
        controlPanelRef.current.addObject(newObj);
      }

    } else if (activeTool === 'erase') {
      const vectorHit = matterCanvasRef.current?.findVectorAt(wx, wy);
      if (vectorHit) {
        pushToHistory(simState);
        if (controlPanelRef.current?.updateObjectValues) {
          const obj = simState.objects.find(o => o.id === vectorHit.objId);
          if (obj) {
            const values = { ...obj.values };
            if (vectorHit.isLegacy) {
              if (vectorHit.type === 'velocity') { delete values.velocity; delete values.angle; }
              else { delete values.force; delete values.forceAngle; }
            } else {
              const key = vectorHit.type === 'velocity' ? 'velocities' : 'forces';
              const arr = [...(values[key] || [])];
              arr.splice(vectorHit.index, 1);
              values[key] = arr;
            }
            controlPanelRef.current.updateObjectValues(vectorHit.objId, values);
          }
        }
        return;
      }

      const currentObjects = simState?.objects || [];
      const currentBodies = bodiesRef.current || {};
      let targetId = null;
      let minDistance = Infinity;

      for (const obj of currentObjects) {
         const pos = currentBodies[obj.id]?.position || obj.position;
         if (!pos) continue;
         const dx = wx - pos.x, dy = wy - pos.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         if (dist < (obj.size || 1) * 2.5 && dist < minDistance) {
            minDistance = dist;
            targetId = obj.id;
         }
      }

      if (targetId) {
         pushToHistory(simState);
         if (controlPanelRef.current?.removeObject) {
           controlPanelRef.current.removeObject(targetId);
         }
      }
    }
  }, [activeTool, spawnConfig, simState, pushToHistory, showToast]);

  const handleGridPointerDown = useCallback((wx, wy, e, unitStep = 1) => {
    if (activeTool === 'velocity' || activeTool === 'force') {
      let nx = wx, ny = wy;
      const snapHit = matterCanvasRef.current?.findSnapPoint(wx, wy);
      if (snapHit) {
        nx = snapHit.x; ny = snapHit.y;
      } else if (simState?.gridSnapping) {
         nx = Math.round(wx / unitStep) * unitStep;
         ny = Math.round(wy / unitStep) * unitStep;
      }
      const hit = matterCanvasRef.current?.startVectorDrag(nx, ny, activeTool, wx, wy);
      return hit || false;
    }
    return false;
  }, [activeTool, simState?.gridSnapping]);

  const handleGridPointerMove = useCallback((wx, wy, e, unitStep = 1) => {
    if (activeTool === 'velocity' || activeTool === 'force') {
      let nx = wx, ny = wy;
      const snapHit = matterCanvasRef.current?.findSnapPoint(wx, wy);
      if (snapHit) {
        nx = snapHit.x; ny = snapHit.y;
      } else if (simState?.gridSnapping) {
         nx = Math.round(wx / unitStep) * unitStep;
         ny = Math.round(wy / unitStep) * unitStep;
      }
      matterCanvasRef.current?.moveVectorDrag(nx, ny);
    }
  }, [activeTool, simState?.gridSnapping]);

  const handleGridPointerUp = useCallback((wx, wy, e, unitStep = 1) => {
    if (activeTool === 'velocity' || activeTool === 'force') {
      let nx = wx, ny = wy;
      const snapHit = matterCanvasRef.current?.findSnapPoint(wx, wy);
      if (snapHit) {
        nx = snapHit.x; ny = snapHit.y;
      } else if (simState?.gridSnapping) {
         nx = Math.round(wx / unitStep) * unitStep;
         ny = Math.round(wy / unitStep) * unitStep;
      }
      const v = matterCanvasRef.current?.endVectorDrag(nx, ny);
      if (v) {
        const dx = v.currentX - v.startX, dy = v.currentY - v.startY;
        const dragDist = Math.sqrt(dx*dx + dy*dy);
        const obj = simState?.objects?.find(o => o.id === v.objId);
        if (!obj) return;
        let magnitude = Math.round(dragDist * 5 * 10) / 10; 
        let angle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));

        if (dragDist > 0.1) {
          pushToHistory(simState);
          let vIdx = 0;
          if (controlPanelRef.current?.updateObjectValues) {
            const values = { ...obj.values };
            const key = v.type === 'velocity' ? 'velocities' : 'forces';
            const arr = [...(values[key] || [])];
            vIdx = arr.length;
            const newValues = { ...values, [key]: [...arr, { magnitude, angle }] };
            controlPanelRef.current.updateObjectValues(v.objId, newValues);
          }
          setVectorEditor({ 
              objId: v.objId, type: v.type, index: vIdx,
              magnitude, angle, screenX: e.clientX, screenY: e.clientY 
          });
        }
      } else {
        setVectorEditor(null);
      }
    } else if (activeTool === 'cursor') {
      setVectorEditor(null);
    }
  }, [activeTool, simState, pushToHistory, setVectorEditor]);

  const tools = [
    { id: 'cursor', title: 'เลือก / เลื่อนจอ (V)', icon: <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/> },
    { id: 'ruler', title: 'ไม้บรรทัด (R)', icon: <><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></> },
    { id: 'add', title: 'เพิ่มวัตถุ (A)', icon: <><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></> },
    { id: 'erase', title: 'ลบวัตถุ (E)', icon: <><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></> },
    { id: 'velocity', title: 'เวกเตอร์ความเร็ว', color: 'text-blue-500', icon: <><path d="M7 7h10v10"/><path d="M7 17 17 7"/></> },
    { id: 'force', title: 'เวกเตอร์แรง', color: 'text-red-500', icon: <><path d="M7 7h10v10"/><path d="M7 17 17 7"/></> },
    { type: 'divider' },
    { id: 'clearAll', title: 'ลบวัตถุทั้งหมด', color: 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30', icon: <><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></> }
  ];

  return (
    <div className="flex-1 flex flex-col h-full w-full relative">
      <AnimatePresence>
        {!shouldHideLogo && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-[80px] font-bold tracking-wide drop-shadow-sm"><span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span></h1>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {spawnToast && (
          <motion.div key={spawnToast.id} initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="absolute top-24 left-1/2 z-[200] bg-red-500 text-white px-5 py-2.5 rounded-xl shadow-2xl font-bold border-2 border-red-700/30 flex items-center gap-2 text-sm font-['Chakra_Petch']">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{spawnToast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {activeSim && activeSim.data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col h-full w-full overflow-hidden">
          <div className="px-8 pt-6 pb-4 min-w-0">
            <h2 className="text-[22px] font-bold text-[#343135] dark:text-[#D3DAD9] bg-[#D9CFC7] dark:bg-[#2B2D31] inline-block px-4 py-2 rounded-lg truncate max-w-[60%] shadow-sm border border-transparent dark:border-[#1E1F22]" title={`หัวข้อแบบจำลอง: ${activeSim.title}`}>หัวข้อแบบจำลอง: {activeSim.title}</h2>
          </div>

          <div className="flex-1 flex min-h-0 px-6 pb-6 gap-4">
            <div className="h-full rounded-2xl overflow-hidden border border-theme-border shadow-sm bg-theme-panel z-20 w-[280px] shrink-0 relative">
              <ControlPanel ref={controlPanelRef} key={`${activeSim.id}-${restartToken}`} initialState={simState || activeSim.controlState || activeSim.data} simulationType={activeSim.simulationType || activeSim.data?.simulationType || 'default'} isLocked={isPlaying} onUpdate={handleControlUpdate} />
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-theme-border bg-white dark:bg-[#2B2D31] relative shadow-sm">
              <div className="absolute top-4 left-4 z-50 flex gap-2 items-start pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-center bg-[#E5DDD4] dark:bg-[#313338] border border-theme-border rounded-[14px] shadow-md transition-all duration-300 ease-in-out overflow-hidden py-1" style={{ width: '40px', maxHeight: isToolbarOpen ? '500px' : '40px' }}>
                  <div className={`flex flex-col items-center gap-1 w-full transition-all duration-300 overflow-hidden ${isToolbarOpen ? 'opacity-100 h-auto pb-2' : 'opacity-0 h-0 m-0 pb-0'}`}>
                     {tools.map((tool, idx) => tool.type === 'divider' ? <div key={`div-${idx}`} className="w-6 h-[1px] bg-theme-border my-1 flex-shrink-0" /> : <button key={tool.id} onClick={() => handleToolClick(tool.id)} title={tool.title} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all flex-shrink-0 ${activeTool === tool.id ? 'bg-white dark:bg-[#1E1F22] shadow-sm text-theme-primary' : 'text-theme-secondary hover:bg-[#D9CFC7] dark:hover:bg-[#3F4147] hover:text-theme-primary'} ${tool.color || ''}`}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{tool.icon}</svg></button>)}
                  </div>
                  <button onClick={() => setIsToolbarOpen(!isToolbarOpen)} className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-secondary hover:text-theme-primary hover:bg-[#D9CFC7] dark:hover:bg-[#3F4147] transition-colors flex-shrink-0 cursor-pointer">{isToolbarOpen ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}</button>
                </div>
                {activeTool === 'add' && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white dark:bg-[#313338] border border-theme-border rounded-[14px] shadow-lg p-2 flex items-center gap-3 pointer-events-auto">
                    <select className="bg-[#F2F3F5] dark:bg-[#1E1F22] text-sm text-theme-primary border border-theme-border rounded-lg px-2 py-1.5 outline-none focus:border-[#FFB65A] cursor-pointer appearance-none text-center pr-3" value={spawnConfig.shape} onChange={(e) => setSpawnConfig({...spawnConfig, shape: e.target.value})}><option value="circle">วงกลม</option><option value="rectangle">สี่เหลี่ยม</option><option value="polygon-3">สามเหลี่ยม</option></select>
                    <div className="w-[1px] h-6 bg-theme-border" /><SharedSlider label="ขนาด:" min="0.5" max="4" step="0.1" value={spawnConfig.size} onChange={(e) => setSpawnConfig({...spawnConfig, size: parseFloat(e.target.value)})} /><div className="w-[1px] h-6 bg-theme-border" /><div className="flex gap-1">{['#FFB65A', '#22C55E', '#3B82F6', '#EF4444', '#A855F7'].map(color => <button key={color} onClick={() => setSpawnConfig({...spawnConfig, color})} className={`w-6 h-6 rounded-full border-2 transition-all ${spawnConfig.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div>
                  </motion.div>
                )}
              </div>

              <InteractiveGrid initialCamera={activeSim.physicsState?.camera} onCameraChange={handleCameraChange} activeTool={activeTool} onGridClick={handleGridClick} onGridPointerDown={handleGridPointerDown} onGridPointerMove={handleGridPointerMove} onGridPointerUp={handleGridPointerUp}>
                {({ size, offset, zoom, unitStep }) => (
                  <>
                    <MatterCanvas 
                      ref={matterCanvasRef} size={size} offset={offset} zoom={zoom} unitStep={unitStep} simState={simState} initialPhysics={activeSim.physicsState} onPhysicsChange={handlePhysicsChange} activeTool={activeTool} spawnConfig={spawnConfig}
                      gridSnapping={!!simState?.gridSnapping} showCursorCoords={!!simState?.showCursorCoords} showResultantVector={!!simState?.showResultantVector} timeStateRef={timeStateRef} setIsPlaying={setIsPlaying} maxTime={maxTime}
                    />

                    {/* ✅ FIXED: TrackingArrows moved inside the render prop so it has access to size, offset, zoom */}
                    <TrackingArrows 
                      objects={simState?.objects || []}
                      bodies={bodiesRef.current}
                      offset={offset}
                      zoom={zoom}
                      size={size}
                      onTeleport={handleTeleport}
                    />

                    <AnimatePresence>
                      {vectorEditor && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          exit={{ opacity: 0, scale: 0.8 }} 
                          className="fixed z-[300] bg-white dark:bg-[#2B2D31] rounded-[10px] shadow-lg border border-theme-border p-2 flex flex-col gap-2" 
                          style={{ left: vectorEditor.screenX + 15, top: vectorEditor.screenY + 15 }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs font-bold text-theme-secondary flex items-center gap-1">{vectorEditor.type === 'velocity' ? 'เวกเตอร์ความเร็ว (v)' : 'เวกเตอร์แรง (F)'}{vectorEditor.type === 'velocity' ? <span className="w-2 h-2 rounded-full bg-blue-500" /> : <span className="w-2 h-2 rounded-full bg-red-500" />}</span>
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
                              <div className="absolute right-1 top-1 bottom-1 flex flex-col bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden"><HoldableButton onAction={() => { setVectorEditor(prev => { if (!prev) return null; const val = Number(prev.magnitude) + 1; updateVectorValue(prev.objId, prev.type, prev.index, { magnitude: val }); return { ...prev, magnitude: val }; }); }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5"><ArrowUpIcon /></HoldableButton><HoldableButton onAction={() => { setVectorEditor(prev => { if (!prev) return null; const val = Math.max(0, Number(prev.magnitude) - 1); updateVectorValue(prev.objId, prev.type, prev.index, { magnitude: val }); return { ...prev, magnitude: val }; }); }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 border-t border-[#d6cfbe]"><ArrowDownIcon /></HoldableButton></div>
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
                              <div className="absolute right-1 top-1 bottom-1 flex flex-col bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden"><HoldableButton onAction={() => { setVectorEditor(prev => { if (!prev) return null; const val = Number(prev.angle) + 1; updateVectorValue(prev.objId, prev.type, prev.index, { angle: val }); return { ...prev, angle: val }; }); }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5"><ArrowUpIcon /></HoldableButton><HoldableButton onAction={() => { setVectorEditor(prev => { if (!prev) return null; const val = Number(prev.angle) - 1; updateVectorValue(prev.objId, prev.type, prev.index, { angle: val }); return { ...prev, angle: val }; }); }} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 border-t border-[#d6cfbe]"><ArrowDownIcon /></HoldableButton></div>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setVectorEditor(null); }} className="bg-theme-primary text-white text-xs font-bold py-1.5 rounded-md mt-1">ตกลง</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </InteractiveGrid>
              <div className="absolute top-4 right-4 z-40 pointer-events-auto"><Timebar isPlaying={isPlaying} timeScale={timeScale} displayTime={displayTime} onTogglePlay={handleTogglePlay} onRestart={handleRestart} onTimeScaleChange={setTimeScale} onSeek={handleSeek} /></div>
              <div className="absolute bottom-4 right-4 z-40 flex justify-end pointer-events-none">
                <motion.div animate={{ width: isTimelineCollapsed ? 48 : 400, height: isTimelineCollapsed ? 48 : 60, borderRadius: isTimelineCollapsed ? 24 : 20 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="bg-white/90 dark:bg-[#313338]/90 backdrop-blur-md shadow-2xl border border-theme-border pointer-events-auto relative overflow-hidden">
                  <button onClick={() => setIsTimelineCollapsed(false)} className={`absolute right-0 top-0 w-12 h-12 flex items-center justify-center text-[#FFB65A] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all z-10 ${isTimelineCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none scale-75'}`}><ChevronLeftIcon /></button>
                  <div className={`absolute right-0 top-0 bottom-0 w-[400px] p-3 flex items-center gap-4 transition-all ${isTimelineCollapsed ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'}`}>
                    <button onClick={handleTogglePlay} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#FFB65A] text-white shadow-sm active:scale-95">
                      {isPlaying ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 3 14 9-14 9V3z"/></svg>}
                    </button>
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex justify-between items-end mb-0.5"><span className="text-[11px] font-bold text-theme-muted uppercase">Simulation</span><span className="text-[12px] font-bold text-theme-primary font-['Chakra_Petch']">{displayTime.toFixed(2)}s <span className="opacity-40 font-normal">/ {maxTime.toFixed(2)}s</span></span></div>
                      <div className="relative group h-4 flex items-center">
                        <div className="absolute inset-0 h-1 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden"><div className="h-full bg-red-400 dark:bg-red-500" style={{ width: `${maxTime > 0 ? (displayTime / maxTime) * 100 : 0}%` }} /></div>
                        <input type="range" min="0" max={maxTime || 0.1} step="0.01" value={displayTime} onChange={(e) => handleSeek(parseFloat(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
                        <div className="absolute w-3 h-3 bg-white dark:bg-[#1E1F22] border-2 border-red-500 rounded-full shadow-sm top-1/2 -translate-y-1/2 pointer-events-none" style={{ left: `calc(${maxTime > 0 ? (displayTime / maxTime) * 100 : 0}% - 6px)` }} />
                      </div>
                    </div>
                    <button onClick={() => setIsTimelineCollapsed(true)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-theme-secondary rounded-lg transition-colors ml-1"><ChevronRightIcon /></button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isClearModalOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-[#313338] rounded-2xl shadow-2xl p-6 w-[320px] border border-theme-border font-['Chakra_Petch'] flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-inner"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">ยืนยันการเคลียร์พื้นที่?</h3>
              <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">วัตถุทั้งหมดในแบบจำลองจะถูกลบทิ้ง<br/>และไม่สามารถกู้คืนได้</p>
              <div className="flex gap-3 w-full"><button onClick={() => setIsClearModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#3F4147] text-gray-700 dark:text-gray-200 rounded-xl font-bold">ยกเลิก</button><button onClick={handleClearAllConfirm} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors">ลบทิ้ง</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default memo(SimulationWorkspace);