import { useCallback } from 'react';

export const useGridInteraction = ({
  simState,
  setSimState,
  activeTool,
  spawnConfig,
  bodiesRef,
  controlPanelRef,
  matterCanvasRef,
  pushToHistory,
  showToast,
  selectedObjectId,
  setSelectedObjectId,
  selectedObjectIds,
  setSelectedObjectIds,
  followedObjectId,
  setFollowedObjectId,
  setIsFollowMenuOpen,
  rulerPoints,
  setRulerPoints,
  handleTeleport
}) => {

  const handleGridClick = useCallback((wx, wy, unitStep = 1, e) => {
    const isShift = e?.shiftKey;
    if (activeTool === 'add') {
      const snapped = simState?.gridSnapping;
      const fx = snapped ? Math.round(wx / unitStep) * unitStep : wx;
      let fy = snapped ? Math.round(wy / unitStep) * unitStep : wy;

      const minFy = (spawnConfig.size || 1) / 2;
      if (fy < minFy) fy = minFy;

      const preciseHit = matterCanvasRef.current?.checkCollision(fx, fy, spawnConfig.size, spawnConfig.shape);
      if (preciseHit) {
        showToast('ไม่สามารถเสกวัตถุตรงนี้ได้');
        return;
      }

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
            if (vectorHit.index === 'netResultant') {
               const newState = { ...simState, showResultantVector: false };
               setSimState(newState);
            }
            else if (vectorHit.index === 'resultant') {
               const key = vectorHit.type === 'velocity' ? 'velocities' : 'forces';
               values[key] = [];
               if (vectorHit.type === 'velocity') { delete values.velocity; delete values.angle; }
               else { delete values.force; delete values.forceAngle; }
               controlPanelRef.current.updateObjectValues(vectorHit.objId, values);
            } else {
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
           if (targetId === followedObjectId) setFollowedObjectId(null);
         }
      }
    } else if (activeTool === 'focus') {
      const hitId = matterCanvasRef.current?.findObjectAt(wx, wy);
      if (hitId) {
        setFollowedObjectId(prev => prev === hitId ? null : hitId);
      }
      setIsFollowMenuOpen(false); 
      setSelectedObjectId(null);
    } else if (activeTool === 'cursor') {
      const hitId = matterCanvasRef.current?.findObjectAt(wx, wy);
      if (hitId) {
        if (isShift) {
          setSelectedObjectIds(prev => {
            if (prev.includes(hitId)) return prev.filter(id => id !== hitId);
            return [...prev, hitId];
          });
        } else {
          setSelectedObjectId(hitId);
          setSelectedObjectIds([hitId]);
        }
      } else {
        if (!isShift) {
          setSelectedObjectId(null);
          setSelectedObjectIds([]);
        }
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
  }, [activeTool, simState, spawnConfig, bodiesRef, showToast, pushToHistory, controlPanelRef, matterCanvasRef, setIsFollowMenuOpen, selectedObjectId, setSelectedObjectId, selectedObjectIds, setSelectedObjectIds, followedObjectId, setFollowedObjectId, setRulerPoints, setSimState]);

  const handleGridRightClick = useCallback((wx, wy, unitStep = 1) => {
    if (activeTool === 'ruler') {
      let targetIdx = -1;
      const threshold = 0.5; 
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

      let segIdx = -1;
      for (let i = 0; i < rulerPoints.length - 1; i++) {
        const p1 = rulerPoints[i];
        const p2 = rulerPoints[i+1];
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
          next.splice(segIdx, 2); 
          return next;
        });
      }
    }
  }, [activeTool, rulerPoints, setRulerPoints]);

  const handleGridDoubleClick = useCallback((wx, wy) => {
    if (activeTool === 'cursor') {
      const hitId = matterCanvasRef.current?.findObjectAt(wx, wy);
      if (!hitId) {
        handleTeleport?.(0, 0);
      }
    }
  }, [activeTool, handleTeleport, matterCanvasRef]);

  return { handleGridClick, handleGridRightClick, handleGridDoubleClick };
};
