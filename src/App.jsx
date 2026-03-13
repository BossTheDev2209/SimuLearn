import { useState, useEffect, useCallback } from 'react';
import { db, auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import LoadingSimulation from './components/LoadingSimulation';
import Sidebar from './components/Sidebar';
import SimulationWorkspace from './components/SimulationWorkspace/SimulationWorkspace.jsx';
import ChatArea from './components/ChatArea';
import SearchModal from './components/SearchModal';
import SettingsModal from './components/SettingsModal';
import LoginPage from './LoginPage';
import useSimulations from './hooks/useSimulations';

function App() {
  const myUserId = localStorage.getItem("currentUserId");
  const myUserName = localStorage.getItem("currentUserName") || "User";

  // UI-Specific States
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState({ 
    theme: localStorage.getItem('theme') || 'system', 
    lang: 'th' 
  });

  // Simulation Hook
  const {
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
  } = useSimulations(myUserId);

  const activeSim = simulations.find((s) => s.id === activeSimId) || null;

  // Sync Preferences from Firestore
  useEffect(() => {
    if (!myUserId || myUserId.startsWith("guest_")) return;
    
    const fetchPrefs = async () => {
      try {
        const docRef = doc(db, "users", myUserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().settings) {
          setUserPreferences(docSnap.data().settings);
        }
      } catch(e) {
        console.error("Error fetching preferences:", e);
      }
    };
    fetchPrefs();
  }, [myUserId]);

  // Theme Engine
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = userPreferences?.theme || 'light';

    const applyTheme = (isDark) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
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

  const onSelectSim = (id) => {
    handleSelectSimulation(id);
    setIsSearchOpen(false);
    const selected = simulations.find(s => s.id === id);
    if (selected && selected.data) setIsInteracting(true);
  };

  const onNewSim = () => {
    handleNewSimulation();
    setIsInteracting(false);
  };

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
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("currentUserId", "guest_" + Date.now());
    localStorage.setItem("currentUserName", "Guest User");
    window.location.reload();
  };

  if (!myUserId) {
    return <LoginPage onGoogleLogin={handleGoogleLogin} onGuestLogin={handleGuestLogin} />;
  }

  return (
    <div className="app-container relative flex w-full h-screen font-chakra overflow-hidden bg-[#F2F3F5] text-gray-900 dark:bg-[#1E1F22] dark:text-[#DBDEE1] transition-colors duration-300">
      
      {(isLoading || apiError) && (
        <LoadingSimulation 
          error={apiError}
          onCancel={handleCancelGeneration} 
        />
      )}

      <Sidebar
        isHistoryLoading={isHistoryLoading}
        simulations={simulations}
        activeSimId={activeSimId}
        userName={myUserName}
        onLogout={handleLogout}
        onNewSimulation={onNewSim}
        onSelectSimulation={onSelectSim}
        onDeleteSimulation={handleDeleteSimulation}
        onRenameSimulation={handleRenameSimulation}
        onShareSimulation={handleShareSimulation}
        onSearchClick={handleOpenSearch}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onHomeClick={onNewSim}
      />

      <div className="flex-1 relative w-full h-full">
        <div className="absolute inset-0 z-0">
          <SimulationWorkspace
            key={activeSim?.id || 'empty'}
            activeSim={activeSim}
            isInteracting={isInteracting}
            onSaveControlState={handleSaveControlState}
            onSavePhysicsState={handleSavePhysicsState}
          />
        </div>
        
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

      <SearchModal
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        simulations={simulations}
        onNewSimulation={() => { handleCloseSearch(); onNewSim(); }}
        onSelectSimulation={onSelectSim}
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