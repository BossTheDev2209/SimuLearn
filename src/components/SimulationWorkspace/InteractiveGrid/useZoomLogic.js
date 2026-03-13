import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to handle Zoom, Pan, and Coordinate conversion logic.
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
  
  const dragging = useRef(false);
  const dragStartWorld = useRef({ wx: 0, wy: 0 });

  const PIXELS_PER_METER = 100;

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

  // Screen -> World conversion (Absolute)
  const getSimCoordsLocal = useCallback((e, currentOffset, currentZoom, currentSize) => {
    const el = containerRef.current;
    if (!el) return { wx: 0, wy: 0 };
    const rect = el.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    return {
      wx: (screenX - (currentSize.w / 2 + currentOffset.x)) / (PIXELS_PER_METER * currentZoom),
      wy: ((currentSize.h / 2 + currentOffset.y) - screenY) / (PIXELS_PER_METER * currentZoom)
    };
  }, [containerRef]);

  const getSimCoords = useCallback((e) => {
    return getSimCoordsLocal(e, camera.offset, camera.zoom, size);
  }, [camera, size, getSimCoordsLocal]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const coords = getSimCoords(e);
    let consumed = false;
    
    if (onGridPointerDown) {
      consumed = onGridPointerDown(coords.wx, coords.wy, e, unitStep);
    }
    
    if (activeTool === 'cursor' || !consumed) {
      dragging.current = true;
      setIsDragging(true);
      dragStartWorld.current = coords; // Capture world point under cursor
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [getSimCoords, onGridPointerDown, unitStep, activeTool]);

  const handlePointerMove = useCallback((e) => {
    const coords = getSimCoords(e);
    if (onGridPointerMove) {
      onGridPointerMove(coords.wx, coords.wy, e, unitStep);
    }
    
    if (!dragging.current) return;

    // Recalculate offset to keep dragStartWorld under current cursor position
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setCamera(prev => ({
      ...prev,
      offset: {
        x: mx - size.w / 2 - dragStartWorld.current.wx * (PIXELS_PER_METER * prev.zoom),
        y: size.h / 2 - my + dragStartWorld.current.wy * (PIXELS_PER_METER * prev.zoom)
      }
    }));
  }, [getSimCoords, onGridPointerMove, unitStep, size, containerRef]);

  const handlePointerUp = useCallback((e) => {
    const coords = getSimCoords(e);
    if (onGridPointerUp) {
      onGridPointerUp(coords.wx, coords.wy, e, unitStep);
    }
    
    const wasDragging = dragging.current;
    dragging.current = false;
    setIsDragging(false);
    
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    // Use world-space distance check instead of screen pixels for tool click
    const dx = coords.wx - dragStartWorld.current.wx;
    const dy = coords.wy - dragStartWorld.current.wy;
    const distW = Math.sqrt(dx * dx + dy * dy);
    
    if (activeTool !== 'cursor' || distW < 0.1) {
      if (onGridClick) onGridClick(coords.wx, coords.wy, unitStep);
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
    if (onCameraChange) onCameraChange(camera);
  }, [camera, onCameraChange]);

  return { 
    offset: camera.offset, zoom: camera.zoom, size, isDragging, 
    handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, 
    getSimCoords 
  };
};
