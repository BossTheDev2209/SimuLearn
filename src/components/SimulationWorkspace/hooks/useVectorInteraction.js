import { useCallback, useRef } from 'react';

export const useVectorInteraction = ({
  activeTool,
  simState,
  matterCanvasRef,
  pushToHistory,
  controlPanelRef,
  setVectorEditor,
  followedObjectId,
  setFollowedObjectId,
  selectedObjectId,
  setSelectedObjectId
}) => {
  const dragRef = useRef(null);

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

    if (activeTool === 'cursor') {
      const hitId = matterCanvasRef.current?.findObjectAt(wx, wy);
      if (hitId) {
        // Start dragging
        dragRef.current = { 
          objId: hitId, 
          startX: wx, 
          startY: wy, 
          hasMoved: false 
        };
        setSelectedObjectId(hitId);
        return true;
      }
    }

    return false;
  }, [activeTool, simState?.gridSnapping, followedObjectId, setFollowedObjectId, setSelectedObjectId, matterCanvasRef]);

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
    } else if (activeTool === 'cursor' && dragRef.current) {
      const d = dragRef.current;
      d.hasMoved = true;
      let nx = wx, ny = wy;
      if (simState?.gridSnapping) {
        nx = Math.round(wx / unitStep) * unitStep;
        ny = Math.round(wy / unitStep) * unitStep;
      }
      matterCanvasRef.current?.teleportObject(d.objId, nx, ny);
    }
  }, [activeTool, simState?.gridSnapping, matterCanvasRef]);

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
      if (dragRef.current?.hasMoved) {
        pushToHistory(simState);
      }
      dragRef.current = null;
      setVectorEditor(null);
    }
  }, [activeTool, simState, pushToHistory, setVectorEditor, matterCanvasRef, controlPanelRef]);

  return {
    handleGridPointerDown,
    handleGridPointerMove,
    handleGridPointerUp
  };
};
