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
    const fetchData = async () => {
      if (!myUserId) return;
      if (!myUserId.startsWith("guest_")) {
        try {
          const res = await fetch(`/api/history/${myUserId}`);
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          const apiHistory = await res.json();

          if (!Array.isArray(apiHistory)) {
            console.warn("API ไม่ได้ส่ง Array กลับมา:", apiHistory);
            return;
          }

          // 🌟 Deduplicate by ID to prevent UI glitches (double items)
          const uniqueItems = [];
          const seenIds = new Set();
          apiHistory.forEach(item => {
            const id = (item?.id || item?._id || "").toString();
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              uniqueItems.push(item);
            }
          });

          const formattedSimulations = uniqueItems.map((item) => {
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
                  ai_description: item?.ai_description || item?.data?.description || "",
                  ...(template?.parseData(rawVariables) ?? {})
                };
              }
            } catch (parseErr) {
              console.warn("parse item failed, skipping data:", item?.id || item?._id, parseErr);
              parsedData = null;
            }

            return {
              id: item?.id || item?._id,
              title: item?.title || "แบบจำลองของฉัน",
              userId: item?.userId,
              createdAt: item?.createdAt?._seconds ? new Date(item.createdAt._seconds * 1000) : new Date(item?.createdAt || Date.now()),
              data: parsedData,
              physicsState: item?.physicsState || null,
              controlState: item?.controlState || null
            };
          });

          formattedSimulations.sort((a, b) => b.createdAt - a.createdAt);
          
          // 🌟 Replace entire list with sorted, unique ones to prevent duplicates upon refresh
          setSimulations(formattedSimulations);
        } catch (err) {
          console.error("โหลดประวัติจาก API ไม่ขึ้น:", err);
          // 🌟 สำหรับ History เราจะไม่บล็อกหน้าจอ (ไม่ setApiError) 
          // เพื่อให้ User ยังเข้าหน้าหลักได้ แม้เซิร์ฟเวอร์จะยังไม่ตื่น
        } finally {
          setIsHistoryLoading(false); //
        }

        // Fetch Preferences
        try {
          const docRef = doc(db, "users", myUserId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().settings) {
            const cloudSettings = docSnap.data().settings;
            setUserPreferences(cloudSettings);
            
            if (cloudSettings.theme) localStorage.setItem("theme", cloudSettings.theme);
            if (cloudSettings.lang) localStorage.setItem("lang", cloudSettings.lang);
          }
        } catch(e) { console.error("โหลดการตั้งค่าไม่ขึ้น", e) }
      } else {
        const localTheme = localStorage.getItem("theme") || 'light';
        const localLang = localStorage.getItem("lang") || 'th';
        setUserPreferences({ theme: localTheme, lang: localLang });
      }
    };

    fetchData();
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
    const newSimId = Date.now().toString();
    const newSim = {
      id: newSimId,
      title: text,
      createdAt: new Date(),
      data: null,
      userId: myUserId
    };

    setSimulations((prev) => [newSim, ...prev]);
    setActiveSimId(newSimId);
    setIsLoading(true);
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
      console.log("DEBUG: Backend Response Data ->", apiData); // 🌟 เพิ่มบรรทัดนี้ให้คุณดูใน Console

      const simType = apiData.type || apiData.topic_type || 'free_fall';
      const template = getSimulationTemplate(simType);
      
      // ดึงค่า vx, vy จากทุกแหล่งที่อาจจะมีได้ (Root, variables, calculated_variables)
      const getVal = (paths, fallback = 0) => {
        for (const p of paths) if (p !== undefined && p !== null) return p;
        return fallback;
      };

      const rawVariables = {
        ...(apiData.variables || {}),
        ...(apiData.calculated_variables || {}),
        // Harvesting from root as well
        mass: getVal([apiData.mass, apiData.variables?.mass, apiData.calculated_variables?.mass], 1),
        height: getVal([apiData.height, apiData.variables?.height, apiData.calculated_variables?.height, apiData.h_start, apiData.variables?.h_start], 10),
        gravity: getVal([apiData.gravity, apiData.variables?.gravity], 9.8),
        vx: getVal([
          apiData.vx, 
          apiData.variables?.vx, 
          apiData.calculated_variables?.vx, 
          apiData.variables?.v0_x,
          apiData.v0_x
        ], 0),
        vy: getVal([
          apiData.vy, 
          apiData.variables?.vy, 
          apiData.calculated_variables?.vy, 
          apiData.variables?.v0_y,
          apiData.v0_y
        ], 0)
      };

      const formattedData = {
        simulationType: simType,
        ai_description: apiData.description || apiData.ai_description,
        ...template.parseData(rawVariables)
      };

      const finalId = apiData.id ? apiData.id.toString() : newSimId;

      if (!apiData.id) {
         // Backend did not save to DB, so Frontend handles it
         await setDoc(doc(db, "simulations", finalId), {
           title: text,
           userId: myUserId,
           data: formattedData,
           createdAt: serverTimestamp()
         });
      }

      setSimulations((prev) => {
         const filtered = prev.filter(s => s.id !== newSimId);
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
      if (err.name === 'AbortError') {
        console.log('Simulation generation cancelled by user');
        return;
      }
      console.error("ยิง API ไม่ติด:", err);
      if (err.message.includes("521") || err.name === "SyntaxError" || err.message.includes("Failed to fetch")) {
        setApiError("521");
      } else {
        alert("เซิร์ฟเวอร์เปิดหรือยัง? หรืออาจเกิดข้อผิดพลาดในการสร้างแบบจำลองครับ");
      }
    } finally {
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