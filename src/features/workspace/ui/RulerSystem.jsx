import React, { useMemo, useState, useEffect } from 'react';
import { PIXELS_PER_METER } from '../../../constants/defaultSettings';

export const RulerSystem = ({ rulerPoints, setRulerPoints, activeTool, offset, zoom, size, unitStep, matterCanvasRef }) => {
  const toScreen = (wx, wy) => {
    const PPM_ZOOMED = PIXELS_PER_METER * zoom;
    return {
      x: size.w / 2 + offset.x + wx * PPM_ZOOMED,
      y: size.h / 2 + offset.y - wy * PPM_ZOOMED
    };
  };

  const segments = useMemo(() => {
    const s = [];
    for (let i = 0; i < rulerPoints.length - 1; i++) {
      const p1 = rulerPoints[i];
      const p2 = rulerPoints[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      s.push({ p1, p2, dist });
    }
    return s;
  }, [rulerPoints]);

  if (rulerPoints.length === 0 && activeTool !== 'ruler') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[350] font-['Chakra_Petch'] overflow-hidden">
      <svg className="w-full h-full overflow-visible">
        <defs>
          <filter id="ruler-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Segments */}
        {segments.map((seg, i) => {
          const s1 = toScreen(seg.p1.x, seg.p1.y);
          const s2 = toScreen(seg.p2.x, seg.p2.y);
          return (
            <g key={i}>
              <line 
                x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} 
                stroke="#FFB65A" strokeWidth="4" strokeLinecap="round" opacity="0.4"
                filter="url(#ruler-glow)"
              />
              <line 
                x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} 
                stroke="#FFB65A" strokeWidth="2" strokeLinecap="round"
              />
              {/* Distance Label */}
              <g transform={`translate(${(s1.x + s2.x) / 2}, ${(s1.y + s2.y) / 2})`}>
                <text 
                  textAnchor="middle" dominantBaseline="middle" dy="1"
                  fill="#FFB65A" fontSize="12" fontWeight="bold"
                  style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
                >
                  {seg.dist.toFixed(1)}m
                </text>
              </g>
            </g>
          );
        })}

        {/* Points */}
        {rulerPoints.map((p, i) => {
          const s = toScreen(p.x, p.y);
          return (
            <circle 
              key={i} cx={s.x} cy={s.y} r="5" 
              fill="#FFB65A" stroke="white" strokeWidth="2" 
              className="drop-shadow-md"
            />
          );
        })}
      </svg>
    </div>
  );
};
