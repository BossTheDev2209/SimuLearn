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
  activeTool
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

      const overlapRadiusBase = 1.1;
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
         }
      }
    }
  }, [activeTool, simState, spawnConfig, bodiesRef, showToast, pushToHistory, controlPanelRef, matterCanvasRef]);

  return {
    handleControlUpdate,
    updateVectorValue,
    handleClearAllConfirm,
    handleGridClick
  };
};
