import { useCallback } from 'react';

export const useSimulationLogic = ({
  simState,
  setSimState,
  controlPanelRef,
  matterCanvasRef,
  bodiesRef,
  pushToHistory,
  showToast,
  spawnConfig,
  setIsClearModalOpen,
  setIsFollowMenuOpen, // 🌟 เพิ่มเข้ามา
  activeTool,
  selectedObjectId,
  setSelectedObjectId,
  rulerPoints,
  setRulerPoints
}) => {

  const handleControlUpdate = useCallback((state) => {
    setSimState(prev => {
      if (JSON.stringify(prev) === JSON.stringify(state)) return prev;
      return state;
    });
  }, [setSimState]);

  const updateVectorValue = useCallback((objId, type, index, changes) => {
    const obj = simState?.objects?.find(o => o.id === objId);
    if (!obj) return;
    
    const values = { ...obj.values };
    const key = type === 'velocity' ? 'velocities' : 'forces';
    const arr = [...(values[key] || [])];
    if (index !== null && arr[index]) {
      arr[index] = { ...arr[index], ...changes };
    } else if (index === null) {
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
  }, [simState, controlPanelRef]);

  const handleClearAllConfirm = useCallback(() => {
    pushToHistory(simState);
    if (controlPanelRef.current?.clearAll) {
      controlPanelRef.current.clearAll();
    }
    setIsClearModalOpen(false);
  }, [pushToHistory, simState, controlPanelRef, setIsClearModalOpen]);

  const handleGridClick = useCallback((wx, wy, unitStep = 1) => {
    if (activeTool === 'add') {
      const snapped = simState?.gridSnapping;
      const fx = snapped ? Math.round(wx / unitStep) * unitStep : wx;
      const fy = snapped ? Math.round(wy / unitStep) * unitStep : wy;

      // 1. Precise check using Matter.js engine
      const preciseHit = matterCanvasRef.current?.checkCollision(fx, fy, spawnConfig.size, spawnConfig.shape);
      if (preciseHit) {
        showToast('ไม่สามารถเสกวัตถุตรงนี้ได้');
        return;
      }

      // 2. Fallback distance check
      const overlapRadiusBase = 0.52; 
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
           if (targetId === selectedObjectId) setSelectedObjectId(null);
         }
      }
    } else if (activeTool === 'focus') {
      setIsFollowMenuOpen(false); 
      setSelectedObjectId(null);
    } else if (activeTool === 'cursor') {
      const hitId = matterCanvasRef.current?.findObjectAt(wx, wy);
      if (hitId) {
        setSelectedObjectId(hitId);
      } else {
        setSelectedObjectId(null);
      }
    } else if (activeTool === 'ruler') {
      const snapHit = matterCanvasRef.current?.findSnapPoint(wx, wy);
      let fx, fy;
      if (snapHit) {
        fx = snapHit.x; fy = snapHit.y;
      } else {
        const snapped = simState?.gridSnapping;
        fx = snapped ? Math.round(wx / unitStep) * unitStep : wx;
        fy = snapped ? Math.round(wy / unitStep) * unitStep : wy;
      }
      pushToHistory(simState);
      setRulerPoints(prev => [...prev, { x: fx, y: fy }]);
    }
  }, [activeTool, simState, spawnConfig, bodiesRef, showToast, pushToHistory, controlPanelRef, matterCanvasRef, setIsFollowMenuOpen, selectedObjectId, setSelectedObjectId, setRulerPoints]);

  const handleGridRightClick = useCallback((wx, wy, unitStep = 1) => {
    if (activeTool === 'ruler') {
      // Find point hit
      let targetIdx = -1;
      const threshold = 0.5; // world meters
      for (let i = 0; i < rulerPoints.length; i++) {
        const p = rulerPoints[i];
        const dist = Math.sqrt((wx - p.x)**2 + (wy - p.y)**2);
        if (dist < threshold) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== -1) {
        setRulerPoints(prev => prev.filter((_, i) => i !== targetIdx));
        return;
      }

      // Find segment hit
      let segIdx = -1;
      for (let i = 0; i < rulerPoints.length - 1; i++) {
        const p1 = rulerPoints[i];
        const p2 = rulerPoints[i+1];
        // Dist point to segment
        const A = wx - p1.x;
        const B = wy - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
          xx = p1.x; yy = p1.y;
        } else if (param > 1) {
          xx = p2.x; yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }
        const dx = wx - xx;
        const dy = wy - yy;
        if (Math.sqrt(dx*dx + dy*dy) < threshold) {
          segIdx = i;
          break;
        }
      }

      if (segIdx !== -1) {
        setRulerPoints(prev => {
          const next = [...prev];
          next.splice(segIdx, 2); // Remove both points of the segment
          return next;
        });
      }
    }
  }, [activeTool, rulerPoints, setRulerPoints]);

  return {
    handleControlUpdate,
    updateVectorValue,
    handleClearAllConfirm,
    handleGridClick,
    handleGridRightClick
  };
};
