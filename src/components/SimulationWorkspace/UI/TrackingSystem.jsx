import React, { useMemo } from 'react';
import { PIXELS_PER_METER } from '../constants';

export const TrackingSystem = ({ objects, bodies, offset, zoom, size, onTeleport, showOffScreenIndicators }) => {
  const offScreenIndicators = useMemo(() => {
    if (!objects || !bodies || showOffScreenIndicators === false) return [];

    const indicators = [];
    const margin = 50;
    const PPM_ZOOMED = PIXELS_PER_METER * zoom;

    objects.forEach(obj => {
      const body = bodies[obj.id];
      if (!body) return;

      // body.position เป็น world meters (Y-up)
      const screenX = (body.position.x * PPM_ZOOMED) + (size.w / 2 + offset.x);
      const screenY = (size.h / 2 + offset.y) - (body.position.y * PPM_ZOOMED);

      // รัศมีในหน่วยพิกเซล
      const radiusPx = ((obj.size || 1) * PPM_ZOOMED) / 2;

      // แสดง indicator เมื่อวัตถุทั้งก้อน (รวมรัศมี) หลุดออกนอกจอ
      const isOffScreen =
        screenX + radiusPx < 0 || screenX - radiusPx > size.w ||
        screenY + radiusPx < 0 || screenY - radiusPx > size.h;

      if (!isOffScreen) return;

      indicators.push({
        id: obj.id,
        name: obj.name || 'วัตถุ',
        color: obj.color,
        pos: { x: body.position.x, y: body.position.y }, // world meters
        screen: { x: screenX, y: screenY },
        edge: {
          x: Math.max(margin, Math.min(size.w - margin, screenX)),
          y: Math.max(margin, Math.min(size.h - margin, screenY)),
        },
      });
    });

    // Cluster indicators ที่อยู่ใกล้กันบนขอบจอ
    const clusters = [];
    const used = new Set();
    indicators.forEach((ind, i) => {
      if (used.has(ind.id)) return;
      const cluster = [ind];
      used.add(ind.id);
      for (let j = i + 1; j < indicators.length; j++) {
        const other = indicators[j];
        if (used.has(other.id)) continue;
        const dx = ind.edge.x - other.edge.x;
        const dy = ind.edge.y - other.edge.y;
        if (Math.sqrt(dx * dx + dy * dy) < 60) {
          cluster.push(other);
          used.add(other.id);
        }
      }
      clusters.push(cluster);
    });

    return clusters;
  }, [objects, bodies, offset, zoom, size, showOffScreenIndicators]);

  if (offScreenIndicators.length === 0) return null;

  return (
    // ✅ z-[40] เพื่อให้อยู่หลัง Toolbar (z-50)
    <div className="absolute inset-0 pointer-events-none z-[40] font-['Chakra_Petch']">
      {offScreenIndicators.map(cluster => {
        const lead = cluster[0];
        const isCluster = cluster.length > 1;

        const PPM_ZOOMED = PIXELS_PER_METER * zoom;
        const camX = -offset.x / PPM_ZOOMED;
        const camY =  offset.y / PPM_ZOOMED;
        const dx = lead.pos.x - camX;
        const dy = lead.pos.y - camY;
        const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
        const opacity = Math.max(0.6, 1 - (dist / 1500));

        const avgX = cluster.reduce((sum, item) => sum + item.edge.x, 0) / cluster.length;
        const avgY = cluster.reduce((sum, item) => sum + item.edge.y, 0) / cluster.length;

        // มุมที่ arrow ชี้ไปหาวัตถุ
        const arrowAngle = Math.atan2(lead.screen.y - avgY, lead.screen.x - avgX);

        return (
          // ✅ ใช้ CSS translate property แทน transform เพื่อไม่ทับ transform ของ child
          // pointer-events-auto อยู่ที่นี่เพื่อรับคลิก
          <div
            key={lead.id}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{ left: avgX, top: avgY, opacity, translate: '-50% -50%' }}
            onClick={(e) => { e.stopPropagation(); onTeleport(lead.pos.x, lead.pos.y); }}
          >
            <div className="flex items-center gap-2 active:scale-95 transition-transform">

              {/* Directional Arrow — transform อยู่ใน div ของตัวเองไม่กระทบ parent */}
              <div
                className="w-0 h-0 border-y-[7px] border-y-transparent border-r-[12px] shrink-0 shadow-sm transition-transform group-hover:scale-110"
                style={{
                  borderRightColor: lead.color,
                  transform: `rotate(${arrowAngle}rad)`,
                }}
              />

              {/* Info Pill */}
              <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-xl transition-all group-hover:brightness-110 ${isCluster ? 'bg-[#FFB65A] text-gray-900' : 'bg-black/80 text-white'}`}>
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-bold whitespace-nowrap">
                    {isCluster ? `${cluster.length} วัตถุ` : lead.name}
                  </span>
                  <span className={`text-[9px] font-bold ${isCluster ? 'text-gray-800/80' : 'text-[#FFB65A]'}`}>
                    {dist}m
                  </span>
                </div>

                {/* Teleport Visual Circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-inner transition-all group-hover:scale-110 ${isCluster ? 'bg-black/10' : 'bg-white/10'}`}>
                  <div className={`w-2 h-2 rounded-full border-2 ${isCluster ? 'border-black/60' : 'border-white/80'}`} />
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};