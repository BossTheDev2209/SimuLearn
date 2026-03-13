import React from 'react';

/**
 * Utility to find a "nice" step increment for grid lines.
 */
export const niceStep = (rawStep) => {
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / pow;
  if (frac <= 1) return pow;
  if (frac <= 2) return 2 * pow;
  if (frac <= 5) return 5 * pow;
  return 10 * pow;
};

/**
 * Formats values for grid labels.
 */
export const formatLabel = (value) => {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1e6) return value.toExponential(1);
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
};

const GridView = ({ size, offset, zoom }) => {
  const { w, h } = size;
  const PIXELS_PER_METER = 100;
  const pxPerUnit = PIXELS_PER_METER * zoom;
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;
  
  const desiredPxGap = 100;
  const rawUnitStep = desiredPxGap / pxPerUnit;
  const unitStep = niceStep(rawUnitStep);
  const pxStep = unitStep * pxPerUnit;
  const subStep = pxStep / 5;

  const lines = [];
  const labels = [];

  // 1. Vertical Lines & X-Axis Labels
  const startV = Math.floor((-ox) / pxStep) - 1;
  const endV = Math.ceil((w - ox) / pxStep) + 1;
  for (let i = startV; i <= endV; i++) {
    const xPx = ox + i * pxStep;
    lines.push({ key: `vM${i}`, x1: xPx, y1: 0, x2: xPx, y2: h, strokeWidth: 1, isMajor: true });
    
    for (let s = 1; s < 5; s++) {
      const sx = xPx + s * subStep;
      lines.push({ key: `vS${i}_${s}`, x1: sx, y1: 0, x2: sx, y2: h, strokeWidth: 0.5, isMajor: false });
    }
    
    const val = i * unitStep;
    if (Math.abs(val) > 1e-10) {
      const labelY = Math.min(Math.max(oy + 16, 16), h - 4);
      labels.push({ key: `lX${i}`, x: xPx, y: labelY, textAnchor: "middle", val });
    }
  }

  // 2. Horizontal Lines & Y-Axis Labels
  const startH = Math.floor((-oy) / pxStep) - 1;
  const endH = Math.ceil((h - oy) / pxStep) + 1;
  for (let i = startH; i <= endH; i++) {
    const yPx = oy + i * pxStep;
    lines.push({ key: `hM${i}`, x1: 0, y1: yPx, x2: w, y2: yPx, strokeWidth: 1, isMajor: true });
    
    for (let s = 1; s < 5; s++) {
      const sy = yPx + s * subStep;
      lines.push({ key: `hS${i}_${s}`, x1: 0, y1: sy, x2: w, y2: sy, strokeWidth: 0.5, isMajor: false });
    }
    
    const val = -i * unitStep;
    if (Math.abs(val) > 1e-10) {
      const labelX = Math.min(Math.max(ox + 6, 6), w - 30);
      labels.push({ key: `lY${i}`, x: labelX, y: yPx + 4, textAnchor: "start", val });
    }
  }

  const axisXY = Math.min(Math.max(oy, 0), h);
  const axisYX = Math.min(Math.max(ox, 0), w);

  return (
    <svg width={size.w} height={size.h} className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {lines.map((l) => (
        <line
          key={l.key}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          strokeWidth={l.strokeWidth}
          className={l.isMajor ? "stroke-gray-300 dark:stroke-[#50535C]" : "stroke-gray-200 dark:stroke-[#3F4147]"}
        />
      ))}
      {/* Primary Axes */}
      <line x1={0} y1={axisXY} x2={w} y2={axisXY} className="stroke-gray-400 dark:stroke-[#B5BAC1]" strokeWidth={4} />
      <line x1={axisYX} y1={0} x2={axisYX} y2={h} className="stroke-gray-400 dark:stroke-[#B5BAC1]" strokeWidth={1.8} />
      <circle cx={ox} cy={oy} r={3.5} className="fill-gray-400 dark:fill-[#B5BAC1]" />
      
      {/* Labels */}
      {labels.map((lbl) => (
        <text
          key={lbl.key}
          x={lbl.x}
          y={lbl.y}
          textAnchor={lbl.textAnchor}
          className="fill-gray-500 dark:fill-[#949BA4]"
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {formatLabel(lbl.val)}
        </text>
      ))}
    </svg>
  );
};

export default React.memo(GridView);
