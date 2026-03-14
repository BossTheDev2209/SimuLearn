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

  const [followedObjectId, setFollowedObjectId] = useState(null);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [rulerPoints, setRulerPoints] = useState([]);
  const [isFollowMenuOpen, setIsFollowMenuOpen] = useState(false);

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
      return;
    }

    const isTogglingOff = activeTool === toolId;
    const nextTool = isTogglingOff ? 'cursor' : toolId;

    if (toolId === 'focus' && !isTogglingOff) {
      const isOpening = !isFollowMenuOpen;
      setActiveTool('focus');
      setIsFollowMenuOpen(isOpening);
    } else {
      setActiveTool(nextTool);
      setIsFollowMenuOpen(false);
      if (nextTool !== 'cursor') setSelectedObjectId(null);
      if (nextTool !== 'ruler') setRulerPoints([]);
    }
  }, [activeTool, isFollowMenuOpen]);

  return {
    activeTool, setActiveTool,
    vectorEditor, setVectorEditor,
    isToolbarOpen, setIsToolbarOpen,
    isClearModalOpen, setIsClearModalOpen,
    spawnToast, setSpawnToast,
    spawnConfig, setSpawnConfig,
    followedObjectId, setFollowedObjectId,
    selectedObjectId, setSelectedObjectId,
    rulerPoints, setRulerPoints,
    isFollowMenuOpen, setIsFollowMenuOpen,
    showToast,
    handleToolClick
  };
};