import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getSimulationTemplate } from "../simulations/SimulationRegistry.js";

export default function useSimulations(myUserId) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(() => localStorage.getItem('activeSimId') || null);
  const [messages, setMessages] = useState([]);
  const [apiError, setApiError] = useState(null);
  
  const isInitialLoad = useRef(true);
  const abortControllerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const physicsSaveTimeoutRef = useRef(null);

  // Sync activeSimId to localStorage
  useEffect(() => {
    if (activeSimId) {
      localStorage.setItem('activeSimId', activeSimId);
    } else {
      localStorage.removeItem('activeSimId');
    }
  }, [activeSimId]);

  // Handle New Simulation
  const handleNewSimulation = useCallback(() => {
    setActiveSimId(null);
    setMessages([]);
  }, []);

  // Fetch History (Simplified: Only simulations)
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (!myUserId) return;
      
      console.log(`%c🔄 fetchData TRIGGERED at: ${new Date().getTime()}`, "color: #3b82f6; font-weight: bold;");
      
      if (!myUserId.startsWith("guest_")) {
        try {
          console.log("📡 Fetching history from API...");
          const res = await fetch(`/api/history/${myUserId}`, { signal: controller.signal });
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const apiHistory = await res.json();

          if (!Array.isArray(apiHistory)) {
            console.warn("❌ API returned non-array:", apiHistory);
            return;
          }

          console.log(`📊 Data received. Raw Length: ${apiHistory.length}`);

          // 🛡️ Advanced Deduplication: ID + Content-based check
          const seenIds = new Set();
          const seenContents = new Set(); 
          
          const formattedSimulations = apiHistory
            .map((item) => {
              const id = (item?.id || item?._id || "").toString();
              if (!id || seenIds.has(id)) return null;

              const timestampGroup = Math.floor(new Date(item.createdAt?._seconds ? item.createdAt._seconds * 1000 : item.createdAt).getTime() / 5000);
              const contentKey = `${item.title}-${timestampGroup}`;
              
              if (seenContents.has(contentKey)) {
                console.warn(`🛡️ Defensive Filter: Ignored redundant entry: "${item.title}" (ID: ${id})`);
                return null;
              }

              seenIds.add(id);
              seenContents.add(contentKey);

              const simType = item?.type || item?.topic_type || 'free_fall';
              let parsedData = null;
              try {
                if (item?.data?.objects) {
                  parsedData = item.data; 
                } else {
                  const template = getSimulationTemplate(simType);
                  const rawVariables = item?.calculated_variables || item?.data?.variables || {};
                  parsedData = {
                    simulationType: simType,
                    ...(template?.parseData(rawVariables) ?? {})
                  };
                }
              } catch (parseErr) {
                return null;
              }

              return {
                id,
                title: item?.title || "แบบจำลองของฉัน",
                userId: item?.userId,
                createdAt: item?.createdAt?._seconds ? new Date(item.createdAt._seconds * 1000) : new Date(item?.createdAt || Date.now()),
                data: parsedData,
                physicsState: item?.physicsState || null,
                controlState: item?.controlState || null
              };
            })
            .filter(Boolean);

          formattedSimulations.sort((a, b) => b.createdAt - a.createdAt);
          
          console.log(`✅ setSimulations CALLED with ${formattedSimulations.length} unique items`);
          
          setSimulations(formattedSimulations);
          isInitialLoad.current = false;
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log("⏹️ Fetch aborted by cleanup");
            return;
          }
          console.error("❌ History fetch error:", err);
        } finally {
          setIsHistoryLoading(false);
        }
      } else {
        setIsHistoryLoading(false);
      }
    };

    fetchData();
    return () => {
      console.log("🧹 Cleaning up fetchData effect...");
      controller.abort();
    };
  }, [myUserId]);

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
  }, [activeSimId, myUserId, isLoading]);

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
  }, [activeSimId, myUserId, isLoading]);

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
      const res = await fetch(`/api/generate-simulation`, {
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

  const handleSelectSimulation = useCallback((id) => {
    setActiveSimId(id);
    const selected = simulations.find(s => s.id === id);
    // Note: isInteracting check will be done in App.jsx
  }, [simulations]);

  const handleDeleteSimulation = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, "simulations", id.toString()));
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      if (activeSimId === id) handleNewSimulation();
    } catch (err) {
      console.error("ลบข้อมูลไม่สำเร็จ:", err);
    }
  }, [activeSimId, handleNewSimulation]);

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
  }, []);

  const handleShareSimulation = useCallback((id) => {
    const sim = simulations.find((s) => s.id === id);
    if (!sim) return;
    const shareText = `SimuLearn — ${sim.title}\n${window.location.origin}/?sim=${sim.id}`;
    navigator.clipboard.writeText(shareText).then(() => alert("ก๊อปปี้ลิงก์แล้ว!"));
  }, [simulations]);

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsLoading(false);
    setApiError(null);
    handleNewSimulation();
  }, [handleNewSimulation]);

  return {
    simulations,
    activeSimId,
    isLoading,
    isHistoryLoading,
    messages,
    apiError,
    setApiError,
    handleSend,
    handleNewSimulation,
    handleSelectSimulation,
    handleDeleteSimulation,
    handleRenameSimulation,
    handleShareSimulation,
    handleSaveControlState,
    handleSavePhysicsState,
    handleCancelGeneration
  };
}
