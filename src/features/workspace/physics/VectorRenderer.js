import { matterToWorld } from './PhysicsEngine';

export const PIXELS_PER_METER = 100;

/**
 * วาด arrow จาก world coords (meters, Y-up) ไปยัง world coords
 * toScreen แปลง world meters → screen pixels
 */
export const drawArrow = (ctx, toScreen, fromWx, fromWy, toWx, toWy, color, thickness = 2.5, opacity = 1.0, label = null) => {
  const fromPos = toScreen(fromWx, fromWy);
  const toPos   = toScreen(toWx,   toWy);

  const headlen = 10;
  const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.lineTo(toPos.x, toPos.y);
  ctx.lineTo(toPos.x - headlen * Math.cos(angle - Math.PI / 6), toPos.y - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toPos.x, toPos.y);
  ctx.lineTo(toPos.x - headlen * Math.cos(angle + Math.PI / 6), toPos.y - headlen * Math.sin(angle + Math.PI / 6));
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Draw Label
  if (label) {
    ctx.font = 'bold 10px "Chakra Petch"';
    ctx.fillStyle = color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillText(label, toPos.x + 8, toPos.y - 8);
  }
  ctx.restore();
};

/**
 * วาด velocity และ force vectors ของ object หนึ่งชิ้น
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {function} toScreen - แปลง (worldX, worldY) → screen {x, y}
 * @param {object} obj - simState object { values: { velocities, forces, ... } }
 * @param {Matter.Body} body - Matter.js body (position เป็น Matter px, Y-down)
 * @param {boolean} showResultantVector - แสดง net force สีม่วงหรือไม่
 * @param {number} gravity - ค่าแรงโน้มถ่วงจาก simState
 */
export const renderObjectVectors = (ctx, toScreen, obj, body, showResultantVector, gravity = 9.8) => {
  if (!body) return;

  // ✅ แปลง body.position จาก Matter px (Y-down) → world meters (Y-up)
  // เพราะ toScreen รับ world meters ไม่ใช่ pixels
  const origin = matterToWorld(body.position.x, body.position.y);

  // รวบรวม velocities
  const vels = [...(obj.values?.velocities || [])];
  if (obj.values?.velocity != null && obj.values.velocity > 0) {
    vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
  }

  // รวบรวม forces
  const forces = [...(obj.values?.forces || [])];
  if (obj.values?.force != null && obj.values.force > 0) {
    forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
  }

  if (vels.length === 0 && forces.length === 0) return;

  // SCALE: 0.3 ม. ต่อ 1 m/s (หรือ 1N) 
  const SCALE = 0.3;
  const getVisualLength = (mag) => Math.min(Math.max(mag * SCALE, 0.5), 8.0);

  // ── A. Velocity (Blue) ──────────────────────────────────────────────────
  vels.forEach(v => {
    if (!v.magnitude || v.magnitude <= 0) return;
    const angleRad = (v.angle * Math.PI) / 180;
    const vLen = getVisualLength(v.magnitude);
    const ex = origin.x + vLen * Math.cos(angleRad);
    const ey = origin.y + vLen * Math.sin(angleRad);
    const color = v.color || '#3B82F6';
    drawArrow(ctx, toScreen, origin.x, origin.y, ex, ey, color, 2, 0.45, v.name);
  });
  
  // Resultant velocity
  if (vels.length > 1 || (vels.length === 1 && vels[0].isLegacy)) {
    let sx = 0, sy = 0;
    vels.forEach(v => {
      sx += v.magnitude * Math.cos((v.angle * Math.PI) / 180);
      sy += v.magnitude * Math.sin((v.angle * Math.PI) / 180);
    });
    if (Math.abs(sx) > 0.001 || Math.abs(sy) > 0.001) {
      const mag = Math.sqrt(sx**2 + sy**2);
      const angle = Math.atan2(sy, sx);
      const vLen = getVisualLength(mag);
      drawArrow(ctx, toScreen, origin.x, origin.y, origin.x + vLen * Math.cos(angle), origin.y + vLen * Math.sin(angle), '#3B82F6', 3.5, 1.0, 'Σv');
    }
  }

  // ── B. Force (Red) ──────────────────────────────────────────────────────
  forces.forEach(f => {
    if (!f.magnitude || f.magnitude <= 0) return;
    const angleRad = (f.angle * Math.PI) / 180;
    const fLen = getVisualLength(f.magnitude);
    const ex = origin.x + fLen * Math.cos(angleRad);
    const ey = origin.y + fLen * Math.sin(angleRad);
    const color = f.color || '#EF4444';
    drawArrow(ctx, toScreen, origin.x, origin.y, ex, ey, color, 2, 0.45, f.name);
  });
  
  // Resultant force (manual only)
  let fsx = 0, fsy = 0;
  forces.forEach(f => {
    fsx += f.magnitude * Math.cos((f.angle * Math.PI) / 180);
    fsy += f.magnitude * Math.sin((f.angle * Math.PI) / 180);
  });

  if (forces.length > 1 || (forces.length === 1 && forces[0].isLegacy)) {
    if (Math.abs(fsx) > 0.001 || Math.abs(fsy) > 0.001) {
      const mag = Math.sqrt(fsx**2 + fsy**2);
      const angle = Math.atan2(fsy, fsx);
      const vLen = getVisualLength(mag);
      drawArrow(ctx, toScreen, origin.x, origin.y, origin.x + vLen * Math.cos(angle), origin.y + vLen * Math.sin(angle), '#EF4444', 3.5, 1.0, 'ΣF_ext');
    }
  }

  // ── C. Net Force (Purple) — แสดงเมื่อ showResultantVector = true ──
  if (showResultantVector) {
    const mass = obj.values?.mass ?? 1.0;
    const weight = mass * gravity;
    const netX = fsx;
    const netY = fsy - weight;

    if (Math.abs(netX) > 0.001 || Math.abs(netY) > 0.001) {
      const mag = Math.sqrt(netX**2 + netY**2);
      const angle = Math.atan2(netY, netX);
      const vLen = getVisualLength(mag);
      // ใช้ความหนามากกว่า เพื่อแยกแยะ
      drawArrow(ctx, toScreen, origin.x, origin.y, origin.x + vLen * Math.cos(angle), origin.y + vLen * Math.sin(angle), '#A855F7', 4.5, 1.0, 'ΣF_net');
    }
  }
};