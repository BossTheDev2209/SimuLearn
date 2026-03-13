import { useState, useRef, useEffect, useCallback } from 'react';

export function useTimeManagement(simState, setSimState, onSaveControlState, matterCanvasRef, controlPanelRef) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [displayTime, setDisplayTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  
  const snapshotRef = useRef(null);
  const timeStateRef = useRef({ time: 0, isPlaying: false, timeScale: 1, targetTime: null });
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

  // ทำนายเวลาสิ้นสุด
  useEffect(() => {
    if (!matterCanvasRef.current || isPlaying) return;
    const timer = setTimeout(() => {
       const predicted = matterCanvasRef.current.predictSimulationTime?.();
       if (predicted !== undefined) setMaxTime(predicted);
    }, 150);
    return () => clearTimeout(timer);
  }, [simState, isPlaying, matterCanvasRef]);

  const handleTogglePlay = useCallback(() => {
    if (!hasStartedOnceRef.current) setHasStartedOnce(true);
    const next = !timeStateRef.current.isPlaying;
    
    if (next && !timeStateRef.current.isPlaying) {
      snapshotRef.current = { simState: JSON.parse(JSON.stringify(simState)) };
    }
    
    timeStateRef.current.isPlaying = next;
    setIsPlaying(next);
  }, [simState]);

  const handleRestart = useCallback(() => {
    timeStateRef.current.time = 0;
    timeStateRef.current.targetTime = null;
    timeStateRef.current.isPlaying = false;
    setIsPlaying(false);
    setDisplayTime(0);

    if (snapshotRef.current) {
      const restored = snapshotRef.current.simState;
      setSimState(restored);
      if (onSaveControlState) onSaveControlState(restored);
      // 🌟 Sync ControlPanel
      if (controlPanelRef?.current?.resetState) {
        controlPanelRef.current.resetState(restored);
      }
    }
    if (matterCanvasRef.current) matterCanvasRef.current.resetSimulation();
  }, [setSimState, onSaveControlState, matterCanvasRef]);

  const handleSeek = useCallback((val) => {
    timeStateRef.current.isPlaying = false;
    setIsPlaying(false);
    timeStateRef.current.time = val;
    setDisplayTime(val);

    if (matterCanvasRef.current) {
      matterCanvasRef.current.resetSimulation({ targetTime: val, instant: true });
    }
  }, [matterCanvasRef]);

  return {
    isPlaying, setIsPlaying, hasStartedOnce, setHasStartedOnce, timeScale, setTimeScale,
    displayTime, maxTime, timeStateRef, handleTogglePlay, handleRestart, handleSeek
  };
}