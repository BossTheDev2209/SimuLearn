import { useCallback } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getSimulationTemplate } from "../../simulations/SimulationRegistry.js";

export function useSimulationGenerator({
  myUserId,
  isLoading,
  setIsLoading,
  setSimulations,
  setActiveSimId,
  setMessages,
  abortControllerRef,
  setApiError
}) {
  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    const tempId = crypto.randomUUID(); 
    console.log(`🆕 Creating NEW simulation. UUID: ${tempId}`);
    
    const optimisticSim = {
      id: tempId,
      title: text,
      createdAt: new Date(),
      data: null,
      userId: myUserId
    };

    setSimulations((prev) => [optimisticSim, ...prev]);
    setActiveSimId(tempId);
    setMessages((prev) => [...prev, { sender: 'user', text }]);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`https://simulearn-backend.onrender.com/api/generate-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, userId: myUserId }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const apiData = await res.json();     

      const simType = apiData.type || apiData.topic_type || 'free_fall';
      const template = getSimulationTemplate(simType);
      
      const getVal = (paths, fallback = 0) => {
        for (const p of paths) if (p !== undefined && p !== null) return p;
        return fallback;
      };

      const rawVariables = {
        ...(apiData.variables || {}),
        ...(apiData.calculated_variables || {}),
        mass: getVal([apiData.mass, apiData.variables?.mass, apiData.calculated_variables?.mass], 1),
        height: getVal([apiData.height, apiData.variables?.height, apiData.calculated_variables?.height, apiData.h_start, apiData.variables?.h_start], 10),
        gravity: getVal([apiData.gravity, apiData.variables?.gravity], 9.8),
        vx: getVal([apiData.vx, apiData.variables?.vx, apiData.calculated_variables?.vx, apiData.variables?.v0_x, apiData.v0_x], 0),
        vy: getVal([apiData.vy, apiData.variables?.vy, apiData.calculated_variables?.vy, apiData.variables?.v0_y, apiData.v0_y], 0)
      };

      const formattedData = {
        simulationType: simType,
        ai_description: apiData.description || apiData.ai_description,
        ...template.parseData(rawVariables)
      };

      const finalId = (apiData.id || apiData._id || tempId).toString();

      if (!apiData.id && !myUserId.startsWith("guest_")) {
          console.log(`💾 Persisting simulation to Firestore. FinalId: ${finalId}`);
          await setDoc(doc(db, "simulations", finalId), {
            title: apiData.title || text,
            userId: myUserId,
            data: formattedData,
            createdAt: serverTimestamp()
          }, { merge: true });
      }

      setSimulations((prev) => {
          const filtered = prev.filter(s => s.id !== tempId && s.id !== finalId);
          return [
            { 
                id: finalId, 
                title: apiData.title || text, 
                userId: myUserId, 
                data: formattedData, 
                createdAt: new Date() 
            },
            ...filtered
          ];
      });
      setActiveSimId(finalId);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error("API Error:", err);
      setSimulations(prev => prev.filter(s => s.id !== tempId));
      if (err.message.includes("521") || err.name === "SyntaxError") {
        setApiError("521");
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างแบบจำลองครับ");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, [abortControllerRef, setIsLoading]);

  return { handleSend, handleCancelGeneration };
}
