import { useState, useEffect, useCallback } from 'react';
import LoadingSimulation from './components/LoadingSimulation';
import Sidebar from './components/Sidebar';
import PhysicsBoard from './components/PhysicsBoard';
import ChatArea from './components/ChatArea';
import SearchModal from './components/SearchModal';
import LoginPage from './LoginPage';

function App() {
  const myUserId = localStorage.getItem("currentUserId");
  const myUserName = localStorage.getItem("currentUserName") || "User";

  const [isLoading, setIsLoading] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  
  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.clear(); 
    window.location.href = "/";
  }, []);

  const activeSim = simulations.find((s) => s.id === activeSimId) || null;

  const handleSend = async (text) => {
    const newSim = {
      id: Date.now(),
      title: text,
      createdAt: new Date(),
      data: null,
    };
    
    setSimulations((prev) => [newSim, ...prev]);
    setActiveSimId(newSim.id);
    setIsLoading(true);
    setMessages((prev) => [...prev, { sender: 'user', text }]);

    try {
      const res = await fetch('http://localhost:5000/api/generate-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: text, 
          userId: myUserId
        }),
      });
      const data = await res.json();
      
      setSimulations((prev) =>
        prev.map((s) => (s.id === newSim.id ? { ...s, data } : s))
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
  }, []);

  const handleDeleteSimulation = useCallback((id) => {
    setSimulations((prev) => prev.filter((s) => s.id !== id));
    if (activeSimId === id) handleNewSimulation();
  }, [activeSimId, handleNewSimulation]);

  const handleRenameSimulation = useCallback((id, newTitle) => {
    if (!newTitle.trim()) return;
    setSimulations((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() } : s))
    );
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
    <div className="app-container relative flex w-full h-screen bg-[#FAF9F6] font-chakra text-gray-800 overflow-hidden">
      
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
        onHomeClick={handleNewSimulation}
      />

      <div className="flex-1 relative w-full h-full flex flex-col">
        <PhysicsBoard activeSim={activeSim} isInteracting={isInteracting} />
        
        {!activeSim && (
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
    </div>
  );
}

export default App;