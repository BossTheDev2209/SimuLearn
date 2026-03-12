import { useState, useCallback, useRef, useEffect } from 'react';
import ObjectAppearancePicker, { PRESET_COLORS } from './ObjectAppearancePicker';

const SIMULATION_PRESETS = {
  default: [
    { key: 'height',        label: 'ความสูงเริ่มต้น (h)',        unit: 'm',     min: 0, max: 200, step: 0.5, defaultValue: 20  },
    { key: 'mass',          label: 'มวล (m)',                    unit: 'kg',    min: 0.1, max: 500, step: 0.1, defaultValue: 20 },
    { key: 'restitution',   label: 'สัมประสิทธิ์การคืนตัว (e)',  unit: '',      min: 0, max: 1, step: 0.01, defaultValue: 0.6 },
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
    size: 1, 
    values,
  };
}

// Slider Row 
function SliderRow({ label, unit, value, min, max, step, onChange, disabled }) {
  return (
    <div className={`mb-3 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
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
        className="control-slider w-full accent-[#FFB65A]"
      />
    </div>
  );
}

// Toggle Row 
function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer group">
      <span className="text-[13px] font-medium text-theme-primary">{label}</span>
      <div
        className={`relative w-[38px] h-[22px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-[#FFB65A]' : 'bg-gray-300 dark:bg-[#3F4147]'
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
export default function ControlPanel({ simulationType = 'default', onUpdate, initialState }) {
  const presetProps = SIMULATION_PRESETS[simulationType] || SIMULATION_PRESETS.default;

  const [objects, setObjects] = useState(initialState?.objects || []);
  const [objectCounter, setObjectCounter] = useState(initialState?.objects?.length || 0);
  const [activePickerId, setActivePickerId] = useState(null);
  const anchorRefs = useRef({});

  const [gravity, setGravity] = useState(initialState?.gravity !== undefined ? initialState.gravity : 9.8);
  const [airResistance, setAirResistance] = useState(initialState?.airResistance !== undefined ? initialState.airResistance : false);
  const [showCoordinates, setShowCoordinates] = useState(initialState?.showCoordinates !== undefined ? initialState.showCoordinates : true);
  const [showTrajectory, setShowTrajectory] = useState(initialState?.showTrajectory !== undefined ? initialState.showTrajectory : true);

  // ส่ง Update ไปบอก Parent เมื่อมีการเปลี่ยนแปลง
  // 🌟 1. ป้องกันลูปนรก: เช็คก่อนว่าข้อมูลเปลี่ยนจริงๆ ถึงจะยอมดึงมาอัปเดต
  useEffect(() => {
    if (initialState?.objects && JSON.stringify(initialState.objects) !== JSON.stringify(objects)) {
       setObjects(initialState.objects);
       setObjectCounter(Math.max(initialState.objects.length, objectCounter));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState?.objects]);

  // 🌟 ส่งข้อมูลกลับให้กระดานฟิสิกส์ (ถอด onUpdate ออกจาก Dependency เพื่อหยุดลูป)
  useEffect(() => {
    if (onUpdate) {
      onUpdate({ objects, gravity, airResistance, showCoordinates, showTrajectory });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, gravity, airResistance, showCoordinates, showTrajectory]);

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

  // 🌟 (ข้อ 2) ฟังก์ชันลบวัตถุ เตะออกจากฉากและลบออกจาก State ถาวร
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
    <div className="control-panel w-full h-full flex flex-col bg-theme-panel overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-theme-sidebar border-b border-theme-border">
        <h3 className="text-[15px] font-bold text-theme-primary text-center tracking-wide">
          แผงการควบคุม
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-6 flex flex-col">

        {objects.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] relative">
              <button
              ref={addAnchorRef}
              onClick={startAddingObject}
              className="w-10 h-10 rounded-full border border-theme-border bg-theme-main flex items-center justify-center text-theme-muted hover:border-[#FFB65A] hover:text-[#FFB65A] transition-all duration-150 hover:scale-110 shadow-sm"
              title="เพิ่มวัตถุ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
                onClose={() => setPickPending(false)}
                onConfirm={commitNewObject}
                getAnchor={() => addAnchorRef.current}
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
                    ref={(el) => { if (el) anchorRefs.current[obj.id] = el; }}
                    className={`w-4 h-4 rounded-full flex-shrink-0 border-2 border-transparent transition-all duration-150 focus:outline-none hover:border-gray-400 hover:scale-125 cursor-pointer`}
                    style={{ backgroundColor: obj.color }}
                    title={"เลือกสี / รูปทรง"}
                    onClick={() => setActivePickerId(activePickerId === obj.id ? null : obj.id)}
                  />
                  {activePickerId === obj.id && (
                    <ObjectAppearancePicker
                      color={obj.color}
                      shape={obj.shape}
                      onColorChange={(c) => updateObjectColor(obj.id, c)}
                      onShapeChange={(s) => updateObjectShape(obj.id, s)}
                      onClose={() => setActivePickerId(null)}
                      getAnchor={() => anchorRefs.current[obj.id]}
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
                      className="text-[14px] font-semibold text-theme-primary bg-theme-main border border-theme-border-hover rounded px-1.5 py-0.5 outline-none focus:border-[#FFB65A] w-full"
                    />
                  ) : (
                    <span className="text-[14px] font-semibold text-theme-primary">{obj.name}</span>
                  )}
                  {!obj.isEditing && (
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
                  
                  {/* 🌟 (ข้อ 3) เปลี่ยนปุ่มลบด้านบนขวา ให้สีแดงตอน Hover */}
                  <button
                    onClick={() => removeObject(obj.id)}
                    className="ml-auto text-theme-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"
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
                />
                
                {presetProps.map((prop) => (
                  <SliderRow
                    key={prop.key}
                    label={prop.label}
                    unit={prop.unit}
                    // 🌟 2. ดักไว้ก่อน: ถ้าค่าความสูง (height) หรือมุมหายไป ให้ใช้ค่าเริ่มต้นแทน จะได้ไม่ error
                    value={obj.values?.[prop.key] ?? prop.defaultValue ?? 0}
                    min={prop.min}
                    max={prop.max}
                    step={prop.step}
                    onChange={(v) => updateObjectValue(obj.id, prop.key, v)}
                    disabled={obj.isSpawned}
                  />
                ))}

                {/* 🌟 (ข้อ 3) ปุ่มแดงลบวัตถุใหญ่ด้านล่าง ที่ Hover แล้วสีเปลี่ยน */}
                <button
                  onClick={() => removeObject(obj.id)}
                  className="mt-2 mb-1 w-full py-2 rounded-lg text-[13px] font-bold transition-all bg-red-50 text-red-500 border border-red-200 hover:bg-red-500 hover:text-white dark:bg-red-900/10 dark:border-red-800/30 dark:hover:bg-red-600 dark:hover:text-white"
                >
                  ลบออกจากฉาก
                </button>

                {/* Separator between objects */}
                {idx < objects.length - 1 && (
                  <div className="border-b border-theme-border mt-3 mb-4" />
                )}
              </div>
            ))}

            {/* Add additional object button */}
            <div className="flex justify-center mb-4 relative mt-2">
              <button
                ref={addAnchorRef}
                onClick={startAddingObject}
                disabled={objects.length >= PRESET_COLORS.length}
                className="w-10 h-10 rounded-full border border-theme-border bg-theme-main flex items-center justify-center text-theme-muted hover:border-[#FFB65A] hover:text-[#FFB65A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="เพิ่มวัตถุ"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
                  onClose={() => setPickPending(false)}
                  onConfirm={commitNewObject}
                  getAnchor={() => addAnchorRef.current}
                />
              )}
            </div>
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
          />

          <div className="mt-2">
            <ToggleRow label="แรงต้านอากาศ" checked={airResistance} onChange={setAirResistance} />
            <ToggleRow label="แสดงเส้นพิกัด" checked={showCoordinates} onChange={setShowCoordinates} />
            <ToggleRow label="แสดงเส้นวิถี" checked={showTrajectory} onChange={setShowTrajectory} />
          </div>
        </div>
      </div>
    </div>
  );
} 