import { useCallback } from 'react';

export const useControlPanelActions = ({
  simState,
  setSimState,
  controlPanelRef,
  bodiesRef,
  matterCanvasRef,
  pushToHistory,
  showToast,
  setIsClearModalOpen
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
    if (changes.remove) {
      if (index !== null) {
        arr.splice(index, 1);
        values[key] = arr;
      } else {
        if (type === 'velocity') { delete values.velocity; delete values.angle; }
        else { delete values.force; delete values.forceAngle; }
        values[key] = arr; 
      }
    } else if (index !== null && arr[index]) {
      arr[index] = { ...arr[index], ...changes };
      values[key] = arr;
    } else if (index === null) {
      if (type === 'velocity') {
          if (changes.magnitude !== undefined) values.velocity = changes.magnitude;
          if (changes.angle !== undefined) values.angle = changes.angle;
          if (changes.color !== undefined) values.color = changes.color;
      } else {
          if (changes.magnitude !== undefined) values.force = changes.magnitude;
          if (changes.angle !== undefined) values.forceAngle = changes.angle;
          if (changes.color !== undefined) values.color = changes.color;
      }
      values[key] = arr;
    }

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

  const onBeforeObjectUpdate = useCallback((objId, changes) => {
    if (changes.size !== undefined) {
      const obj = simState?.objects?.find(o => o.id === objId);
      if (!obj) return true;
      
      const pos = bodiesRef.current?.[objId]?.position || obj.position;
      const collided = matterCanvasRef.current?.checkCollision(pos.x, pos.y, changes.size, obj.shape, objId);
      
      if (collided) {
        showToast('ไม่สามารถเพิ่มขนาดวัตถุได้');
        return false;
      }
    }
    return true;
  }, [simState, bodiesRef, matterCanvasRef, showToast]);

  return { handleControlUpdate, updateVectorValue, handleClearAllConfirm, onBeforeObjectUpdate };
};
