import React, { memo } from 'react';
import ObjectAppearancePicker from '../ObjectAppearancePicker';

export const SliderRow = memo(({ label, unit, value, min, max, step, onChange, disabled }) => (
  <div className={`mb-3 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
    <div className="flex items-baseline justify-between mb-1">
      <span className={`text-[13px] font-medium leading-tight ${disabled ? 'text-theme-muted' : 'text-theme-primary'}`}>{label}</span>
      <span className={`text-[13px] font-bold ml-2 whitespace-nowrap ${disabled ? 'text-theme-muted' : 'text-[#FFB65A] dark:text-[#FFB65A]'}`}>
        {value} <span className="text-theme-muted font-normal text-[11px] ml-0.5">{unit}</span>
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className={`control-slider w-full accent-[#FFB65A] ${disabled ? 'grayscale' : ''}`} disabled={disabled} />
  </div>
));

export const ToggleRow = memo(({ label, checked, onChange, disabled }) => (
  <label className={`flex items-center justify-between py-2 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer group'}`}>
    <span className="text-[13px] font-medium text-theme-primary">{label}</span>
    <div className={`relative w-[38px] h-[22px] rounded-full transition-colors duration-200 ${checked ? 'bg-[#FFB65A]' : 'bg-gray-300 dark:bg-[#3F4147]'}`} onClick={(e) => { if(!disabled){ e.preventDefault(); onChange(!checked); }}}>
      <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </div>
  </label>
));

export const ObjectItem = memo(({ obj, idx, isLocked, presetProps, activePickerId, setActivePickerId, anchorRefs, actions }) => {
  const { updateObjectColor, updateObjectShape, startRename, finishRename, removeObject, updateObjectSize, updateObjectValue, removeObjectValue } = actions;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3 relative">
        <button
          ref={(el) => { if (el) anchorRefs.current[obj.id] = el; }} disabled={isLocked}
          className={`w-4 h-4 rounded-full flex-shrink-0 border-2 border-transparent transition-all duration-150 focus:outline-none ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 hover:scale-125 cursor-pointer'}`}
          style={{ backgroundColor: obj.color }} title="เลือกสี / รูปทรง"
          onClick={() => setActivePickerId(activePickerId === obj.id ? null : obj.id)}
        />
        {activePickerId === obj.id && !isLocked && (
          <ObjectAppearancePicker color={obj.color} shape={obj.shape} onColorChange={(c) => updateObjectColor(obj.id, c)} onShapeChange={(s) => updateObjectShape(obj.id, s)} onClose={() => setActivePickerId(null)} getAnchor={() => anchorRefs.current[obj.id]} />
        )}
        {obj.isEditing && !isLocked ? (
          <input autoFocus defaultValue={obj.name} onBlur={(e) => finishRename(obj.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') finishRename(obj.id, e.target.value); }} className="text-[14px] font-semibold text-theme-primary bg-theme-main border border-theme-border-hover rounded px-1.5 py-0.5 outline-none focus:border-[#FFB65A] w-full" />
        ) : (
          <span className={`text-[14px] font-semibold ${isLocked ? 'text-theme-muted' : 'text-theme-primary'}`}>{obj.name}</span>
        )}
        {!obj.isEditing && !isLocked && (
          <button onClick={() => startRename(obj.id)} className="text-theme-muted hover:text-theme-primary transition-colors" title="เปลี่ยนชื่อ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
        )}
        <button onClick={() => removeObject(obj.id)} disabled={isLocked} className={`ml-auto p-1 rounded transition-colors ${isLocked ? 'text-theme-muted opacity-40 cursor-not-allowed' : 'text-theme-muted hover:text-[#FFB65A] hover:bg-[#FFB65A]/10'}`} title="ลบวัตถุ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <SliderRow label={obj.shape === 'circle' ? 'ขนาด (r)' : 'ความกว้าง (w)'} unit="m" value={obj.size !== undefined ? obj.size : 1} min={0.5} max={20} step={0.5} onChange={(v) => updateObjectSize(obj.id, v)} disabled={isLocked} />
      {presetProps.map((prop) => {
        let val = obj.values?.[prop.key] ?? prop.defaultValue ?? 0;
        if (prop.key === 'height' && val === 0) val = prop.defaultValue;
        return <SliderRow key={prop.key} label={prop.label} unit={prop.unit} value={val} min={prop.min} max={prop.max} step={prop.step} onChange={(v) => updateObjectValue(obj.id, prop.key, v)} disabled={isLocked} />;
      })}

      <button onClick={() => removeObject(obj.id)} disabled={isLocked} className={`mt-2 mb-1 w-full py-2 rounded-lg text-[13px] font-bold transition-all border ${isLocked ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-[#3F4147] dark:text-gray-500 dark:border-transparent opacity-50 cursor-not-allowed' : 'bg-[#FFB65A]/10 text-[#FFB65A] border-[#FFB65A]/30 hover:bg-[#FFB65A] hover:text-white dark:bg-[#FFB65A]/10 dark:hover:bg-[#FFB65A] dark:hover:text-white'}`}>ลบออกจากฉาก</button>

      <div className="mt-3 bg-gray-50 dark:bg-[#1E1F22] rounded-lg p-2 border border-theme-border">
        <div className="flex justify-between items-center mb-1.5 px-1"><span className="text-[11px] font-bold text-theme-muted uppercase tracking-wider">Vectors Outline</span></div>
        <div className="flex flex-col gap-1">
          {(obj.values?.velocities || []).map((v, i) => (
            <div key={`v-${i}`} className="flex items-center gap-2 group">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
              <span className="text-[11px] text-theme-primary font-bold">V {i+1}:</span><span className="text-[11px] text-theme-muted">{v.magnitude}m/s , {v.angle}°</span>
              <button onClick={() => removeObjectValue(obj.id, 'velocities', i)} className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#FFB65A] transition-all"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          ))}
          {(obj.values?.forces || []).map((f, i) => (
            <div key={`f-${i}`} className="flex items-center gap-2 group">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
              <span className="text-[11px] text-theme-primary font-bold">F {i+1}:</span><span className="text-[11px] text-theme-muted">{f.magnitude}N , {f.angle}°</span>
              <button onClick={() => removeObjectValue(obj.id, 'forces', i)} className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
          ))}
          {!(obj.values?.velocities?.length) && !(obj.values?.forces?.length) && <span className="text-[10px] text-theme-muted italic px-1 opacity-60">ไม่มีเวกเตอร์แปรผัน</span>}
        </div>
      </div>
    </div>
  );
});

export const GlobalSettings = memo(({ isLocked, state, setters }) => (
  <div className="mt-auto pt-4">
    <div className="border-b border-theme-border mb-4" />
    <h4 className="text-[14px] font-bold text-theme-primary mb-3">ตั้งค่าโลก</h4>
    <SliderRow label="แรงโน้มถ่วง (g)" unit="m/s²" value={state.gravity} min={0} max={30} step={0.1} onChange={setters.setGravity} disabled={isLocked} />
    <SliderRow label="แรงเสียดทานจากพื้น (μ)" unit="" value={state.groundFriction} min={0} max={1} step={0.01} onChange={setters.setGroundFriction} disabled={isLocked} />
    <div className="mt-2">
      <ToggleRow label="แรงต้านอากาศ" checked={state.airResistance} onChange={setters.setAirResistance} disabled={isLocked} />
      <ToggleRow label="แสดงเส้นพิกัด" checked={state.showCoordinates} onChange={setters.setShowCoordinates} />
      <ToggleRow label="แสดงเส้นวิถี" checked={state.showTrajectory} onChange={setters.setShowTrajectory} />
      <ToggleRow label="สแนปเมาส์เข้ากับตาราง" checked={state.gridSnapping} onChange={setters.setGridSnapping} />
      <ToggleRow label="แสดงพิกัดตามเมาส์" checked={state.showCursorCoords} onChange={setters.setShowCursorCoords} />
      <ToggleRow label="แสดงผลรวมเวกเตอร์" checked={state.showResultantVector} onChange={setters.setShowResultantVector} />
      <ToggleRow label="แสดงตำแหน่งวัตถุนอกระยะ" checked={state.showOffScreenIndicators} onChange={setters.setShowOffScreenIndicators} />
    </div>
  </div>
));