import { useState, useEffect, useCallback } from 'react';
import LoadingSimulation from './components/LoadingSimulation';
import Sidebar from './components/Sidebar';
import SimulationWorkspace from './features/workspace/SimulationWorkspace.jsx';
import ChatArea from './components/ChatArea';
import SearchModal from './components/SearchModal';
import SettingsModal from './components/SettingsModal';
import LoginPage from './LoginPage';
import useSimulations from './hooks/useSimulations';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppTheme } from './hooks/useAppTheme';

function App() {
  const myUserId = localStorage.getItem("currentUserId");
  const myUserName = localStorage.getItem("currentUserName") || "User";

  // UI-Specific States
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Custom Hooks
  const { handleGoogleLogin, handleEmailLogin, handleEmailSignup, handleGuestLogin, handleLogout } = useAppAuth();
  const { userPreferences, handleSaveSettings: savePreferences } = useAppTheme(myUserId);

  const handleSaveSettings = (newTheme, newLang) => {
    savePreferences(newTheme, newLang);
    setIsSettingsOpen(false);
  };

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

  if (!myUserId) {
    return (
      <LoginPage 
        onGoogleLogin={handleGoogleLogin} 
        onEmailLogin={handleEmailLogin} 
        onEmailSignup={handleEmailSignup}
        onGuestLogin={handleGuestLogin} 
      />
    );
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