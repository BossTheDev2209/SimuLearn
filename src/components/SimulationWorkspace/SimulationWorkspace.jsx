import React, { useState, useRef, useCallback, useEffect, memo, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import ControlPanel from '../ControlPanel/ControlPanel';
import InteractiveGrid from './InteractiveGrid/index';
import MatterCanvas from './MatterCanvas/index';
import Timebar from './Timebar';

// UI Components
import { Toolbar } from './UI/Toolbar';
import { SpawnOverlay } from './UI/SpawnOverlay';
import { FollowMenu } from './UI/FollowMenu';
import { VectorTooltip } from './UI/VectorTooltip';
import { TrackingSystem } from './UI/TrackingSystem';
import { SimulationTimeline } from './UI/SimulationTimeline';
import { ClearModal } from './UI/ClearModal';

// Hooks
import { useWorkspaceState } from '../../hooks/useWorkspaceState';
import { useSimulationHistory } from './hooks/useSimulationHistory';
import { useTimeManagement } from './hooks/useTimeManagement';
import { useSimulationLogic } from './hooks/useSimulationLogic';
import { useVectorInteraction } from './hooks/useVectorInteraction';
import { useCameraEngine } from './hooks/useCameraEngine';

const SimulationWorkspace = forwardRef(({ activeSim, isInteracting, onSaveControlState, onSavePhysicsState }, ref) => {
  const shouldHideLogo = isInteracting || activeSim !== null;
  const [simState, setSimState] = useState(null);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);


  // Core Refs
  const gridRef = useRef(null);
  const matterCanvasRef = useRef(null);
  const controlPanelRef = useRef(null);

  // Custom Hooks
  const workspaceState = useWorkspaceState();
  const {
    activeTool, vectorEditor, setVectorEditor, isToolbarOpen, setIsToolbarOpen,
    isClearModalOpen, setIsClearModalOpen, spawnToast, showToast, spawnConfig, setSpawnConfig,
    followedObjectId, setFollowedObjectId, isFollowMenuOpen, setIsFollowMenuOpen, handleToolClick
  } = workspaceState;

  const { pushToHistory, undoRef, redoRef } = useSimulationHistory(simState, setSimState, onSaveControlState);

  const { 
    isPlaying, setIsPlaying, timeScale, setTimeScale, 
    displayTime, maxTime, timeStateRef, handleTogglePlay: _handleTogglePlay, handleRestart, handleSeek 
  } = useTimeManagement(simState, setSimState, onSaveControlState, matterCanvasRef, controlPanelRef);

  const handleTogglePlay = useCallback(() => {
    if (displayTime >= maxTime && !isPlaying) return;
    _handleTogglePlay();
  }, [displayTime, maxTime, isPlaying, _handleTogglePlay]);

  const { bodiesRef, handleCameraChange, handleTeleport, handlePhysicsChange } = useCameraEngine(activeSim, followedObjectId, onSavePhysicsState, gridRef);

  const { handleControlUpdate, updateVectorValue, handleClearAllConfirm, handleGridClick } = useSimulationLogic({
    simState, setSimState, controlPanelRef, matterCanvasRef, bodiesRef, 
    pushToHistory, showToast, spawnConfig, setIsClearModalOpen, activeTool
  });

  const { handleGridPointerDown, handleGridPointerMove, handleGridPointerUp } = useVectorInteraction({
    activeTool, simState, matterCanvasRef, pushToHistory, controlPanelRef, 
    setVectorEditor, followedObjectId, setFollowedObjectId
  });

  // Imperative Handle
  useImperativeHandle(ref, () => ({
    handleRestart, handleTogglePlay, handleSeek, pushToHistory
  }));

  // Effects
  useEffect(() => { if (isPlaying) setVectorEditor(null); }, [isPlaying, setVectorEditor]);
  useEffect(() => { if (simState && onSaveControlState) onSaveControlState(simState); }, [simState, onSaveControlState]);

  const handleRestartRef = useRef(handleRestart);
  useEffect(() => { handleRestartRef.current = handleRestart; }, [handleRestart]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.code === 'Space') { e.preventDefault(); if (displayTime < maxTime) handleTogglePlay(); }
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); handleRestartRef.current?.(); }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        const restored = e.shiftKey ? redoRef.current?.() : undoRef.current?.();
        if (restored && controlPanelRef.current?.resetState) controlPanelRef.current.resetState(restored);
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        const restored = redoRef.current?.();
        if (restored && controlPanelRef.current?.resetState) controlPanelRef.current.resetState(restored);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, undoRef, redoRef, displayTime, maxTime]);

  // UI rendering
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
              <ControlPanel ref={controlPanelRef} key={activeSim.id} initialState={simState || activeSim.controlState || activeSim.data} simulationType={activeSim.simulationType || activeSim.data?.simulationType || 'default'} isLocked={isPlaying} onUpdate={handleControlUpdate} />
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden border border-theme-border bg-white dark:bg-[#2B2D31] relative shadow-sm">
              <div className="absolute top-4 left-4 z-50 flex gap-2 items-start pointer-events-none">
                <Toolbar activeTool={activeTool} isToolbarOpen={isToolbarOpen} setIsToolbarOpen={setIsToolbarOpen} handleToolClick={handleToolClick} />
                <SpawnOverlay activeTool={activeTool} spawnConfig={spawnConfig} setSpawnConfig={setSpawnConfig} />
                <FollowMenu isFollowMenuOpen={isFollowMenuOpen} setIsFollowMenuOpen={setIsFollowMenuOpen} simState={simState} followedObjectId={followedObjectId} setFollowedObjectId={setFollowedObjectId} />
              </div>

              <InteractiveGrid ref={gridRef} initialCamera={activeSim.physicsState?.camera} onCameraChange={handleCameraChange} activeTool={activeTool} onGridClick={handleGridClick} onGridPointerDown={handleGridPointerDown} onGridPointerMove={handleGridPointerMove} onGridPointerUp={handleGridPointerUp}>
                {({ size, offset, zoom, unitStep }) => (
                  <>
                    <MatterCanvas 
                      ref={matterCanvasRef} size={size} offset={offset} zoom={zoom} unitStep={unitStep} simState={simState} initialPhysics={activeSim.physicsState} onPhysicsChange={handlePhysicsChange} activeTool={activeTool} spawnConfig={spawnConfig}
                      gridSnapping={!!simState?.gridSnapping} showCursorCoords={!!simState?.showCursorCoords} showResultantVector={!!simState?.showResultantVector} timeStateRef={timeStateRef} setIsPlaying={setIsPlaying} maxTime={maxTime} followedObjectId={followedObjectId}
                    />
                    <TrackingSystem objects={simState?.objects} bodies={bodiesRef.current} offset={offset} zoom={zoom} size={size} onTeleport={handleTeleport} />
                    <VectorTooltip vectorEditor={vectorEditor} setVectorEditor={setVectorEditor} updateVectorValue={updateVectorValue} />
                  </>
                )}
              </InteractiveGrid>

              <div className="absolute top-4 right-4 z-40 pointer-events-auto">
                <Timebar isPlaying={isPlaying} timeScale={timeScale} displayTime={displayTime} onTogglePlay={handleTogglePlay} onRestart={handleRestart} onTimeScaleChange={setTimeScale} onSeek={handleSeek} />
              </div>
              <SimulationTimeline isTimelineCollapsed={isTimelineCollapsed} setIsTimelineCollapsed={setIsTimelineCollapsed} isPlaying={isPlaying} displayTime={displayTime} maxTime={maxTime} handleTogglePlay={handleTogglePlay} handleSeek={handleSeek} />
            </div>
          </div>
        </motion.div>
      )}

      <ClearModal isClearModalOpen={isClearModalOpen} setIsClearModalOpen={setIsClearModalOpen} handleClearAllConfirm={handleClearAllConfirm} />
    </div>
  );
});

export default memo(SimulationWorkspace);