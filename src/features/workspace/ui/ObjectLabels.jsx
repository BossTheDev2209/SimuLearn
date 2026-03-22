import React, { useEffect, useRef } from 'react';
import { PIXELS_PER_METER } from '../../../constants/defaultSettings';

/**
 * ObjectLabels Overlay
 * High-performance labels that follow objects using RequestAnimationFrame.
 */
export const ObjectLabels = ({ objects, bodies, offset, zoom, size, showObjectNames }) => {
  const containerRef = useRef(null);
  const labelsRef = useRef({});

  useEffect(() => {
    if (!showObjectNames) return;

    let animationFrameId;

    const updateLabelPositions = () => {
      if (!objects || !bodies) return;

      const PPM_ZOOMED = PIXELS_PER_METER * zoom;
      const centerX = size.w / 2 + offset.x;
      const centerY = size.h / 2 + offset.y;

      objects.forEach(obj => {
        const body = bodies[obj.id];
        const el = labelsRef.current[obj.id];
        
        if (!body || !obj.isSpawned || !el) {
          if (el) el.style.display = 'none';
          return;
        }

        // Convert world meters (Y-up) to screen pixels
        // Matter bodies in our system store position as world meters (check MatterCanvas/index.jsx)
        const screenX = (body.position.x * PPM_ZOOMED) + centerX;
        const screenY = centerY - (body.position.y * PPM_ZOOMED);
        const radiusPx = ((obj.size || 1) * PPM_ZOOMED) / 2;

        // Visibility check with some margin
        const isOffScreen = screenX < -150 || screenX > size.w + 150 || screenY < -150 || screenY > size.h + 150;

        if (isOffScreen) {
          el.style.display = 'none';
        } else {
          el.style.display = 'block';
          // Use transform for hardware acceleration and smoothness
          el.style.transform = `translate3d(${screenX}px, ${screenY - radiusPx - 15}px, 0) translate(-50%, -50%)`;
        }
      });

      animationFrameId = requestAnimationFrame(updateLabelPositions);
    };

    animationFrameId = requestAnimationFrame(updateLabelPositions);
    return () => cancelAnimationFrame(animationFrameId);
  }, [objects, bodies, offset, zoom, size, showObjectNames]);

  if (!showObjectNames) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[35] overflow-hidden font-['Chakra_Petch']">
      {objects.map(obj => (
        <div
          key={obj.id}
          ref={el => { labelsRef.current[obj.id] = el; }}
          className="absolute"
          style={{ willChange: 'transform', display: 'none' }}
        >
          <div className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/20 shadow-lg">
            <span className="text-[11px] font-bold text-white whitespace-nowrap">
              {obj.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
