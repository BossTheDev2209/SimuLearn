import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useZoomLogic } from './useZoomLogic';
import GridView, { niceStep } from './GridView';

/**
 * InteractiveGrid component with Imperative Handle for camera control.
 */
const InteractiveGrid = forwardRef(({ 
  children, 
  initialCamera, 
  onCameraChange, 
  activeTool = 'cursor', 
  onGridClick, 
  onGridPointerDown, 
  onGridPointerMove, 
  onGridPointerUp, 
  onGridRightClick,
  style = {} 
}, ref) => {
  const containerRef = useRef(null);
  const PIXELS_PER_METER = 100;
  
  const { 
    offset, zoom, size, isDragging, 
    handlePointerDown, handlePointerMove, handlePointerUp, handleWheel,
    setCamera, getSimCoords
  } = useZoomLogic(
    containerRef, 
    initialCamera, 
    onCameraChange, 
    activeTool, 
    onGridPointerDown, 
    onGridPointerMove, 
    onGridPointerUp, 
    onGridClick, 
    onGridRightClick,
    niceStep(100 / (PIXELS_PER_METER * (initialCamera?.zoom || 1))) / 5 // initial subStep
  );

  // Snapping steps based on current zoom
  const unitStep = niceStep(100 / (PIXELS_PER_METER * zoom));
  const subStep = unitStep / 5;

  // Expose setCamera to parents (for Following feature)
  useImperativeHandle(ref, () => ({
    setCamera,
    getSimCoords
  }));

  // Add Wheel event manually to support non-passive scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ 
        cursor: (activeTool === 'add' || activeTool === 'erase' || activeTool === 'velocity' || activeTool === 'force') 
          ? 'crosshair' 
          : (isDragging ? 'grabbing' : 'grab'), 
        touchAction: 'none',
        ...style
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GridView size={size} offset={offset} zoom={zoom} />
      
      {/* Function children support common in deconstructed patterns */}
      {typeof children === 'function' ? children({ size, offset, zoom, unitStep, subStep }) : children}
    </div>
  );
});

export default InteractiveGrid;
