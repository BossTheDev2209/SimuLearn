import { useState, useRef, useEffect, useCallback } from 'react';
import { resetSettledTimeMap } from '../physics/PhysicsEngine';

export function useTimeManagement(simState, setSimState, onSaveControlState, matterCanvasRef, controlPanelRef) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [displayTime, setDisplayTime] = useState(0);
  
  const snapshotRef = useRef(null);
  const timeStateRef = useRef({ time: 0, isPlaying: false, timeScale: 1, targetTime: null, totalPhysicsTicks: 0 });
  const hasStartedOnceRef = useRef(hasStartedOnce);

  useEffect(() => { timeStateRef.current.isPlaying = isPlaying; }, [isPlaying]);
  useEffect(() => { timeStateRef.current.timeScale = timeScale; }, [timeScale]);
  useEffect(() => { hasStartedOnceRef.current = hasStartedOnce; }, [hasStartedOnce]);

  // RequestAnimationFrame สำหรับอัปเดต UI เวลาแยกส่วน
  useEffect(() => {
    let animationFrameId;
    const updateTimeDisplay = () => {
      setDisplayTime(timeStateRef.current.time);
      animationFrameId = requestAnimationFrame(updateTimeDisplay);
    };
    animationFrameId = requestAnimationFrame(updateTimeDisplay);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);


  const handleTogglePlay = useCallback(() => {
    if (!hasStartedOnceRef.current) setHasStartedOnce(true);
    const next = !timeStateRef.current.isPlaying;
    
    if (next && !timeStateRef.current.isPlaying) {
      if (timeStateRef.current.totalPhysicsTicks === 0) {
        snapshotRef.current = { simState: JSON.parse(JSON.stringify(simState)) };
      }
    }
    
    timeStateRef.current.isPlaying = next;
    setIsPlaying(next);
  }, [simState]);

  const handleRestart = useCallback(() => {
    timeStateRef.current.time = 0;
    timeStateRef.current.totalPhysicsTicks = 0;
    timeStateRef.current.targetTime = null;
    timeStateRef.current.isPlaying = false;
    setIsPlaying(false);
    setDisplayTime(0);

    // Restore from snapshot if available, otherwise use current simState as fallback
    const restored = snapshotRef.current?.simState ?? (simState ? JSON.parse(JSON.stringify(simState)) : null);
    if (restored) {
      setSimState(restored);
      if (onSaveControlState) onSaveControlState(restored);
      if (controlPanelRef?.current?.resetState) {
        controlPanelRef.current.resetState(restored);
      }
    }
    
    // Defer engine reset by one frame so loopPropsRef gets the new simState first
    requestAnimationFrame(() => {
       resetSettledTimeMap();
       if (matterCanvasRef.current) matterCanvasRef.current.resetSimulation();
    });
  }, [simState, setSimState, onSaveControlState, matterCanvasRef, controlPanelRef]);

  const handleSeek = useCallback((targetTime) => {
    timeStateRef.current.time = targetTime;
    timeStateRef.current.totalPhysicsTicks = Math.round(targetTime * 60);
    setDisplayTime(targetTime);
  }, []);

  const handleSpacebar = useCallback(() => {
    if (timeStateRef.current.isPlaying) {
      timeStateRef.current.isPlaying = false;
      setIsPlaying(false);
    } else {
      if (timeStateRef.current.time > 0) {
        handleRestart();
        // Immediately start playing
        timeStateRef.current.isPlaying = true;
        setIsPlaying(true);
      } else {
        if (!hasStartedOnceRef.current) setHasStartedOnce(true);
        timeStateRef.current.isPlaying = true;
        setIsPlaying(true);
      }
    }
  }, [handleRestart]);

  return {
    isPlaying, setIsPlaying, hasStartedOnce, setHasStartedOnce, timeScale, setTimeScale,
    displayTime, timeStateRef, handleTogglePlay, handleRestart, handleSeek, handleSpacebar
  };
}