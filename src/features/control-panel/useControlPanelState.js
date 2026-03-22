import { useState, useCallback, useRef, useEffect } from 'react';
import { SIMULATION_PRESETS } from './simulationPresets';
import { PRESET_COLORS } from '../../components/ObjectAppearancePicker';

export function useControlPanelState(initialState, simulationType, onUpdate, onBeforeObjectUpdate) {
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
  const [showResultantVector, setShowResultantVector] = useState(initialState?.showResultantVector ?? false);
  const [showOffScreenIndicators, setShowOffScreenIndicators] = useState(initialState?.showOffScreenIndicators ?? true);
  const [groundFriction, setGroundFriction] = useState(initialState?.groundFriction ?? 0);
  const [energyConservation, setEnergyConservation] = useState(initialState?.energyConservation ?? false);
  const [showObjectNames, setShowObjectNames] = useState(initialState?.showObjectNames ?? true);

  useEffect(() => { objectCounterRef.current = objectCounter; }, [objectCounter]);

  const lastUpdateRef = useRef(null);
  useEffect(() => {
    if (onUpdate) {
      const stateStr = JSON.stringify({ 
        objects, gravity, airResistance, showCoordinates, showTrajectory, 
        gridSnapping, showCursorCoords, showResultantVector, showOffScreenIndicators, groundFriction,
        energyConservation, showObjectNames 
      });
      if (lastUpdateRef.current !== stateStr) {
        lastUpdateRef.current = stateStr;
        onUpdate(JSON.parse(stateStr));
      }
    }
  }, [objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector, showOffScreenIndicators, groundFriction, energyConservation, showObjectNames, onUpdate]);

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
  const updateObjectSize = useCallback((objId, size) => {
    if (onBeforeObjectUpdate && !onBeforeObjectUpdate(objId, { size })) return;
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, size } : o)));
  }, [onBeforeObjectUpdate]);
  const startRename = useCallback((objId) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, isEditing: true } : o))), []);
  const finishRename = useCallback((objId, newName) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, name: newName || o.name, isEditing: false } : o))), []);

  const imperativeMethods = {
    addObject: (objData) => {
      // Derive next number from existing object names instead of monotonic counter
      setObjects((prev) => {
        const existingNums = prev
          .map(o => { const m = o.name?.match(/^วัตถุ\s*(\d+)$/); return m ? parseInt(m[1]) : 0; })
          .filter(n => n > 0);
        const nextNum = existingNums.length === 0 ? 1 : Math.max(...existingNums) + 1;
        const counter = prev.length;
        const finalName = (objData.name && objData.name !== "undefined") ? objData.name : `วัตถุ ${nextNum}`;
        const newObj = {
          id: objData.id || ('obj_' + Date.now()),
          name: finalName,
          color: objData.color || PRESET_COLORS[counter % PRESET_COLORS.length],
          shape: objData.shape || 'circle', size: objData.size || 1, isEditing: false,
          position: objData.position, isSpawned: true, values: objData.values || {},
        };
        return [...prev, newObj];
      });
      setObjectCounter((prev) => prev + 1);
    },
    removeObject: (objId) => setObjects((prev) => prev.filter((o) => o.id !== objId)),
    removeObjects: (objIds) => {
      const idSet = new Set(objIds);
      setObjects((prev) => prev.filter((o) => !idSet.has(o.id)));
    },
    clearAll: () => { setObjects([]); setObjectCounter(0); },
    updateObjectValues: (objId, newValues) => setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, values: { ...o.values, ...newValues } } : o))),
    resetState: (newState) => {
      if (newState.objects) {
        setObjects(newState.objects);
        setObjectCounter(newState.objects.length);
      }
      if (newState.gravity !== undefined) setGravity(newState.gravity);
      if (newState.airResistance !== undefined) setAirResistance(newState.airResistance);
      if (newState.groundFriction !== undefined) setGroundFriction(newState.groundFriction);
      if (newState.showOffScreenIndicators !== undefined) setShowOffScreenIndicators(newState.showOffScreenIndicators);
      if (newState.energyConservation !== undefined) setEnergyConservation(newState.energyConservation);
      if (newState.showObjectNames !== undefined) setShowObjectNames(newState.showObjectNames);
      // ... sync other settings as needed
    }
  };

  return {
    state: { objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector, showOffScreenIndicators, groundFriction, energyConservation, showObjectNames, activePickerId, presetProps },
    setters: { setGravity, setAirResistance, setShowCoordinates, setShowTrajectory, setGridSnapping, setShowCursorCoords, setShowResultantVector, setShowOffScreenIndicators, setGroundFriction, setEnergyConservation, setShowObjectNames, setActivePickerId },
    actions: { updateObjectValue, removeObjectValue, removeObject, updateObjectColor, updateObjectShape, updateObjectSize, startRename, finishRename },
    refs: { anchorRefs },
    imperativeMethods
  };
}
