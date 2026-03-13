import { useRef, useCallback, useEffect } from 'react';

export function useSimulationHistory(simState, setSimState, onSaveControlState) {
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);

  const pushToHistory = useCallback((state) => {
    if (!state) return;
    historyRef.current.push(JSON.parse(JSON.stringify(state)));
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoStackRef.current = [];
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
    redoStackRef.current.push(JSON.parse(JSON.stringify(simState)));
    setSimState(previous);
    if (onSaveControlState) onSaveControlState(previous);
    return previous; // Return to allow external sync
  }, [simState, setSimState, onSaveControlState]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    historyRef.current.push(JSON.parse(JSON.stringify(simState)));
    setSimState(next);
    if (onSaveControlState) onSaveControlState(next);
    return next; // Return to allow external sync
  }, [simState, setSimState, onSaveControlState]);

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);

  useEffect(() => {
    undoRef.current = undo;
    redoRef.current = redo;
  }, [undo, redo]);

  return { pushToHistory, undoRef, redoRef };
}