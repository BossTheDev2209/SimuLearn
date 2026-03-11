import { useState, useCallback, useRef, useEffect } from 'react';
import ObjectAppearancePicker, { PRESET_COLORS } from './ObjectAppearancePicker';

const SIMULATION_PRESETS = {
  default: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 20  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 20 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 1   },
  ],
  projectile: [
    { key: 'angle',         label: 'มุมยิง (θ)',                 unit: '°',     min: 0, max: 90, step: 1, defaultValue: 45    },
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 0   },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 5 },
  ],
  freefall: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 500, step: 0.5, defaultValue: 50  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 10 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 0.8  },
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
    isSpawned: false,
    size: 1, // Default radius/width
    values,
  };
}

// Slider Row 
function SliderRow({ label, unit, value, min, max, step, onChange, disabled }) {
  return (
    <div className={`mb-3 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-[13px] leading-tight ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
        <span className={`text-[13px] font-semibold ml-2 whitespace-nowrap ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>
          {value} <span className="text-gray-400 font-normal text-[11px]">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="control-slider w-full"
      />
    </div>
  );
}

// Toggle Row 
function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <span className="text-[13px] text-gray-700">{label}</span>
      <div
        className={`relative w-[38px] h-[22px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#F0A03E]' : 'bg-gray-300'
        }`}
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
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
export default function ControlPanel({ simulationType = 'default', onUpdate }) {
  const presetProps = SIMULATION_PRESETS[simulationType] || SIMULATION_PRESETS.default;

  // Objects state (starts empty)
  const [objects, setObjects] = useState([]);
  const [objectCounter, setObjectCounter] = useState(0);

  // Which EXISTING object's appearance picker is open (null = none)
  const [activePickerId, setActivePickerId] = useState(null);
  const anchorRefs = useRef({});

  // Global settings
  const [gravity, setGravity] = useState(9.8);
  const [airResistance, setAirResistance] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showTrajectory, setShowTrajectory] = useState(true);

  // Trigger onUpdate whenever objects or settings change
  useEffect(() => {
    if (onUpdate) {
      onUpdate({ objects, gravity, airResistance, showCoordinates, showTrajectory });
    }
  }, [objects, gravity, airResistance, showCoordinates, showTrajectory, onUpdate]);

  // Spawn flow (Adding new objects) 
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

  // Object handlers 
  const updateObjectValue = useCallback((objId, key, value) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, values: { ...o.values, [key]: value } } : o))
    );
  }, []);

  const removeObject = useCallback((objId) => {
    setObjects((prev) => prev.filter((o) => o.id !== objId));
  }, []);

  const toggleSpawnObject = useCallback((objId) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, isSpawned: !o.isSpawned } : o))
    );
  }, []);

  const updateObjectColor = useCallback((objId, color) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, color } : o))
    );
  }, []);

  const updateObjectShape = useCallback((objId, shape) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, shape } : o))
    );
  }, []);

  const updateObjectSize = useCallback((objId, size) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, size } : o))
    );
  }, []);

  const startRename = useCallback((objId) => {
    setObjects((prev) => prev.map((o) => (o.id === objId ? { ...o, isEditing: true } : o)));
  }, []);

  const finishRename = useCallback((objId, newName) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === objId ? { ...o, name: newName || o.name, isEditing: false } : o))
    );
  }, []);

  return (
    <div className="control-panel w-[260px] min-w-[260px] h-full flex flex-col bg-[#F5F0EA] border-r border-[#D5CBBD] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#E8DFD3] border-b border-[#D5CBBD]">
        <h3 className="text-[15px] font-bold text-gray-800 text-center tracking-wide">
          แผงการควบคุม
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-6 flex flex-col">

        {/* ═══════════ OBJECTS LIST OR EMPTY STATE ═══════════ */}
        {objects.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] relative">
            <button
              ref={addAnchorRef}
              onClick={startAddingObject}
              className="w-8 h-8 rounded-full border-2 border-[#D5CBBD] bg-[#F5F0EA] flex items-center justify-center text-gray-500 hover:border-[#F0A03E] hover:text-[#F0A03E] transition-all duration-150 hover:scale-110 shadow-sm"
              title="เพิ่มวัตถุ"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            
            {pickPending && (
              <ObjectAppearancePicker
                color={pendingColor}
                shape={pendingShape}
                onColorChange={setPendingColor}
                onShapeChange={setPendingShape}
                onClose={commitNewObject}
                anchorRef={addAnchorRef}
              />
            )}
          </div>
        ) : (
          /* Object List */
          <div className="flex-1">
            {objects.map((obj, idx) => (
              <div key={obj.id} className="mb-4">
                {/* Object header */}
                <div className="flex items-center gap-2 mb-3 relative">
                  <button
                    ref={(el) => { anchorRefs.current[obj.id] = el; }}
                    className={`w-4 h-4 rounded-full flex-shrink-0 border-2 border-transparent transition-all duration-150 focus:outline-none ${!obj.isSpawned ? 'hover:border-gray-400 hover:scale-125 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    style={{ backgroundColor: obj.color }}
                    title={obj.isSpawned ? "คุณได้วางวัตถุนี้แล้ว" : "เลือกสี / รูปทรง"}
                    onClick={() => !obj.isSpawned && setActivePickerId(activePickerId === obj.id ? null : obj.id)}
                    disabled={obj.isSpawned}
                  />
                  {activePickerId === obj.id && (
                    <ObjectAppearancePicker
                      color={obj.color}
                      shape={obj.shape}
                      onColorChange={(c) => updateObjectColor(obj.id, c)}
                      onShapeChange={(s) => updateObjectShape(obj.id, s)}
                      onClose={() => setActivePickerId(null)}
                      anchorRef={{ current: anchorRefs.current[obj.id] }}
                    />
                  )}
                  {obj.isEditing ? (
                    <input
                      autoFocus
                      defaultValue={obj.name}
                      onBlur={(e) => finishRename(obj.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishRename(obj.id, e.target.value);
                      }}
                      className="text-[14px] font-semibold text-gray-800 bg-white/60 border border-[#D5CBBD] rounded px-1.5 py-0.5 outline-none focus:border-[#F0A03E] w-full"
                    />
                  ) : (
                    <span className="text-[14px] font-semibold text-gray-800">{obj.name}</span>
                  )}
                  {!obj.isEditing && (
                    <button
                      onClick={() => startRename(obj.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
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
                  label={obj.shape === 'circle' ? 'รัศมี (r)' : 'ความกว้าง (w)'}
                  unit="m"
                  value={obj.size !== undefined ? obj.size : 1}
                  min={0.5}
                  max={20}
                  step={0.5}
                  onChange={(v) => updateObjectSize(obj.id, v)}
                  disabled={obj.isSpawned}
                />
                
                {presetProps.map((prop) => (
                  <SliderRow
                    key={prop.key}
                    label={prop.label}
                    unit={prop.unit}
                    value={obj.values[prop.key]}
                    min={prop.min}
                    max={prop.max}
                    step={prop.step}
                    onChange={(v) => updateObjectValue(obj.id, prop.key, v)}
                    disabled={obj.isSpawned}
                  />
                ))}

                <button
                  onClick={() => toggleSpawnObject(obj.id)}
                  className={`mt-2 mb-1 w-full py-1.5 rounded text-[13px] font-bold transition-colors ${
                    obj.isSpawned 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-[#F0A03E] text-white hover:bg-[#D97706]'
                  }`}
                >
                  {obj.isSpawned ? 'ลบออกจากฉาก' : 'วางลงในฉาก (0, 10)'}
                </button>

                {/* Separator between objects */}
                {idx < objects.length - 1 && (
                  <div className="border-b border-[#DCD5CB] mt-2 mb-3" />
                )}
              </div>
            ))}

            {/* Add additional object button */}
            <div className="flex justify-center mb-4 relative">
              <button
                ref={addAnchorRef}
                onClick={startAddingObject}
                disabled={objects.length >= PRESET_COLORS.length}
                className="w-8 h-8 rounded-full border-2 border-[#D5CBBD] bg-white flex items-center justify-center text-gray-500 hover:border-[#F0A03E] hover:text-[#F0A03E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="เพิ่มวัตถุ"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              
              {pickPending && (
                <ObjectAppearancePicker
                  color={pendingColor}
                  shape={pendingShape}
                  onColorChange={setPendingColor}
                  onShapeChange={setPendingShape}
                  onClose={commitNewObject}
                  anchorRef={addAnchorRef}
                />
              )}
            </div>
          </div>
        )}

        {/* ═══════════ GLOBAL SETTINGS ═══════════ */}
        <div className="mt-auto">
          <div className="border-b border-[#D5CBBD] mb-4" />
          <h4 className="text-[14px] font-bold text-gray-800 mb-3">ตั้งค่าโลก</h4>

          <SliderRow
            label="ความเร่งเนื่องจากแรงโน้มถ่วง"
            unit="m/s²"
            value={gravity}
            min={0}
            max={30}
            step={0.1}
            onChange={setGravity}
          />

          <div className="mt-1">
            <ToggleRow label="แรงต้านอากาศ" checked={airResistance} onChange={setAirResistance} />
            <ToggleRow label="แสดงเส้นพิกัด" checked={showCoordinates} onChange={setShowCoordinates} />
            <ToggleRow label="แสดงเส้นวิถี" checked={showTrajectory} onChange={setShowTrajectory} />
          </div>
        </div>
      </div>
    </div>
  );
}
