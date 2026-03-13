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
  const [offset, setOffset] = useState(initialCamera?.offset || { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialCamera?.zoom || 1);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const PIXELS_PER_METER = 100;
  const pxPerUnit = PIXELS_PER_METER * zoom;
  const ox = size.w / 2 + offset.x;
  const oy = size.h / 2 + offset.y;

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
      wx: (screenX - (size.w / 2 + offset.x)) / (PIXELS_PER_METER * zoom),
      wy: ((size.h / 2 + offset.y) - screenY) / (PIXELS_PER_METER * zoom)
    };
  }, [offset, zoom, size, containerRef]);

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
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [getSimCoords, onGridPointerDown, unitStep, activeTool, offset]);

  const handlePointerMove = useCallback((e) => {
    if (onGridPointerMove) {
      const coords = getSimCoords(e);
      onGridPointerMove(coords.wx, coords.wy, e, unitStep);
    }
    
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    });
  }, [getSimCoords, onGridPointerMove, unitStep]);

  const handlePointerUp = useCallback((e) => {
    if (onGridPointerUp) {
      const coords = getSimCoords(e);
      onGridPointerUp(coords.wx, coords.wy, e, unitStep);
    }
    
    const wasDragging = dragging.current;
    dragging.current = false;
    setIsDragging(false);
    
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (activeTool !== 'cursor' || dist < 5) {
      const coords = getSimCoords(e);
      if (onGridClick) onGridClick(coords.wx, coords.wy, unitStep);
    }
  }, [getSimCoords, onGridPointerUp, activeTool, onGridClick, unitStep]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    // Use precise relative position for anchored zoom (Fixes Vertical Drift)
    const mx = e.clientX - rect.left - size.w / 2;
    const my = e.clientY - rect.top - size.h / 2;
    
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 50);

    setOffset((prev) => ({
      x: mx - (mx - prev.x) * (newZoom / zoom),
      y: my - (my - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom, size, containerRef]);

  useEffect(() => {
    if (onCameraChange) onCameraChange({ offset, zoom });
  }, [offset, zoom, onCameraChange]);

  return { 
    offset, zoom, size, isDragging, 
    handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, 
    getSimCoords 
  };
};
