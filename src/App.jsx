import { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getSimulationTemplate } from "./simulations/SimulationRegistry.js";
import LoadingSimulation from './components/LoadingSimulation';
import Sidebar from './components/Sidebar';
import SimulationWorkspace from './components/SimulationWorkspace/SimulationWorkspace.jsx';
import ChatArea from './components/ChatArea';
import SearchModal from './components/SearchModal';
import SettingsModal from './components/SettingsModal';
import LoginPage from './LoginPage';

function App() {
  const myUserId = localStorage.getItem("currentUserId");
  const myUserName = localStorage.getItem("currentUserName") || "User";

  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [messages, setMessages] = useState([]);
  const abortControllerRef = useRef(null);

  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(() => localStorage.getItem('activeSimId') || null);
  const isInitialLoad = useRef(true); // 🌟 Guard for Strict Mode / Double mounting

  useEffect(() => {
    if (activeSimId) {
      localStorage.setItem('activeSimId', activeSimId);
    } else {
      localStorage.removeItem('activeSimId');
    }
  }, [activeSimId]);

  const [userPreferences, setUserPreferences] = useState({ 
    theme: localStorage.getItem('theme') || 'system', 
    lang: 'th' 
  });

  const saveTimeoutRef = useRef(null);

  const handleSaveControlState = useCallback((state) => {
    if (!activeSimId) return;
    setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, controlState: state } : s));

    if (myUserId && !myUserId.startsWith("guest_")) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await setDoc(doc(db, "simulations", activeSimId.toString()), { controlState: state }, { merge: true });
        } catch (err) {
          console.error("Save state error:", err);
        }
      }, 1000);
    }
  }, [activeSimId, myUserId]);

  const physicsSaveTimeoutRef = useRef(null);

  const handleSavePhysicsState = useCallback((physicsState, immediate = false, isMoving = false) => {
    if (!activeSimId) return;

    if (immediate) {
      setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, physicsState } : s));
      if (myUserId && !myUserId.startsWith("guest_") && !isMoving) {
        setDoc(doc(db, "simulations", activeSimId.toString()), { physicsState }, { merge: true }).catch(err => console.error("Save physics error:", err));
      }
    } else {
      if (physicsSaveTimeoutRef.current) clearTimeout(physicsSaveTimeoutRef.current);
      physicsSaveTimeoutRef.current = setTimeout(async () => {
        setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, physicsState } : s));
        if (myUserId && !myUserId.startsWith("guest_") && !isMoving) {
          try {
            await setDoc(doc(db, "simulations", activeSimId.toString()), { physicsState }, { merge: true });
          } catch (err) {
            console.error("Save physics error:", err);
          }
        }
      }, isMoving ? 100 : 2000); 
    }
  }, [activeSimId, myUserId]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (!myUserId) return;
      
      // 🌟 Guard: If this is an accidental double-hit in Strict Mode, abort early
      if (simulations.length > 0 && isInitialLoad.current === false) {
         console.log("⏩ Skipping fetchData: Data already exists and initial load is complete.");
         return;
      }

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

          console.log(`📊 Data received. Length: ${apiHistory.length}`);

          // 🌟 Robust Deduplication by ID (Deep Logging)
          const seenIds = new Set();
          const formattedSimulations = apiHistory
            .map((item) => {
              const id = (item?.id || item?._id || "").toString();
              if (!id) return null;
              
              if (seenIds.has(id)) {
                console.warn(`⚠️ DUPLICATE ID detected and filtered: ${id}`);
                return null;
              }
              seenIds.add(id);

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
          
          console.log("💾 Simulations before update:", simulations.length);
          console.log(`✅ setSimulations CALLED with ${formattedSimulations.length} unique items`);
          
          // 🌟 Atomic state replacement
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

        // Fetch Preferences
        try {
          const docRef = doc(db, "users", myUserId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().settings) {
            setUserPreferences(docSnap.data().settings);
          }
        } catch(e) { }
      } else {
        setIsHistoryLoading(false);
        const localTheme = localStorage.getItem("theme") || 'light';
        const localLang = localStorage.getItem("lang") || 'th';
        setUserPreferences({ theme: localTheme, lang: localLang });
      }
    };

    fetchData();
    return () => {
      console.log("🧹 Cleaning up fetchData effect...");
      controller.abort();
    };
  }, [myUserId]);

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = userPreferences?.theme || 'light';

    const applyTheme = (isDark) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        const localTheme = localStorage.getItem("theme") || 'system';
        const localLang = localStorage.getItem("lang") || 'th';
        setUserPreferences({ theme: localTheme, lang: localLang });
      }
    };

    if (currentTheme === 'system') {
      const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(systemQuery.matches);

      const handleSystemChange = (e) => applyTheme(e.matches);
      systemQuery.addEventListener('change', handleSystemChange);

      return () => systemQuery.removeEventListener('change', handleSystemChange);
    } else {
      applyTheme(currentTheme === 'dark');
    }
  }, [userPreferences?.theme]);

  const handleSaveSettings = async (newTheme, newLang) => {
    const newSettings = { theme: newTheme, lang: newLang };
    setUserPreferences(newSettings);
    setIsSettingsOpen(false);

    localStorage.setItem("theme", newTheme);
    localStorage.setItem("lang", newLang);

    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else if (newTheme === 'system') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isSystemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    window.dispatchEvent(new Event('storage'));

    if (myUserId && !myUserId.startsWith("guest_")) {
      try {
        await setDoc(doc(db, "users", myUserId), {
          settings: newSettings,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("บันทึกการตั้งค่าไม่สำเร็จ", err);
      }
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.clear();
    window.location.href = "/";
  }, []);

  const activeSim = simulations.find((s) => s.id === activeSimId) || null;

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;

    // 🌟 1. SET LOADING IMMEDIATELY
    setIsLoading(true);
    
    // 🌟 2. GENERATE STABLE UUID
    const newSimId = crypto.randomUUID();
    console.log(`🆕 Creating NEW simulation. UUID: ${newSimId}`);
    
    const newSim = {
      id: newSimId,
      title: text,
      createdAt: new Date(),
      data: null,
      userId: myUserId
    };

    // 🌟 3. OPTIMISTIC UI UPDATE WITH UUID
    setSimulations((prev) => [newSim, ...prev]);
    setActiveSimId(newSimId);
    setMessages((prev) => [...prev, { sender: 'user', text }]);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`/api/generate-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: text, 
          userId: myUserId
        }),
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

      // 🌟 4. FINAL ID (Prefer Backend ID if exists, otherwise keep stable UUID)
      const finalId = (apiData.id || apiData._id || newSimId).toString();

      if (!apiData.id && !myUserId.startsWith("guest_")) {
         // 🌟 5. IDEMPOTENT ATOMIC WRITE WITH SETDOC
         console.log(`💾 Persisting simulation to Firestore. FinalId: ${finalId}`);
         await setDoc(doc(db, "simulations", finalId), {
           title: apiData.title || text,
           userId: myUserId,
           data: formattedData,
           createdAt: serverTimestamp()
         }, { merge: true });
      }

      setSimulations((prev) => {
         const filtered = prev.filter(s => s.id !== newSimId && s.id !== finalId);
         return [
            { 
               id: finalId, 
               title: apiData.title || text, 
               userId: myUserId, 
               data: formattedData, 
               createdAt: apiData.createdAt ? new Date(apiData.createdAt) : new Date() 
            },
            ...filtered
         ];
      });
      setActiveSimId(finalId);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error("API Error:", err);
      // Remove the failed optimistic update
      setSimulations(prev => prev.filter(s => s.id !== newSimId));
      if (err.message.includes("521") || err.name === "SyntaxError") {
        setApiError("521");
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างแบบจำลองครับ");
      }
    } finally {
      // 🌟 6. ENSURE LOADING IS TURNED OFF
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewSimulation = useCallback(() => {
    setActiveSimId(null);
    setMessages([]);
    setIsInteracting(false);
  }, []);

  const handleSelectSimulation = useCallback((id) => {
    setActiveSimId(id);
    setIsSearchOpen(false);
    const selected = simulations.find(s => s.id === id);
    if (selected && selected.data) setIsInteracting(true);
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

  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      localStorage.setItem("currentUserId", user.uid);
      localStorage.setItem("currentUserName", user.displayName || "User");
      window.location.reload(); 
    } catch (error) {
      console.error("ล็อกอิน Google ไม่สำเร็จ:", error);
      alert("เกิดข้อผิดพลาดในการล็อกอินด้วย Google ครับ");
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("currentUserId", "guest_" + Date.now());
    localStorage.setItem("currentUserName", "Guest User");
    window.location.reload();
  };

  if (!myUserId) {
    return (
      <LoginPage 
        onGoogleLogin={handleGoogleLogin} 
        onGuestLogin={handleGuestLogin}
        onEmailLogin={() => alert("ระบบเข้าสู่ระบบด้วย Email กำลังพัฒนาครับ!")}
      />
    );
  }

  return (
    <div className="app-container relative flex w-full h-screen font-chakra overflow-hidden bg-[#F2F3F5] text-gray-900 dark:bg-[#1E1F22] dark:text-[#DBDEE1] transition-colors duration-300">
      
      {(isLoading || apiError) && (
        <LoadingSimulation 
          error={apiError}
          onCancel={() => { 
            if (abortControllerRef.current) abortControllerRef.current.abort();
            setIsLoading(false); 
            setApiError(null);
            handleNewSimulation(); 
          }} 
        />
      )}

      <Sidebar
        isHistoryLoading={isHistoryLoading}
        simulations={simulations}
        activeSimId={activeSimId}
        userName={myUserName}
        onLogout={handleLogout}
        onNewSimulation={handleNewSimulation}
        onSelectSimulation={handleSelectSimulation}
        onDeleteSimulation={handleDeleteSimulation}
        onRenameSimulation={handleRenameSimulation}
        onShareSimulation={handleShareSimulation}
        onSearchClick={handleOpenSearch}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onHomeClick={handleNewSimulation}
      />

      <div className="flex-1 relative w-full h-full">
        
        {/* Layer 0: logo*/}
        <div className="absolute inset-0 z-0">
          <SimulationWorkspace
            key={activeSim?.id || 'empty'}
            activeSim={activeSim}
            isInteracting={isInteracting}
            onSaveControlState={handleSaveControlState}
            onSavePhysicsState={handleSavePhysicsState}
          />
        </div>
        
        {/* Layer 1: chat*/}
        {(!activeSim || !activeSim.data) && (
          <div className={`absolute inset-0 z-10 flex flex-col pointer-events-none ${isLoading ? 'bg-white/40 dark:bg-black/40 backdrop-blur-[2px]' : ''}`}>
            <div className="flex-1 pointer-events-auto">
              <ChatArea
                messages={messages}
                onSendMessage={handleSend}
                setIsInteracting={setIsInteracting}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>

      {/*outer layer*/}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        simulations={simulations}
        onNewSimulation={() => { handleCloseSearch(); handleNewSimulation(); }}
        onSelectSimulation={handleSelectSimulation}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userPreferences={userPreferences}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;