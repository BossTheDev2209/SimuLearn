import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase'; 
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import LoadingSimulation from './components/LoadingSimulation';
import Sidebar from './components/Sidebar';
import PhysicsBoard from './components/PhysicsBoard';
import ChatArea from './components/ChatArea';
import SearchModal from './components/SearchModal';
import SettingsModal from './components/SettingsModal';
import LoginPage from './LoginPage';

function App() {
  const myUserId = localStorage.getItem("currentUserId");
  const myUserName = localStorage.getItem("currentUserName") || "User";

  const [isLoading, setIsLoading] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(null);
  const [userPreferences, setUserPreferences] = useState({ theme: 'light', lang: 'th' });

  // 🛡️ Guard กันดึงข้อมูลซ้ำซ้อน (ต้นเหตุของลูปนรก)
  const hasFetchedRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const physicsSaveTimeoutRef = useRef(null);

  // 1. 🟢 ระบบดึงประวัติ (ปรับให้ดึงครั้งเดียวและรองรับ Mapping ข้อมูล)
  useEffect(() => {
    const fetchData = async () => {
      if (!myUserId || hasFetchedRef.current) return;
      
      try {
        // ดึงผ่าน Backend API เพื่อความเสถียร (หรือจะใช้ Firestore Query เดิมของบอสก็ได้แต่ต้องระวัง Index)
        const res = await fetch(`https://simulearn-backend.onrender.com/api/history/${myUserId}`);
        if (res.ok) {
          const data = await res.json();
          const formattedData = data.map(item => ({
            id: item.id,
            title: item.title || item.original_prompt, // รองรับทั้งสองชื่อ
            createdAt: item.createdAt || item.timestamp,
            data: item.data || { 
              type: item.topic_type, 
              variables: item.calculated_variables, 
              description: item.ai_description 
            },
            physicsState: item.physicsState || null,
            controlState: item.controlState || null
          }));
          setSimulations(formattedData);
          hasFetchedRef.current = true;
        }

        // Fetch Preferences (DarkMode)
        if (!myUserId.startsWith("guest_")) {
          const docSnap = await getDoc(doc(db, "users", myUserId));
          if (docSnap.exists() && docSnap.data().settings) {
            setUserPreferences(docSnap.data().settings);
          }
        }
      } catch (err) {
        console.error("โหลดประวัติไม่ขึ้น", err);
      }
    };
    fetchData();
  }, [myUserId]);

  // 2. 🟡 ระบบ Save Physics (Manual Save เฉพาะตอนสั่ง หรือ Debounce ตอนหยุดนิ่ง)
  const handleSavePhysicsState = useCallback((physicsState, immediate = false, isMoving = false) => {
    if (!activeSimId) return;

    // อัปเดต UI หน้าบ้านเสมอเพื่อให้ลื่นไหล
    setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, physicsState } : s));

    if (physicsSaveTimeoutRef.current) clearTimeout(physicsSaveTimeoutRef.current);

    // เซฟลง Firebase เฉพาะตอนหยุดนิ่ง หรือ สั่งเซฟด่วน (เช่น ตอนกดปล่อยวัตถุ)
    if (myUserId && !myUserId.startsWith("guest_") && !isMoving) {
      physicsSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await setDoc(doc(db, "simulations", activeSimId.toString()), { physicsState }, { merge: true });
          console.log("💾 บันทึกตำแหน่งสำเร็จ");
        } catch (err) { console.error("Save physics error:", err); }
      }, immediate ? 0 : 2000); 
    }
  }, [activeSimId, myUserId]);

  const handleSaveControlState = useCallback((state) => {
    if (!activeSimId) return;
    setSimulations(prev => prev.map(s => s.id === activeSimId ? { ...s, controlState: state } : s));

    if (myUserId && !myUserId.startsWith("guest_")) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
          try {
            await setDoc(doc(db, "simulations", activeSimId.toString()), { controlState: state }, { merge: true });
          } catch (err) { console.error("Save state error:", err); }
      }, 1000);
    }
  }, [activeSimId, myUserId]);

  // 3. 🔵 ระบบส่งโจทย์
  const handleSend = async (text) => {
    const newSimId = Date.now().toString(); 
    const newSim = { id: newSimId, title: text, createdAt: new Date(), data: null, userId: myUserId };
    
    setSimulations((prev) => [newSim, ...prev]);
    setActiveSimId(newSimId);
    setIsLoading(true);
    setMessages((prev) => [...prev, { sender: 'user', text }]);

    try {
      const res = await fetch(`https://simulearn-backend.onrender.com/api/generate-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, userId: myUserId }),
      });
      const data = await res.json();
      
      // อัปเดต UI
      setSimulations((prev) =>
        prev.map((s) => (s.id === newSimId ? { ...s, data } : s))
      );
      setIsInteracting(true);
    } catch (err) {
      alert("เซิร์ฟเวอร์หลังบ้านบอสยังไม่ได้เปิดหรือเปล่าครับ?");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ส่วนจัดการ Theme และ UI (คงเดิมตามฉบับของบอส) ---
  useEffect(() => {
    if (userPreferences?.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1E1F22';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#313338';
    }
  }, [userPreferences?.theme]);

  const handleSaveSettings = async (newTheme, newLang) => {
    const newSettings = { theme: newTheme, lang: newLang };
    setUserPreferences(newSettings);
    setIsSettingsOpen(false);
    if (myUserId && !myUserId.startsWith("guest_")) {
      await setDoc(doc(db, "users", myUserId), { settings: newSettings, updatedAt: serverTimestamp() }, { merge: true });
    }
  };

  const handleLogout = useCallback(() => { localStorage.clear(); window.location.href = "/"; }, []);
  const handleNewSimulation = useCallback(() => { setActiveSimId(null); setMessages([]); setIsInteracting(false); }, []);
  
  const handleSelectSimulation = useCallback((id) => {
    setActiveSimId(id);
    setIsSearchOpen(false);
    const selected = simulations.find(s => s.id === id);
    if (selected && selected.data) setIsInteracting(true);
  }, [simulations]);

  const handleDeleteSimulation = useCallback(async (id) => {
    await deleteDoc(doc(db, "simulations", id.toString()));
    setSimulations((prev) => prev.filter((s) => s.id !== id));
    if (activeSimId === id) handleNewSimulation();
  }, [activeSimId, handleNewSimulation]);

  const handleRenameSimulation = useCallback(async (id, newTitle) => {
    if (!newTitle.trim()) return;
    await updateDoc(doc(db, "simulations", id.toString()), { title: newTitle.trim() });
    setSimulations(p => p.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
  }, []);

  if (!myUserId) return <LoginPage />;
  const activeSim = simulations.find((s) => s.id === activeSimId) || null;

  return (
    <div className={`app-container relative flex w-full h-screen font-chakra overflow-hidden ${userPreferences?.theme === 'dark' ? 'dark text-[#DBDEE1]' : 'text-[#DBDEE1]'}`}>
      {isLoading && <LoadingSimulation />}
      <Sidebar
        simulations={simulations} activeSimId={activeSimId} userName={myUserName}      
        onLogout={handleLogout} onNewSimulation={handleNewSimulation}
        onSelectSimulation={handleSelectSimulation} onDeleteSimulation={handleDeleteSimulation}
        onRenameSimulation={handleRenameSimulation} onSearchClick={() => setIsSearchOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)} onHomeClick={handleNewSimulation}
      />
      <div className="flex-1 relative w-full h-full flex flex-col">
        <PhysicsBoard 
          key={activeSim?.id || 'empty'}
          activeSim={activeSim} 
          isInteracting={isInteracting} 
          onSaveControlState={handleSaveControlState} 
          onSavePhysicsState={handleSavePhysicsState}
        />
        {(!activeSim || !activeSim.data) && (
          <ChatArea messages={messages} onSendMessage={handleSend} setIsInteracting={setIsInteracting} />
        )}
      </div>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} simulations={simulations} onNewSimulation={handleNewSimulation} onSelectSimulation={handleSelectSimulation} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} userPreferences={userPreferences} onSave={handleSaveSettings} />
    </div>
  );
}

export default App;