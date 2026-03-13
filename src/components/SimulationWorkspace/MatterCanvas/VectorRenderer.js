export const PIXELS_PER_METER = 100;

/**
 * Draws an arrow representing a vector on the canvas.
 */
export const drawArrow = (ctx, toScreen, fromWx, fromWy, toWx, toWy, color, thickness = 2.5) => {
  const fromPos = toScreen(fromWx, fromWy);
  const toPos = toScreen(toWx, toWy);
  const headlen = 10;
  const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

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
};

/**
 * Renders all vectors (Velocity, Force, Resultant) for a simulation object.
 */
export const renderObjectVectors = (ctx, toScreen, obj, body, showResultantVector) => {
  if (!body) return;

  let sumVx = 0, sumVy = 0;
  let sumFx = 0, sumFy = 0;

  // 1. Velocity Vectors (Blue)
  const vels = [...(obj.values?.velocities || [])];
  if (obj.values?.velocity) {
    vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
  }

  vels.forEach((v) => {
    const vx = v.magnitude * Math.cos((v.angle * Math.PI) / 180);
    const vy = v.magnitude * Math.sin((v.angle * Math.PI) / 180);
    sumVx += vx;
    sumVy += vy;
    drawArrow(
      ctx,
      toScreen,
      body.position.x,
      body.position.y,
      body.position.x + vx * 0.2, // Visual scaling factor
      body.position.y + vy * 0.2,
      '#3B82F6'
    );
  });

  // 2. Force Vectors (Red)
  const forces = [...(obj.values?.forces || [])];
  if (obj.values?.force) {
    forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
  }

  forces.forEach((f) => {
    const fx = f.magnitude * Math.cos((f.angle * Math.PI) / 180);
    const fy = f.magnitude * Math.sin((f.angle * Math.PI) / 180);
    sumFx += fx;
    sumFy += fy;
    drawArrow(
      ctx,
      toScreen,
      body.position.x,
      body.position.y,
      body.position.x + fx * 0.2,
      body.position.y + fy * 0.2,
      '#EF4444'
    );
  });

  // 3. Resultant Vector (Purple) - Logic from Phase 1
  if (showResultantVector) {
    const resX = (sumVx + sumFx) * 0.2;
    const resY = (sumVy + sumFy) * 0.2;
    if (Math.abs(resX) > 0.01 || Math.abs(resY) > 0.01) {
      drawArrow(
        ctx,
        toScreen,
        body.position.x,
        body.position.y,
        body.position.x + resX,
        body.position.y + resY,
        '#A855F7',
        4 // Thicker for resultant
      );
    }
  }
};
