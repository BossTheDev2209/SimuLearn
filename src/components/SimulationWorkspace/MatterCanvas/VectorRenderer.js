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
  if (obj.values?.velocity) {
    vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0, offsetX: 0, offsetY: 0 });
  }

  const forces = [...(obj.values?.forces || [])];
  if (obj.values?.force) {
    forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0, offsetX: 0, offsetY: 0 });
  }

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

  const hasMultipleVels = vels.length > 1;
  const hasMultipleForces = forces.length > 1;

  // --- A. Velocity (Blue) ---
  const PIXELS_PER_METER = 100;
  vels.forEach(v => {
    const vx = v.magnitude * PIXELS_PER_METER * Math.cos((v.angle * Math.PI) / 180);
    const vy = v.magnitude * PIXELS_PER_METER * Math.sin((v.angle * Math.PI) / 180);
    const originX = body.position.x + (v.offsetX || 0) * PIXELS_PER_METER;
    const originY = body.position.y + (v.offsetY || 0) * PIXELS_PER_METER;
    drawArrow(ctx, toScreen, originX, originY, originX + vx * 0.2, originY + vy * 0.2, '#3B82F6', 2.5, 0.2);
  });
  if (vels.length > 0) {
    const vsx = vSum.sx * PIXELS_PER_METER;
    const vsy = vSum.sy * PIXELS_PER_METER;
    // Resultant Velocity is BLUE
    drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + vsx * 0.2, body.position.y + vsy * 0.2, '#3B82F6', 3.5, 1.0);
  }

  // --- B. Force (Red) ---
  forces.forEach(f => {
    const fx = f.magnitude * PIXELS_PER_METER * Math.cos((f.angle * Math.PI) / 180);
    const fy = f.magnitude * PIXELS_PER_METER * Math.sin((f.angle * Math.PI) / 180);
    const originX = body.position.x + (f.offsetX || 0) * PIXELS_PER_METER;
    const originY = body.position.y + (f.offsetY || 0) * PIXELS_PER_METER;
    drawArrow(ctx, toScreen, originX, originY, originX + fx * 0.2, originY + fy * 0.2, '#EF4444', 2.5, 0.2);
  });
  if (forces.length > 0) {
    const fsx = fSum.sx * PIXELS_PER_METER;
    const fsy = fSum.sy * PIXELS_PER_METER;
    // Resultant Force (of this object) is RED
    drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + fsx * 0.2, body.position.y + fsy * 0.2, '#EF4444', 3.5, 1.0);
  }

  // --- C. Net Force (Purple) ---
  // RESERVED strictly for the total summation of ALL forces when explicitly requested
  if (showResultantVector) {
    const fsx = fSum.sx * PIXELS_PER_METER;
    const fsy = fSum.sy * PIXELS_PER_METER;
    if (Math.abs(fsx) > 1 || Math.abs(fsy) > 1) {
      drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + fsx * 0.2, body.position.y + fsy * 0.2, '#A855F7', 4.5);
    }
  }
};