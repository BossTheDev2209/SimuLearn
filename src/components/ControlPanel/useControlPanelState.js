import { useState, useCallback, useRef, useEffect } from 'react';
import { SIMULATION_PRESETS } from './simulationPresets';
import { PRESET_COLORS } from '../ObjectAppearancePicker';

export function useControlPanelState(initialState, simulationType, onUpdate) {
  const presetProps = SIMULATION_PRESETS[simulationType] || SIMULATION_PRESETS.default;

  const savedObjects = (initialState?.objects || []).filter(o => o.isSpawned);
  const [objects, setObjects] = useState(savedObjects);
  const [objectCounter, setObjectCounter] = useState(savedObjects.length);
  const objectCounterRef = useRef(savedObjects.length);
  const [activePickerId, setActivePickerId] = useState(null);
  const anchorRefs = useRef({});

  const [gravity, setGravity] = useState(initialState?.gravity ?? 9.8);
  const [airResistance, setAirResistance] = useState(initialState?.airResistance ?? false);
  const [showCoordinates, setShowCoordinates] = useState(initialState?.showCoordinates ?? true);
  const [showTrajectory, setShowTrajectory] = useState(initialState?.showTrajectory ?? true);
  const [gridSnapping, setGridSnapping] = useState(initialState?.gridSnapping ?? false);
  const [showCursorCoords, setShowCursorCoords] = useState(initialState?.showCursorCoords ?? false);
  const [showResultantVector, setShowResultantVector] = useState(initialState?.showResultantVector ?? true);
  const [groundFriction, setGroundFriction] = useState(initialState?.groundFriction ?? 0);

  useEffect(() => { objectCounterRef.current = objectCounter; }, [objectCounter]);

  const lastUpdateRef = useRef(null);
  useEffect(() => {
    if (onUpdate) {
      const stateStr = JSON.stringify({ objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector, groundFriction });
      if (lastUpdateRef.current !== stateStr) {
        lastUpdateRef.current = stateStr;
        onUpdate(JSON.parse(stateStr));
      }
    }
  }, [objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector, groundFriction, onUpdate]);

  const updateObjectValue = useCallback((objId, key, value) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, values: { ...o.values, [key]: value } } : o))), []);
  const removeObjectValue = useCallback((objId, key, index) => setObjects((prev) => prev.map((o) => {
    if (o.id === objId) {
      const arr = [...(o.values?.[key] || [])]; arr.splice(index, 1);
      return { ...o, values: { ...o.values, [key]: arr } };
    }
    return o;
  })), []);
  const removeObject = useCallback((objId) => setObjects((prev) => prev.filter((o) => o.id !== objId)), []);
  const updateObjectColor = useCallback((objId, color) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, color } : o))), []);
  const updateObjectShape = useCallback((objId, shape) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, shape } : o))), []);
  const updateObjectSize = useCallback((objId, size) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, size } : o))), []);
  const startRename = useCallback((objId) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, isEditing: true } : o))), []);
  const finishRename = useCallback((objId, newName) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, name: newName || o.name, isEditing: false } : o))), []);

  const imperativeMethods = {
    addObject: (objData) => {
      const counter = objectCounterRef.current;
      const newObj = {
        id: objData.id || ('obj_' + Date.now()), name: `วัตถุ ${counter + 1}`, color: objData.color || PRESET_COLORS[counter % PRESET_COLORS.length],
        shape: objData.shape || 'circle', size: objData.size || 1, isEditing: false, position: objData.position, isSpawned: true, values: objData.values || {},
      };
      setObjects((prev) => [...prev, newObj]); setObjectCounter((prev) => prev + 1);
    },
    clearAll: () => setObjects([]),
    updateObjectValues: (objId, newValues) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, values: { ...o.values, ...newValues } } : o))),
  };

  return {
    state: { objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector, groundFriction, activePickerId, presetProps },
    setters: { setGravity, setAirResistance, setShowCoordinates, setShowTrajectory, setGridSnapping, setShowCursorCoords, setShowResultantVector, setGroundFriction, setActivePickerId },
    actions: { updateObjectValue, removeObjectValue, removeObject, updateObjectColor, updateObjectShape, updateObjectSize, startRename, finishRename },
    refs: { anchorRefs },
    imperativeMethods
  };
}