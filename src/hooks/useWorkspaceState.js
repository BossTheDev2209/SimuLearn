import { useState, useCallback } from 'react';

export const useWorkspaceState = () => {
  const [activeTool, setActiveTool] = useState('cursor');
  const [vectorEditor, setVectorEditor] = useState(null);
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [spawnToast, setSpawnToast] = useState(null);
  const [spawnConfig, setSpawnConfig] = useState({
    shape: 'circle',
    size: 1,
    color: '#FFB65A',
    mass: 1,
    restitution: 0.5
  });

  const showToast = useCallback((message) => {
    const id = Date.now();
    setSpawnToast({ id, message });
    setTimeout(() => {
      setSpawnToast(prev => prev?.id === id ? null : prev);
    }, 2500);
  }, []);

  const handleToolClick = useCallback((toolId) => {
    if (toolId === 'clearAll') {
      setIsClearModalOpen(true);
    } else {
      setActiveTool(toolId);
    }
  }, []);

  return {
    activeTool, setActiveTool,
    vectorEditor, setVectorEditor,
    isToolbarOpen, setIsToolbarOpen,
    isClearModalOpen, setIsClearModalOpen,
    spawnToast, setSpawnToast,
    spawnConfig, setSpawnConfig,
    showToast,
    handleToolClick
  };
};