import React from 'react';
import { PIXELS_PER_METER } from '../constants';

export const TrackingSystem = ({ objects, bodies, offset, zoom, size, onTeleport }) => {
  if (!objects || !bodies) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-[400]">
      {objects.map(obj => {
        const body = bodies[obj.id];
        if (!body) return null;

        const screenX = (body.position.x * PIXELS_PER_METER * zoom) + (size.w / 2 + offset.x);
        const screenY = (size.h / 2 + offset.y) - (body.position.y * PIXELS_PER_METER * zoom);
        
        const margin = 40;
        const isOffScreen = screenX < margin || screenX > size.w - margin || screenY < margin || screenY > size.h - margin;
        
        if (!isOffScreen) return null;

        const edgeX = Math.max(margin, Math.min(size.w - margin, screenX));
        const edgeY = Math.max(margin, Math.min(size.h - margin, screenY));
        
        const dx = body.position.x - ((-offset.x) / (PIXELS_PER_METER * zoom));
        const dy = body.position.y - (offset.y / (PIXELS_PER_METER * zoom));
        const dist = Math.sqrt(dx*dx + dy*dy).toFixed(1);
        const opacity = Math.max(0.35, 1 - (dist / 1000));

        return (
          <div key={obj.id} className="absolute flex items-center gap-2 pointer-events-auto" style={{ left: edgeX, top: edgeY, opacity, transform: 'translate(-50%, -50%)' }}>
            <div 
              className="w-0 h-0 border-y-[6px] border-y-transparent border-r-[10px]" 
              style={{ borderRightColor: obj.color, transform: `rotate(${Math.atan2(screenY - edgeY, screenX - edgeX)}rad)` }} 
            />
            <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-2 backdrop-blur-md border border-white/10 shadow-xl">
              <span className="font-bold">{dist}m</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onTeleport(body.position.x, body.position.y); }}
                className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                title="Teleport to Object"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
