import React, { useState, useRef, useCallback, useEffect } from 'react';

function niceStep(rawStep) {
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / pow;
  if (frac <= 1) return pow;
  if (frac <= 2) return 2 * pow;
  if (frac <= 5) return 5 * pow;
  return 10 * pow;
}

function formatLabel(value) {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1e6) return value.toExponential(1);
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

export default function InteractiveGrid({ children, initialCamera, onCameraChange, activeTool = 'cursor', onGridClick, onGridPointerDown, onGridPointerMove, onGridPointerUp }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  const [offset, setOffset] = useState(initialCamera?.offset || { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialCamera?.zoom || 1);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Helper to convert MouseEvent to World Coordinates
  const getSimCoords = useCallback((e) => {
    const el = e.currentTarget;
    if (!el) return { wx: 0, wy: 0 };
    const rect = el.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const w = size.w;
    const h = size.h;
    const ox = w / 2 + offset.x;
    const oy = h / 2 + offset.y;
    const pxPerUnit = 50 * zoom;
    return {
      wx: (screenX - ox) / pxPerUnit,
      wy: (oy - screenY) / pxPerUnit
    };
  }, [size, offset, zoom]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return; 
    
    // Invoke general callback
    const coords = getSimCoords(e);
    let consumed = false;
    if (onGridPointerDown) {
      consumed = onGridPointerDown(coords.wx, coords.wy, e, unitStep);
    }

    if (activeTool === 'cursor' || !consumed) {
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      offsetStart.current = { ...offset };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [offset, activeTool, getSimCoords, onGridPointerDown, unitStep]);

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
  }, [activeTool, offsetStart, onGridPointerMove, getSimCoords, unitStep]);

  const handlePointerUp = useCallback((e) => {
    if (onGridPointerUp) {
      const coords = getSimCoords(e);
      onGridPointerUp(coords.wx, coords.wy, e, unitStep);
    }

    const wasDragging = dragging.current;
    dragging.current = false;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (wasDragging || activeTool !== 'cursor') {
      if (!wasDragging || Math.sqrt(dx*dx + dy*dy) < 5) {
          const coords = getSimCoords(e);
          if (onGridClick) {
              onGridClick(coords.wx, coords.wy, unitStep);
          }
      }
    }
  }, [activeTool, getSimCoords, onGridPointerUp, onGridClick, unitStep]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left - size.w / 2;
    const my = e.clientY - rect.top - size.h / 2;

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 100);

    setOffset((prev) => ({
      x: mx - (mx - prev.x) * (newZoom / zoom),
      y: my - (my - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom, size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (onCameraChange) onCameraChange({ offset, zoom });
  }, [offset, zoom, onCameraChange]);

  const { w, h } = size;
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;
  const basePixelsPerUnit = 50; 
  const pxPerUnit = basePixelsPerUnit * zoom;
  const desiredPxGap = 80;
  const rawUnitStep = desiredPxGap / pxPerUnit;
  const unitStep = niceStep(rawUnitStep);
  const pxStep = unitStep * pxPerUnit; 
  const subStep = pxStep / 5;
  const lines = [];
  const labels = [];

  {
    const startUnit = Math.floor((-ox) / pxStep) - 1;
    const endUnit = Math.ceil((w - ox) / pxStep) + 1;
    for (let i = startUnit; i <= endUnit; i++) {
      const xPx = ox + i * pxStep;
      lines.push(<line key={`vM${i}`} x1={xPx} y1={0} x2={xPx} y2={h} stroke="#50535C" strokeWidth={1} />);
      for (let s = 1; s < 5; s++) {
        const sx = xPx + s * subStep;
        lines.push(<line key={`vS${i}_${s}`} x1={sx} y1={0} x2={sx} y2={h} stroke="#3F4147" strokeWidth={0.5} />);
      }
      const unitVal = i * unitStep;
      if (Math.abs(unitVal) > 1e-10) {
        const labelY = Math.min(Math.max(oy + 16, 16), h - 4);
        labels.push(<text key={`lX${i}`} x={xPx} y={labelY} textAnchor="middle" fill="#949BA4" fontSize={11} fontFamily="Inter, system-ui, sans-serif" style={{ userSelect: 'none' }}>{formatLabel(unitVal)}</text>);
      }
    }
  }

  {
    const startUnit = Math.floor((-oy) / pxStep) - 1;
    const endUnit = Math.ceil((h - oy) / pxStep) + 1;
    for (let i = startUnit; i <= endUnit; i++) {
      const yPx = oy + i * pxStep;
      lines.push(<line key={`hM${i}`} x1={0} y1={yPx} x2={w} y2={yPx} stroke="#50535C" strokeWidth={1} />);
      for (let s = 1; s < 5; s++) {
        const sy = yPx + s * subStep;
        lines.push(<line key={`hS${i}_${s}`} x1={0} y1={sy} x2={w} y2={sy} stroke="#3F4147" strokeWidth={0.5} />);
      }
      const unitVal = -i * unitStep;
      if (Math.abs(unitVal) > 1e-10) {
        const labelX = Math.min(Math.max(ox + 6, 6), w - 30);
        labels.push(<text key={`lY${i}`} x={labelX} y={yPx + 4} textAnchor="start" fill="#949BA4" fontSize={11} fontFamily="Inter, system-ui, sans-serif" style={{ userSelect: 'none' }}>{formatLabel(unitVal)}</text>);
      }
    }
  }

  const axisXY = Math.min(Math.max(oy, 0), h); 
  const axisYX = Math.min(Math.max(ox, 0), w); 

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      // 🌟 ใช้เป้าเล็ง (Crosshair) ทั้งตอนลบและตอนเพิ่ม
      style={{ 
        cursor: (activeTool === 'add' || activeTool === 'erase') ? 'crosshair' : (dragging.current ? 'grabbing' : 'grab'), 
        touchAction: 'none' 
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg width={w} height={h} className="absolute inset-0 z-0" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'hidden' }}>
        {lines.map((line) => {
          const isMajor = line.props.strokeWidth === 1;
          return (
            <line key={line.key} x1={line.props.x1} y1={line.props.y1} x2={line.props.x2} y2={line.props.y2} className={isMajor ? "stroke-gray-300 dark:stroke-[#50535C]" : "stroke-gray-200 dark:stroke-[#3F4147]"} strokeWidth={line.props.strokeWidth} />
          );
        })}
        <line x1={0} y1={axisXY} x2={w} y2={axisXY} className="stroke-gray-400 dark:stroke-[#B5BAC1]" strokeWidth={4} />
        <line x1={axisYX} y1={0} x2={axisYX} y2={h} className="stroke-gray-400 dark:stroke-[#B5BAC1]" strokeWidth={1.8} />
        <circle cx={ox} cy={oy} r={3.5} className="fill-gray-400 dark:fill-[#B5BAC1]" />
        {/* Grid axis labels (Desmos-style numbers) */}
        {labels.map((label) => (
          <text
            key={label.key}
            x={label.props.x}
            y={label.props.y}
            textAnchor={label.props.textAnchor}
            className="fill-gray-500 dark:fill-[#949BA4]"
            fontSize={11}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {label.props.children}
          </text>
        ))}
      </svg>
      {typeof children === 'function' ? children({ size, offset, zoom, unitStep }) : children}
    </div>
  );
}