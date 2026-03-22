import { useCallback } from 'react';
import { db } from '../../firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';

export function useSimulationActions({
  simulations,
  setSimulations,
  activeSimId,
  setActiveSimId,
  handleNewSimulation
}) {
  const handleSelectSimulation = useCallback((id) => {
    setActiveSimId(id);
  }, [setActiveSimId, simulations]);

  const handleDeleteSimulation = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, "simulations", id.toString()));
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      if (activeSimId === id) handleNewSimulation();
    } catch (err) {
      console.error("ลบข้อมูลไม่สำเร็จ:", err);
    }
  }, [activeSimId, handleNewSimulation, setSimulations]);

  const handleRenameSimulation = useCallback(async (id, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await updateDoc(doc(db, "simulations", id.toString()), {
        title: newTitle.trim()
      });
      setSimulations((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s))
      );
    } catch (err) {
      console.error("เปลี่ยนชื่อไม่สำเร็จ:", err);
    }
  }, [setSimulations]);

  const handleShareSimulation = useCallback((id) => {
    const sim = simulations.find((s) => s.id === id);
    if (!sim) return;
    const shareText = `SimuLearn — ${sim.title}\n${window.location.origin}/?sim=${sim.id}`;
    navigator.clipboard.writeText(shareText).then(() => alert("ก๊อปปี้ลิงก์แล้ว!"));
  }, [simulations]);

  return {
    handleSelectSimulation,
    handleDeleteSimulation,
    handleRenameSimulation,
    handleShareSimulation
  };
}
