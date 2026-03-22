import { useCallback } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

export function useSimulationSave({
  activeSimId,
  myUserId,
  isLoading,
  setSimulations,
  saveTimeoutRef,
  physicsSaveTimeoutRef
}) {
  const handleSaveControlState = useCallback((state) => {
    if (!activeSimId) return;
    setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, controlState: state } : s));

    if (myUserId && !myUserId.startsWith("guest_") && !isLoading) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          console.log(`💾 Auto-saving Control State for ID: ${activeSimId}`);
          await setDoc(doc(db, "simulations", activeSimId.toString()), { controlState: state }, { merge: true });
        } catch (err) {
          console.error("Save state error:", err);
        }
      }, 1000);
    }
  }, [activeSimId, myUserId, isLoading, setSimulations, saveTimeoutRef]);

  const handleSavePhysicsState = useCallback((physicsState, immediate = false, isMoving = false) => {
    if (!activeSimId) return;

    if (immediate) {
      setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, physicsState } : s));
      if (myUserId && !myUserId.startsWith("guest_") && !isMoving && !isLoading) {
        console.log(`💾 Immediate Save Physics for ID: ${activeSimId}`);
        setDoc(doc(db, "simulations", activeSimId.toString()), { physicsState }, { merge: true }).catch(err => console.error("Save physics error:", err));
      }
    } else {
      if (physicsSaveTimeoutRef.current) clearTimeout(physicsSaveTimeoutRef.current);
      physicsSaveTimeoutRef.current = setTimeout(async () => {
        setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, physicsState } : s));
        if (myUserId && !myUserId.startsWith("guest_") && !isMoving && !isLoading) {
          try {
            console.log(`💾 Delayed Save Physics for ID: ${activeSimId}`);
            await setDoc(doc(db, "simulations", activeSimId.toString()), { physicsState }, { merge: true });
          } catch (err) {
            console.error("Save physics error:", err);
          }
        }
      }, isMoving ? 100 : 2000); 
    }
  }, [activeSimId, myUserId, isLoading, setSimulations, physicsSaveTimeoutRef]);

  return { handleSaveControlState, handleSavePhysicsState };
}
