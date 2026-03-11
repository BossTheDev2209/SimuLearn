import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
//อันนี้ผมให้ AI ทำ 100% เลยนะ
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
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="8" y="8" width="20" height="20" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'circle',
    label: 'วงกลม',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="18" r="11" />
      </svg>
    ),
  },
  {
    key: 'polygon-3',
    label: 'สามเหลี่ยม',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2">
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

  // Position relative to anchor — calculated ONCE on mount only,
  // to avoid re-positioning jumps on every color/shape change.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty — run once on mount only

  // Close on outside click
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
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: pos.top,
        left: pos.left,
        width: 262,
        fontFamily: FONT,
        animation: 'pickerPopIn 0.18s ease-out',
      }}
    >
      {/* Card */}
      <div style={{
        background: '#313338',
        borderRadius: 14,
        border: '1px solid #1E1F22',
        boxShadow: '0 8px 28px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2)',
        padding: '20px 18px 18px 18px',
        position: 'relative',
      }}>

        {/* ✕ close button — top-right, red */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#EF4444',
            border: '2px solid white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            zIndex: 10,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#DC2626')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#EF4444')}
          title="ปิด"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ─── COLOR SECTION ─── */}
        <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#DBDEE1', fontFamily: FONT }}>
          สีพื้นฐาน
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 16 }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: c,
                // Always 3px border to prevent layout shifts on selection
                border: color === c ? '3px solid #DBDEE1' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'transform 0.12s',
                boxShadow: color === c ? '0 0 0 1.5px rgba(219,222,225,0.4)' : '0 0 0 1.5px rgba(0,0,0,0.3)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title={c}
            />
          ))}
        </div>

        {/* ─── DIVIDER ─── */}
        <div style={{ borderTop: '1px solid #1E1F22', marginBottom: 14 }} />

        {/* ─── SHAPE SECTION ─── */}
        <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#DBDEE1', fontFamily: FONT }}>
          รูปทรงพื้นฐาน
        </h4>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {SHAPES.map((sh) => (
            <button
              key={sh.key}
              onClick={() => onShapeChange(sh.key)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: shape === sh.key ? '2px solid #F0A03E' : '2px solid #1E1F22',
                backgroundColor: shape === sh.key ? '#3F4147' : '#2B2D31',
                color: shape === sh.key ? '#F0A03E' : '#949BA4',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                if (shape !== sh.key) e.currentTarget.style.borderColor = '#3F4147';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                if (shape !== sh.key) e.currentTarget.style.borderColor = '#1E1F22';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={sh.label}
            >
              {sh.icon}
            </button>
          ))}
        </div>

        {/* ─── CONFIRM BUTTON ─── */}
        <button
          onClick={onConfirm || onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '10px 0',
            backgroundColor: '#22C55E',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
            fontFamily: FONT,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#16A34A')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#22C55E')}
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
