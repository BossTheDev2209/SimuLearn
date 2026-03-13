export const PIXELS_PER_METER = 100;

/**
 * Draws an arrow representing a vector on the canvas.
 */
/**
 * Draws an arrow representing a vector on the canvas.
 */
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
  ctx.lineTo(
    toPos.x - headlen * Math.cos(angle - Math.PI / 6),
    toPos.y - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toPos.x, toPos.y);
  ctx.lineTo(
    toPos.x - headlen * Math.cos(angle + Math.PI / 6),
    toPos.y - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.stroke();
  ctx.restore();
};

/**
 * Renders all vectors (Velocity, Force, Resultant) for a simulation object.
 */
export const renderObjectVectors = (ctx, toScreen, obj, body, showResultantVector) => {
  if (!body) return;

  let sumVx = 0, sumVy = 0;
  let sumFx = 0, sumFy = 0;

  // 1. Gather components
  const vels = [...(obj.values?.velocities || [])];
  if (obj.values?.velocity) {
    vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
  }

  const forces = [...(obj.values?.forces || [])];
  if (obj.values?.force) {
    forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
  }

  // Calculate sums
  vels.forEach(v => {
    sumVx += v.magnitude * Math.cos((v.angle * Math.PI) / 180);
    sumVy += v.magnitude * Math.sin((v.angle * Math.PI) / 180);
  });
  forces.forEach(f => {
    sumFx += f.magnitude * Math.cos((f.angle * Math.PI) / 180);
    sumFy += f.magnitude * Math.sin((f.angle * Math.PI) / 180);
  });

  const hasMultipleForces = forces.length > 1;

  // 1. Velocity Vectors (Blue)
  vels.forEach((v) => {
    const vx = v.magnitude * Math.cos((v.angle * Math.PI) / 180);
    const vy = v.magnitude * Math.sin((v.angle * Math.PI) / 180);
    const originX = body.position.x + (v.offsetX || 0);
    const originY = body.position.y + (v.offsetY || 0);
    drawArrow(ctx, toScreen, originX, originY, originX + vx * 0.2, originY + vy * 0.2, '#3B82F6');
  });

  // 2. Force Vectors (Red) - Faint if resultant is shown
  forces.forEach((f) => {
    const fx = f.magnitude * Math.cos((f.angle * Math.PI) / 180);
    const fy = f.magnitude * Math.sin((f.angle * Math.PI) / 180);
    const originX = body.position.x + (f.offsetX || 0);
    const originY = body.position.y + (f.offsetY || 0);
    drawArrow(
      ctx, toScreen, originX, originY, originX + fx * 0.2, originY + fy * 0.2, 
      '#EF4444', 2.5, (hasMultipleForces && showResultantVector) ? 0.3 : 1.0
    );
  });

  // 3. Resultant Force Vector (Purple)
  if (showResultantVector && hasMultipleForces) {
    const resX = sumFx * 0.2;
    const resY = sumFy * 0.2;
    if (Math.abs(resX) > 0.01 || Math.abs(resY) > 0.01) {
      drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + resX, body.position.y + resY, '#A855F7', 4);
    }
  }

  // 4. Legacy Resultant (Velocity + Force combine?) - Only if explicitly requested via parameter
  // For now, we follow the Forces Resultant as priority.
};
