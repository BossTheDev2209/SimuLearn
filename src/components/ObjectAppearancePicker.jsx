import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const FONT = "'Chakra Petch', sans-serif";

// Preset Colors 
// eslint-disable-next-line react-refresh/only-export-components
export const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#14B8A6', '#3B82F6',
  '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0D9488', '#2563EB',
  '#FCA5A5', '#FDBA74', '#FDE68A', '#86EFAC', '#99F6E4', '#93C5FD',
];

// ─── Shapes (Matter.js Bodies only) ─────────────────────────────
const SHAPES = [
  {
    key: 'rectangle',
    label: 'สี่เหลี่ยม',
    icon: (
      <svg width="30" height="30" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="8" y="8" width="20" height="20" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'circle',
    label: 'วงกลม',
    icon: (
      <svg width="30" height="30" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="18" cy="18" r="11" />
      </svg>
    ),
  },
  {
    key: 'polygon-3',
    label: 'สามเหลี่ยม',
    icon: (
      <svg width="30" height="30" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polygon points="18,7 30,29 6,29" />
      </svg>
    ),
  },
];

// ═══════════════════════════════════════════════════════════════
//  ObjectAppearancePicker  –  Portal popup
// ═══════════════════════════════════════════════════════════════
export default function ObjectAppearancePicker({
  color,
  shape,
  onColorChange,
  onShapeChange,
  onClose,
  onConfirm,
  getAnchor,
}) {
  const popupRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const el = getAnchor ? getAnchor() : null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });

    const update = () => {
      const el = getAnchor ? getAnchor() : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, []); 

  useEffect(() => {
    const handler = (e) => {
      const el = getAnchor ? getAnchor() : null;
      if (
        popupRef.current && !popupRef.current.contains(e.target) &&
        (!el || !el.contains(e.target))
      ) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, getAnchor]);

  const popup = (
    <div
      ref={popupRef}
      style={{ top: pos.top, left: pos.left, fontFamily: FONT }}
      className="fixed z-[9999] w-[262px] animate-[pickerPopIn_0.15s_ease-out]"
    >
      {/* Card */}
      <div className="bg-theme-panel rounded-xl border border-theme-border shadow-xl p-[20px_18px_18px_18px] relative">

        {/* ✕ close button */}
        <button
          onClick={onClose}
          className="absolute -top-3.5 -right-3.5 w-9 h-9 rounded-full bg-[#EF4444] border-2 border-white dark:border-[#1E1F22] cursor-pointer flex items-center justify-center shadow-md z-10 hover:bg-[#DC2626] transition-colors"
          title="ปิด"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ─── COLOR SECTION ─── */}
        <h4 className="m-0 mb-3 text-[14px] font-bold text-theme-primary">
          สีพื้นฐาน
        </h4>

        <div className="grid grid-cols-6 gap-2 mb-4">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full cursor-pointer transition-all duration-150 ring-offset-2 ring-offset-theme-panel hover:scale-110 
                ${color === c ? 'ring-2 ring-theme-primary scale-110 shadow-sm' : 'ring-0'}
              `}
              title={c}
            />
          ))}
        </div>

        {/* ─── DIVIDER ─── */}
        <div className="border-t border-theme-border mb-3.5" />

        {/* ─── SHAPE SECTION ─── */}
        <h4 className="m-0 mb-3 text-[14px] font-bold text-theme-primary">
          รูปทรงพื้นฐาน
        </h4>

        <div className="flex gap-2 flex-wrap">
          {SHAPES.map((sh) => (
            <button
              key={sh.key}
              onClick={() => onShapeChange(sh.key)}
              className={`w-10 h-10 rounded-lg cursor-pointer flex items-center justify-center transition-all duration-150 border 
                ${shape === sh.key 
                  ? 'border-[#FFB65A] bg-[#FFB65A]/10 text-[#FFB65A] scale-105 shadow-sm' 
                  : 'border-theme-border bg-theme-main text-theme-muted hover:border-[#FFB65A] hover:text-[#FFB65A] hover:scale-105'
                }
              `}
              title={sh.label}
            >
              {sh.icon}
            </button>
          ))}
        </div>

        {/* ─── CONFIRM BUTTON ─── */}
        <button
          onClick={onConfirm || onClose}
          className="mt-5 w-full py-2.5 bg-[#FFB65A] text-gray-900 font-bold text-[15px] rounded-lg cursor-pointer transition-colors hover:bg-[#F0A03E] shadow-sm tracking-wide"
        >
          ยืนยัน
        </button>
      </div>

      <style>{`
        @keyframes pickerPopIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );

  return createPortal(popup, document.body);
}