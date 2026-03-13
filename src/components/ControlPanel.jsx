import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ObjectAppearancePicker, { PRESET_COLORS } from './ObjectAppearancePicker';

const SIMULATION_PRESETS = {
  default: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 20  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 20 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 0 },
  ],
  projectile: [
    { key: 'angle',         label: 'มุมยิง (θ)',                 unit: '°',     min: 0, max: 90, step: 1, defaultValue: 45    },
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 0   },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 5 },
  ],
  freefall: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 500, step: 0.5, defaultValue: 50  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 10 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 0  },
  ],
};

function createNewObject(index, presetProps) {
  const values = {};
  presetProps.forEach((p) => {
    values[p.key] = p.defaultValue;
  });
  return {
    id: Date.now() + Math.random(),
    name: `วัตถุ ${index + 1}`,
    color: PRESET_COLORS[index % PRESET_COLORS.length],
    shape: 'circle',
    isEditing: false,
    size: 1, 
    values,
  };
}

// Slider Row 
function SliderRow({ label, unit, value, min, max, step, onChange, disabled }) {
  return (
    <div className={`mb-3 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-[13px] font-medium leading-tight ${disabled ? 'text-theme-muted' : 'text-theme-primary'}`}>{label}</span>
        <span className={`text-[13px] font-bold ml-2 whitespace-nowrap ${disabled ? 'text-theme-muted' : 'text-[#FFB65A] dark:text-[#FFB65A]'}`}>
          {value} <span className="text-theme-muted font-normal text-[11px] ml-0.5">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`control-slider w-full accent-[#FFB65A] ${disabled ? 'grayscale' : ''}`}
        disabled={disabled}
      />
    </div>
  );
}

