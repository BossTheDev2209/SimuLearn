import { useState, useEffect, useCallback, useRef } from 'react';
import { useSimulationHistoryFetch } from './simulations/useSimulationHistoryFetch';
import { useSimulationSave } from './simulations/useSimulationSave';
import { useSimulationGenerator } from './simulations/useSimulationGenerator';
import { useSimulationActions } from './simulations/useSimulationActions';

export default function useSimulations(myUserId) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [simulations, setSimulations] = useState([]);
  const [activeSimId, setActiveSimId] = useState(() => localStorage.getItem('activeSimId') || null);
  const [messages, setMessages] = useState([]);
  const [apiError, setApiError] = useState(null);
  
  const isInitialLoad = useRef(true);
  const abortControllerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const physicsSaveTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeSimId) {
      localStorage.setItem('activeSimId', activeSimId);
    } else {
      localStorage.removeItem('activeSimId');
    }
  }, [activeSimId]);

  const handleNewSimulation = useCallback(() => {
    setActiveSimId(null);
    setMessages([]);
  }, []);

  useSimulationHistoryFetch({
    myUserId,
    setSimulations,
    setIsHistoryLoading,
    isInitialLoad
  });

  const { handleSaveControlState, handleSavePhysicsState } = useSimulationSave({
    activeSimId,
    myUserId,
    isLoading,
    setSimulations,
    saveTimeoutRef,
    physicsSaveTimeoutRef
  });

  const { handleSend, handleCancelGeneration } = useSimulationGenerator({
    myUserId,
    isLoading,
    setIsLoading,
    setSimulations,
    setActiveSimId,
    setMessages,
    abortControllerRef,
    setApiError,
    handleNewSimulation
  });

  const {
    handleSelectSimulation,
    handleDeleteSimulation,
    handleRenameSimulation,
    handleShareSimulation
  } = useSimulationActions({
    simulations,
    setSimulations,
    activeSimId,
    setActiveSimId,
    handleNewSimulation
  });

  return {
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
  };
}
