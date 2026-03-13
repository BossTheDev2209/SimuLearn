import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to handle Zoom, Pan, and Coordinate conversion logic with Inverse Panning.
 */
export const useZoomLogic = (
  containerRef, 
  initialCamera, 
  onCameraChange, 
  activeTool, 
  onGridPointerDown, 
  onGridPointerMove, 
  onGridPointerUp, 
  onGridClick,
  unitStep
) => {
  const [camera, setCamera] = useState({
    offset: initialCamera?.offset || { x: 0, y: 0 },
    zoom: initialCamera?.zoom || 1
  });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStartScreen = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const PIXELS_PER_METER = 100;

  // Sync state back to ref for logic handlers
  const cameraRef = useRef(camera);
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  // Handle Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // Screen -> World conversion
  const getSimCoords = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return { wx: 0, wy: 0 };
    const rect = el.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    return {
      wx: (screenX - (size.w / 2 + cameraRef.current.offset.x)) / (PIXELS_PER_METER * cameraRef.current.zoom),
      wy: ((size.h / 2 + cameraRef.current.offset.y) - screenY) / (PIXELS_PER_METER * cameraRef.current.zoom)
    };
  }, [containerRef, size]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const coords = getSimCoords(e);
    const consumed = onGridPointerDown?.(coords.wx, coords.wy, e, unitStep);
    
    if (activeTool === 'cursor' || !consumed) {
      setIsDragging(true);
      dragStartScreen.current = { x: e.clientX, y: e.clientY };
      dragStartOffset.current = { ...cameraRef.current.offset };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [getSimCoords, onGridPointerDown, unitStep, activeTool]);

  const handlePointerMove = useCallback((e) => {
    const coords = getSimCoords(e);
    onGridPointerMove?.(coords.wx, coords.wy, e, unitStep);
    
    if (!isDragging) return;

    // 🌟 INVERSE PANNING: newOffset = dragStartOffset + (mouseDelta / zoom)
    // This allows world coordinates to track 1:1 with mouse movement.
    const dx = e.clientX - dragStartScreen.current.x;
    const dy = e.clientY - dragStartScreen.current.y;

    setCamera(prev => ({
      ...prev,
      offset: {
        x: dragStartOffset.current.x + (dx / prev.zoom),
        y: dragStartOffset.current.y + (dy / prev.zoom)
      }
    }));
  }, [getSimCoords, onGridPointerMove, unitStep, isDragging]);

  const handlePointerUp = useCallback((e) => {
    const coords = getSimCoords(e);
    onGridPointerUp?.(coords.wx, coords.wy, e, unitStep);
    
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    const dx = e.clientX - dragStartScreen.current.x;
    const dy = e.clientY - dragStartScreen.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if ((activeTool !== 'cursor' || dist < 5) && onGridClick) {
      onGridClick(coords.wx, coords.wy, unitStep);
    }
  }, [getSimCoords, onGridPointerUp, activeTool, onGridClick, unitStep]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left - size.w / 2;
    const my = e.clientY - rect.top - size.h / 2;
    
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    
    setCamera(prev => {
      const newZoom = Math.min(Math.max(prev.zoom * factor, 0.05), 50);
      return {
        zoom: newZoom,
        offset: {
          x: mx - (mx - prev.offset.x) * (newZoom / prev.zoom),
          y: my - (my - prev.offset.y) * (newZoom / prev.zoom)
        }
      };
    });
  }, [size, containerRef]);

  useEffect(() => {
    onCameraChange?.(camera);
  }, [camera, onCameraChange]);

  return { 
    offset: camera.offset, zoom: camera.zoom, size, isDragging, 
    handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, 
    getSimCoords, setCamera
  };
};