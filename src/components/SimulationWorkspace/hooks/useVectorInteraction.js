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
  setSelectedObjectId,
  selectedObjectIds,       // ✅ รับเข้ามาแล้ว
  setSelectedObjectIds,    // ✅ รับเข้ามาแล้ว
  bodiesRef
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
      const rotId = matterCanvasRef.current?.findRotationHandle(wx, wy);
      if (rotId) {
        dragRef.current = { objId: rotId, isRotating: true, hasMoved: false };
        return true;
      }

      const vHit = matterCanvasRef.current?.findVectorAt(wx, wy);
      if (vHit && vHit.index !== 'resultant' && vHit.index !== 'netResultant') {
        setVectorEditor({
          ...vHit,
          screenX: e.clientX,
          screenY: e.clientY
        });
        return true;
      }

      const hitId = matterCanvasRef.current?.findObjectAt(wx, wy);
      if (hitId) {
        dragRef.current = { objId: hitId, startX: wx, startY: wy, hasMoved: false };
        setVectorEditor(null);

        if (e?.shiftKey) {
          // ✅ Shift+click — toggle obj เข้า/ออกจาก multi-select
          setSelectedObjectIds(prev => {
            const current = prev || [];
            const already = current.includes(hitId);
            return already
              ? current.filter(id => id !== hitId)
              : [...current, hitId];
          });
          // selectedObjectId ชี้ที่ obj ล่าสุดที่คลิกเสมอ
          setSelectedObjectId(hitId);
        } else {
          // ✅ คลิกธรรมดา — เลือกแค่อันเดียว reset multi-select
          setSelectedObjectId(hitId);
          setSelectedObjectIds([hitId]);
        }

        return true;
      }

      // ✅ คลิกที่ว่าง → เคลียร์ทั้ง single และ multi selection
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
    }

    return false;
  }, [activeTool, simState?.gridSnapping, setSelectedObjectId, setSelectedObjectIds, setVectorEditor, matterCanvasRef]);

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
      if (dragRef.current.isRotating) {
        // ใช้ bodiesRef (world meters) ไม่ใช่ Matter px
        const body = bodiesRef.current?.[dragRef.current.objId];
        if (body) {
          const dx = wx - body.position.x;
          const dy = wy - body.position.y;
          // dy ใน world Y-up → กลับ dy เพื่อให้ rotation ถูกทิศ
          const angle = Math.atan2(-dy, dx) + Math.PI / 2;
          matterCanvasRef.current?.setObjectRotation(dragRef.current.objId, angle);
          dragRef.current.hasMoved = true;
        }
      } else {
        let nx = wx, ny = wy;
        if (simState?.gridSnapping) {
          nx = Math.round(wx / unitStep) * unitStep;
          ny = Math.round(wy / unitStep) * unitStep;
        }
        matterCanvasRef.current?.teleportObject(dragRef.current.objId, nx, ny);
        dragRef.current.hasMoved = true;
      }
    }
  }, [activeTool, simState?.gridSnapping, matterCanvasRef, bodiesRef]);

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
        const dx = v.currentX - v.startX;
        const dy = v.currentY - v.startY;
        const dragDist = Math.sqrt(dx * dx + dy * dy);
        const obj = simState?.objects?.find(o => o.id === v.objId);
        if (!obj) return;

        // เวกเตอร์คงที่ — ไม่ขึ้นกับระยะลาก (ลากเอาแค่ทิศทาง)
        const magnitude = 10.0;

        // dy ใน world Y-up ถูกต้องอยู่แล้ว ไม่ต้องกลับ
        const angle = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));

        // threshold 0.05m = 5cm เพื่อกรอง click โดยไม่ตั้งใจ
        if (dragDist > 0.05) {
          pushToHistory(simState);
          let vIdx = 0;
          const defaultColor = v.type === 'velocity' ? '#3B82F6' : '#EF4444';
          const defaultName = (v.type === 'velocity' ? 'v' : 'F') + (Math.floor(Math.random() * 900) + 100);
          
          if (controlPanelRef.current?.updateObjectValues) {
            const values = { ...obj.values };
            const key = v.type === 'velocity' ? 'velocities' : 'forces';
            const arr = [...(values[key] || [])];
            vIdx = arr.length;
            const newV = { magnitude, angle, color: defaultColor, name: defaultName };
            controlPanelRef.current.updateObjectValues(v.objId, { ...values, [key]: [...arr, newV] });
          }
          setVectorEditor({
            objId: v.objId, type: v.type, index: vIdx,
            magnitude, angle, name: defaultName, color: defaultColor,
            screenX: e.clientX, screenY: e.clientY,
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
    handleGridPointerUp,
  };
};