// Toggle Row 
function ToggleRow({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center justify-between py-2 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer group'}`}>
      <span className="text-[13px] font-medium text-theme-primary">{label}</span>
      <div
        className={`relative w-[38px] h-[22px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#FFB65A]' : 'bg-gray-300 dark:bg-[#3F4147]'
        }`}
        onClick={(e) => { 
          if(disabled) return;
          e.preventDefault(); 
          onChange(!checked); 
        }}
      >
        <div
          className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          }`}
        />
      </div>
    </label>
  );
}

// Main ControlPanel 
const ControlPanel = forwardRef(function ControlPanel({ simulationType = 'default', onUpdate, initialState, isLocked }, ref) {
  const presetProps = SIMULATION_PRESETS[simulationType] || SIMULATION_PRESETS.default;

  // Load previously-spawned objects from saved state (isSpawned: true only).
  // Template preset objects (no isSpawned flag) are ignored to avoid stale placeholder circles.
  const savedObjects = (initialState?.objects || []).filter(o => o.isSpawned);
  const [objects, setObjects] = useState(savedObjects);
  const [objectCounter, setObjectCounter] = useState(savedObjects.length);
  const objectCounterRef = useRef(savedObjects.length); // Stable ref — no stale closure in imperative handle
  const [activePickerId, setActivePickerId] = useState(null);
  const anchorRefs = useRef({});

  const [gravity, setGravity] = useState(initialState?.gravity !== undefined ? initialState.gravity : 9.8);
  const [airResistance, setAirResistance] = useState(initialState?.airResistance !== undefined ? initialState.airResistance : false);
  const [showCoordinates, setShowCoordinates] = useState(initialState?.showCoordinates !== undefined ? initialState.showCoordinates : true);
  const [showTrajectory, setShowTrajectory] = useState(initialState?.showTrajectory !== undefined ? initialState.showTrajectory : true);
  const [gridSnapping, setGridSnapping] = useState(initialState?.gridSnapping !== undefined ? initialState.gridSnapping : false);
  const [showCursorCoords, setShowCursorCoords] = useState(initialState?.showCursorCoords !== undefined ? initialState.showCursorCoords : false);
  const [showResultantVector, setShowResultantVector] = useState(initialState?.showResultantVector !== undefined ? initialState.showResultantVector : true);

  // Keep objectCounterRef in sync
  useEffect(() => { objectCounterRef.current = objectCounter; }, [objectCounter]);

  // Expose addObject + clearAll for canvas/toolbar-side control
  useImperativeHandle(ref, () => ({
    addObject: (objData) => {
      const counter = objectCounterRef.current;
      const newObj = {
        id: objData.id || ('obj_' + Date.now()),
        name: `วัตถุ ${counter + 1}`,
        color: objData.color || PRESET_COLORS[counter % PRESET_COLORS.length],
        shape: objData.shape || 'circle',
        size: objData.size || 1,
        isEditing: false,
        position: objData.position,
        isSpawned: true,
        values: objData.values || {},
      };
      setObjects((prev) => [...prev, newObj]);
      setObjectCounter((prev) => prev + 1);
    },
    clearAll: () => {
      setObjects([]);
    },
    updateObjectValues: (objId, newValues) => {
      setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, values: { ...o.values, ...newValues } } : o)));
    },
  }));

  // ControlPanel owns its state exclusively. Remount via key prop to reset.

  useEffect(() => {
    if (onUpdate) {
      onUpdate({ objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, gravity, airResistance, showCoordinates, showTrajectory, gridSnapping, showCursorCoords, showResultantVector]);

  const [pickPending, setPickPending] = useState(false);
  const [pendingColor, setPendingColor] = useState('#22C55E');
  const [pendingShape, setPendingShape] = useState('circle');
  const addAnchorRef = useRef(null);

  const startAddingObject = useCallback(() => {
    if (objects.length >= PRESET_COLORS.length) return;
    setPendingColor(PRESET_COLORS[objectCounter % PRESET_COLORS.length]);
    setPendingShape('circle');
    setPickPending(true);
  }, [objects.length, objectCounter]);

  const commitNewObject = useCallback(() => {
    setPickPending(false);
    const newObj = createNewObject(objectCounter, presetProps);
    newObj.color = pendingColor;
    newObj.shape = pendingShape;
    setObjects((prev) => [...prev, newObj]);
    setObjectCounter((prev) => prev + 1);
  }, [objectCounter, pendingColor, pendingShape, presetProps]);

  const updateObjectValue = useCallback((objId, key, value) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, values: { ...o.values, [key]: value } } : o)));
  }, []);

  const removeObject = useCallback((objId) => {
    setObjects((prev) => prev.filter((o) => o.id !== objId));
  }, []);

  const updateObjectColor = useCallback((objId, color) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, color } : o)));
  }, []);

  const updateObjectShape = useCallback((objId, shape) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, shape } : o)));
  }, []);

  const updateObjectSize = useCallback((objId, size) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, size } : o)));
  }, []);

  const startRename = useCallback((objId) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, isEditing: true } : o)));
  }, []);

  const finishRename = useCallback((objId, newName) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, name: newName || o.name, isEditing: false } : o)));
  }, []);

  return (
    <div className="control-panel w-full h-full flex flex-col bg-theme-panel overflow-hidden relative">
      
      {/* Banner when locked (simulation is running) */}
      {isLocked && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-[#FFB65A]/10 border-b border-[#FFB65A]/20 py-1.5 flex justify-center items-center gap-2 pointer-events-none">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFB65A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
           <span className="text-xs font-bold text-[#FFB65A]">หยุดเล่นก่อนแก้ไขค่า</span>
        </div>
      )}

      {/* Header */}
      <div className={`px-4 py-3 bg-theme-sidebar border-b border-theme-border ${isLocked ? 'pt-8' : ''}`}>
        <h3 className="text-[15px] font-bold text-theme-primary text-center tracking-wide">
          แผงการควบคุม
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-6 flex flex-col">

        {objects.length === 0 ? (
          /* Empty State — hint to use canvas tool */
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center px-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-theme-muted mb-3 opacity-40">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <p className="text-[13px] text-theme-muted leading-relaxed">
              ใช้เครื่องมือ <span className="font-bold text-[#FFB65A]">＋ เพิ่มวัตถุ</span> บน Canvas<br/>เพื่อเริ่มเพิ่มวัตถุเข้ามา
            </p>
          </div>
        ) : (
          /* Object List */
          <div className="flex-1">
            {objects.map((obj, idx) => (
              <div key={obj.id} className="mb-4">
                {/* Object header */}
                <div className="flex items-center gap-2 mb-3 relative">
                  <button
                    ref={(el) => { if (el) anchorRefs.current[obj.id] = el; }}
                    disabled={isLocked}
                    className={`w-4 h-4 rounded-full flex-shrink-0 border-2 border-transparent transition-all duration-150 focus:outline-none ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:scale-125 cursor-pointer'}`}
                    style={{ backgroundColor: obj.color }}
                    title={"เลือกสี / รูปทรง"}
                    onClick={() => setActivePickerId(activePickerId === obj.id ? null : obj.id)}
                  />
                  {activePickerId === obj.id && !isLocked && (
                    <ObjectAppearancePicker
                      color={obj.color}
                      shape={obj.shape}
                      onColorChange={(c) => updateObjectColor(obj.id, c)}
                      onShapeChange={(s) => updateObjectShape(obj.id, s)}
                      onClose={() => setActivePickerId(null)}
                      getAnchor={() => anchorRefs.current[obj.id]}
                    />
                  )}
                  {obj.isEditing && !isLocked ? (
                    <input
                      autoFocus
                      defaultValue={obj.name}
                      onBlur={(e) => finishRename(obj.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishRename(obj.id, e.target.value);
                      }}
                      className="text-[14px] font-semibold text-theme-primary bg-theme-main border border-theme-border-hover rounded px-1.5 py-0.5 outline-none focus:border-[#FFB65A] w-full"
                    />
                  ) : (
                    <span className={`text-[14px] font-semibold ${isLocked ? 'text-theme-muted' : 'text-theme-primary'}`}>{obj.name}</span>
                  )}
                  {!obj.isEditing && !isLocked && (
                    <button
                      onClick={() => startRename(obj.id)}
                      className="text-theme-muted hover:text-theme-primary transition-colors"
                      title="เปลี่ยนชื่อ"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeObject(obj.id)}
                    disabled={isLocked}
                    className={`ml-auto p-1 rounded transition-colors ${isLocked ? 'text-theme-muted opacity-40 cursor-not-allowed' : 'text-theme-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title="ลบวัตถุ"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Property sliders */}
                <SliderRow
                  label={obj.shape === 'circle' ? 'ขนาด (r)' : 'ความกว้าง (w)'}
                  unit="m"
                  value={obj.size !== undefined ? obj.size : 1}
                  min={0.5}
                  max={20}
                  step={0.5}
                  onChange={(v) => updateObjectSize(obj.id, v)}
                  disabled={isLocked}
                />
                
                {presetProps.map((prop) => (
                  <SliderRow
                    key={prop.key}
                    label={prop.label}
                    unit={prop.unit}
                    value={obj.values?.[prop.key] ?? prop.defaultValue ?? 0}
                    min={prop.min}
                    max={prop.max}
                    step={prop.step}
                    onChange={(v) => updateObjectValue(obj.id, prop.key, v)}
                    disabled={isLocked}
                  />
                ))}

                <button
                  onClick={() => removeObject(obj.id)}
                  disabled={isLocked}
                  className={`mt-2 mb-1 w-full py-2 rounded-lg text-[13px] font-bold transition-all border ${isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-[#3F4147] dark:text-gray-500 dark:border-transparent opacity-50 cursor-not-allowed' : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-500 hover:text-white dark:bg-red-900/10 dark:border-red-800/30 dark:hover:bg-red-600 dark:hover:text-white'}`}
                >
                  ลบออกจากฉาก
                </button>

                {/* Separator between objects */}
                {idx < objects.length - 1 && (
                  <div className="border-b border-theme-border mt-3 mb-4" />
                )}
              </div>
            ))}


          </div>
        )}

        {/* ═══════════ GLOBAL SETTINGS ═══════════ */}
        <div className="mt-auto pt-4">
          <div className="border-b border-theme-border mb-4" />
          <h4 className="text-[14px] font-bold text-theme-primary mb-3">ตั้งค่าโลก</h4>

          <SliderRow
            label="แรงโน้มถ่วง (g)"
            unit="m/s²"
            value={gravity}
            min={0}
            max={30}
            step={0.1}
            onChange={setGravity}
            disabled={isLocked}
          />

          <div className="mt-2">
            <ToggleRow label="แรงต้านอากาศ" checked={airResistance} onChange={setAirResistance} disabled={isLocked} />
            <ToggleRow label="แสดงเส้นพิกัด" checked={showCoordinates} onChange={setShowCoordinates} />
            <ToggleRow label="แสดงเส้นวิถี" checked={showTrajectory} onChange={setShowTrajectory} />
            <ToggleRow label="สแนปเมาส์เข้ากับตาราง" checked={gridSnapping} onChange={setGridSnapping} />
            <ToggleRow label="แสดงพิกัดตามเมาส์" checked={showCursorCoords} onChange={setShowCursorCoords} />
            <ToggleRow label="แสดงผลรวมเวกเตอร์" checked={showResultantVector} onChange={setShowResultantVector} />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ControlPanel;