import { useEffect, useRef } from 'react';

export const useKeyboardShortcuts = ({
  handleSpacebar,
  handleRestart,
  undoRef,
  redoRef,
  controlPanelRef,
  selectedObjectId,
  selectedObjectIds,
  setSelectedObjectIds,
  setSelectedObjectId,
  pushToHistory,
  simState,
  showToast
}) => {

  const handleRestartRef = useRef(handleRestart);
  useEffect(() => { 
    handleRestartRef.current = handleRestart; 
  }, [handleRestart]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.code === 'Space') { 
        e.preventDefault(); 
        e.stopImmediatePropagation();
        handleSpacebar();
      }
      
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) { 
        e.preventDefault(); 
        handleRestartRef.current?.(); 
      }
      
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        const restored = e.shiftKey ? redoRef.current?.() : undoRef.current?.();
        if (restored && controlPanelRef.current?.resetState) {
          controlPanelRef.current.resetState(restored);
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        const restored = redoRef.current?.();
        if (restored && controlPanelRef.current?.resetState) {
          controlPanelRef.current.resetState(restored);
        }
      }
      
      if (e.code === 'Delete') {
        const hasMultiple = selectedObjectIds && selectedObjectIds.length > 0;
        const targetId = selectedObjectId;
        const targetIds = selectedObjectIds;

        if ((targetId || hasMultiple) && controlPanelRef.current) {
          e.preventDefault();
          pushToHistory(simState);
          
          if (hasMultiple) {
            if (controlPanelRef.current.removeObjects) {
              controlPanelRef.current.removeObjects(targetIds);
            } else {
              targetIds.forEach(id => controlPanelRef.current.removeObject?.(id));
            }
            setSelectedObjectIds([]);
            setSelectedObjectId(null);
            showToast('ลบวัตถุทั้งหมดแล้ว');
          } else if (targetId) {
            controlPanelRef.current.removeObject?.(targetId);
            setSelectedObjectId(null);
            showToast('ลบวัตถุที่เลือกแล้ว');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSpacebar, 
    undoRef, 
    redoRef, 
    selectedObjectId, 
    selectedObjectIds, 
    setSelectedObjectId, 
    setSelectedObjectIds, 
    pushToHistory, 
    simState, 
    showToast,
    controlPanelRef
  ]);
};
