import { useGridInteraction } from './useGridInteraction';
import { useControlPanelActions } from './useControlPanelActions';

export const useSimulationLogic = ({
  simState,
  setSimState,
  controlPanelRef,
  matterCanvasRef,
  bodiesRef,
  pushToHistory,
  showToast,
  spawnConfig,
  setIsClearModalOpen,
  setIsFollowMenuOpen, // 🌟 เพิ่มเข้ามา
  activeTool,
  selectedObjectId,
  setSelectedObjectId,
  selectedObjectIds,
  setSelectedObjectIds,
  followedObjectId,
  setFollowedObjectId,
  rulerPoints,
  setRulerPoints,
  handleTeleport
}) => {

  const {
    handleGridClick,
    handleGridRightClick,
    handleGridDoubleClick
  } = useGridInteraction({
    simState,
    setSimState,
    activeTool,
    spawnConfig,
    bodiesRef,
    controlPanelRef,
    matterCanvasRef,
    pushToHistory,
    showToast,
    selectedObjectId,
    setSelectedObjectId,
    selectedObjectIds,
    setSelectedObjectIds,
    followedObjectId,
    setFollowedObjectId,
    setIsFollowMenuOpen,
    rulerPoints,
    setRulerPoints,
    handleTeleport
  });

  const {
    handleControlUpdate,
    updateVectorValue,
    handleClearAllConfirm,
    onBeforeObjectUpdate
  } = useControlPanelActions({
    simState,
    setSimState,
    controlPanelRef,
    bodiesRef,
    matterCanvasRef,
    pushToHistory,
    showToast,
    setIsClearModalOpen
  });

  return {
    handleControlUpdate,
    updateVectorValue,
    handleClearAllConfirm,
    handleGridClick,
    handleGridRightClick,
    handleGridDoubleClick,
    onBeforeObjectUpdate
  };
};
