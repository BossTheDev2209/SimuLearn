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

  const saveTimeoutRef = useRef(null);

  const handleSaveControlState = useCallback((state) => {
    if (!activeSimId) return;
    // Update local state so it doesn't wait for Firestore
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
       }, isMoving ? 100 : 2000); // 100ms delay state-only if moving, else 2s save-to-firebase
    }
  }, [activeSimId, myUserId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!myUserId) return;
      
      // Fetch History
      try {
        const q = query(
          collection(db, "simulations"), 
          where("userId", "==", myUserId),
          orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setSimulations(docs);
      } catch (err) {
        console.error("โหลดประวัติไม่ขึ้น", err);
      }

      // Fetch Preferences
      if (!myUserId.startsWith("guest_")) {
        try {
          const docRef = doc(db, "users", myUserId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().settings) {
            setUserPreferences(docSnap.data().settings);
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
    // Apply theme changes to document whenever userPreferences changes, 
    // ensuring it works across different accounts rather than relying on local storage.
    if (userPreferences?.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#37353E';
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
      try {
        await setDoc(doc(db, "users", myUserId), {
          settings: newSettings,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("บันทึกการตั้งค่าไม่สำเร็จ", err);
      }
    } else {
      localStorage.setItem("theme", newTheme);
      localStorage.setItem("lang", newLang);
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

    try {
      const res = await fetch(`https://simulearn-backend.onrender.com/api/generate-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: text, 
          userId: myUserId
        }),
      });
      const data = await res.json();
      
      await setDoc(doc(db, "simulations", newSimId), {
        title: text,
        userId: myUserId,
        data: data,
        createdAt: serverTimestamp()
      });

      setSimulations((prev) =>
        prev.map((s) => (s.id === newSimId ? { ...s, data } : s))
      );
    } catch (err) {
      console.error("ยิง API ไม่ติดครับบอส:", err);
      alert("เซิร์ฟเวอร์หลังบ้านบอสยังไม่ได้เปิดหรือเปล่าครับ?");
    } finally {
      setIsLoading(false);
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

  if (!myUserId) {
    return <LoginPage />;
  }

  return (
    <div className={`app-container relative flex w-full h-screen font-chakra overflow-hidden ${userPreferences?.theme === 'dark' ? 'dark bg-[#1E1F22] text-[#DBDEE1]' : 'bg-[#313338] text-[#DBDEE1]'}`}>
      
      {isLoading && <LoadingSimulation />}

      <Sidebar
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

      <div className="flex-1 relative w-full h-full flex flex-col">
        <PhysicsBoard 
          key={activeSim?.id || 'empty'}
          activeSim={activeSim} 
          isInteracting={isInteracting} 
          onSaveControlState={handleSaveControlState} 
          onSavePhysicsState={handleSavePhysicsState}
        />
        
        {(!activeSim || !activeSim.data) && (
          <ChatArea
            messages={messages}
            onSendMessage={handleSend}
            setIsInteracting={setIsInteracting}
          />
        )}
      </div>
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
