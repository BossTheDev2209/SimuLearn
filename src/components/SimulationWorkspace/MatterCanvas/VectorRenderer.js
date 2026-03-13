export const PIXELS_PER_METER = 100;
export const drawArrow = (ctx, toScreen, fromWx, fromWy, toWx, toWy, color, thickness = 2.5, opacity = 1.0) => {
  const fromPos = toScreen(fromWx, fromWy);
  const toPos = toScreen(toWx, toWy);
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
  ctx.stroke();
  ctx.restore();
};

export const renderObjectVectors = (ctx, toScreen, obj, body, showResultantVector) => {
  if (!body) return;
  const vels = [...(obj.values?.velocities || [])];
  const forces = [...(obj.values?.forces || [])];

  const calculateSum = (arr) => {
    let sx = 0, sy = 0;
    arr.forEach(a => {
      sx += a.magnitude * Math.cos((a.angle * Math.PI) / 180);
      sy += a.magnitude * Math.sin((a.angle * Math.PI) / 180);
    });
    return { sx, sy };
  };

  const vSum = calculateSum(vels);
  const fSum = calculateSum(forces);

  // --- A. Velocity (Blue) ---
  vels.forEach(v => {
    const vx = v.magnitude * Math.cos((v.angle * Math.PI) / 180);
    const vy = v.magnitude * Math.sin((v.angle * Math.PI) / 180);
    drawArrow(ctx, toScreen, body.position.x + (v.offsetX||0), body.position.y + (v.offsetY||0), body.position.x + (v.offsetX||0) + vx * 0.2, body.position.y + (v.offsetY||0) + vy * 0.2, '#3B82F6', 2.5, vels.length > 1 ? 0.2 : 1.0);
  });
  if (vels.length > 1) drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + vSum.sx * 0.2, body.position.y + vSum.sy * 0.2, '#3B82F6', 3.5);

  // --- B. Force (Red) --- ห้ามเป็นสีม่วง!
  forces.forEach(f => {
    const fx = f.magnitude * Math.cos((f.angle * Math.PI) / 180);
    const fy = f.magnitude * Math.sin((f.angle * Math.PI) / 180);
    drawArrow(ctx, toScreen, body.position.x + (f.offsetX||0), body.position.y + (f.offsetY||0), body.position.x + (f.offsetX||0) + fx * 0.2, body.position.y + (f.offsetY||0) + fy * 0.2, '#EF4444', 2.5, forces.length > 1 ? 0.2 : 1.0);
  });
  if (forces.length > 1) drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + fSum.sx * 0.2, body.position.y + fSum.sy * 0.2, '#EF4444', 3.5);

  // --- C. Net Force (Purple) --- สงวนไว้สำหรับแรงลัพธ์สุทธิเท่านั้น
  if (showResultantVector && (Math.abs(fSum.sx) > 0.01 || Math.abs(fSum.sy) > 0.01)) {
    drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + fSum.sx * 0.2, body.position.y + fSum.sy * 0.2, '#A855F7', 4.5);
  }
};