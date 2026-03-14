import Matter from 'matter-js';

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
//
// World (UI) — Y-up:
//   - Ground surface  = y_world = 0
//   - Object 40m high = y_world = 40
//   - Upward velocity = positive
//
// Matter.js — Y-down:
//   - y increases downward
//   - Conversion: matter_y = -world_y * PPM
//   - Ground surface  = matter_y = 0
//   - Object 40m high = matter_y = -4000 px  (negative = above ground)
//   - Ground body center sits at matter_y = +20.5 * PPM (below surface)
//
// Force/Velocity Y sign:
//   - World upward  (+) → Matter Y negative  (-)
//   - World downward(-) → Matter Y positive  (+)
//
// ─────────────────────────────────────────────────────────────────────────────

export const PIXELS_PER_METER = 100; // 1m = 100px

/**
 * Converts world coordinates (meters, Y-up) to Matter pixels (Y-down).
 */
export const worldToMatter = (xWorld, yWorld) => ({
  x: xWorld * PIXELS_PER_METER,
  y: -yWorld * PIXELS_PER_METER,
});

/**
 * Converts Matter pixels (Y-down) back to world coordinates (meters, Y-up).
 */
export const matterToWorld = (xPx, yPx) => ({
  x: xPx / PIXELS_PER_METER,
  y: -yPx / PIXELS_PER_METER,
});

// ─────────────────────────────────────────────────────────────────────────────
// GRAVITY FORMULA
// ─────────────────────────────────────────────────────────────────────────────
//
// Matter applies gravity each tick as:
//   body.velocity += gravity.y * gravity.scale * deltaTime_ms
//
// We want real acceleration: a = g m/s² (downward = +Y in Matter)
// Per tick (dt = 1/60 s, delta_ms = 1000/60):
//
//   gravity.y * delta_ms = g * PPM * (delta_ms / 1000)
//   gravity.y = g * PPM / 1000
//
// ─────────────────────────────────────────────────────────────────────────────

export const computeGravityY = (g) => (g * PIXELS_PER_METER) / 1000;

/**
 * Creates the Matter.js engine with correct gravity defaults.
 */
export const createPhysicsEngine = () => {
  Matter.Resolver._restingThresh = 0.05;

  const engine = Matter.Engine.create({
    positionIterations: 30,
    velocityIterations: 20,
    enableSleeping: false,
  });

  engine.world.gravity.scale = 1;
  engine.world.gravity.x = 0;
  engine.world.gravity.y = computeGravityY(9.8);

  return engine;
};

/**
 * Creates the static ground body.
 *
 * Ground surface is at matter_y = 0.
 * Ground body center is at matter_y = +20.5*PPM (Y-down = below surface).
 */
export const createGround = () => {
  return Matter.Bodies.rectangle(
    0,
    20.5 * PIXELS_PER_METER,
    100000,
    41 * PIXELS_PER_METER,
    {
      isStatic: true,
      label: 'ground',
      friction: 0.0,
      frictionAir: 0.0,
      frictionStatic: 0.0,
      restitution: 0.0,
    }
  );
};

const SETTLE_SPEED_PX = 0.01; // px/ms — below this = effectively at rest
const SETTLE_DIST_PX  = 1;    // px — how close to resting Y to snap

/**
 * Performs a single fixed-timestep physics update.
 *
 * @param {Matter.Engine} engine
 * @param {number} dtMs        - fixed delta in ms (e.g. 1000/60)
 * @param {object} state       - simState { gravity, objects }
 * @param {Map}    bodyMap     - Map<string, Matter.Body>
 * @param {number} maxTime     - max simulation time in seconds
 * @param {object} timeState   - { time, isPlaying }
 * @param {function} setIsPlaying
 */
export const updatePhysics = (engine, dtMs, state, bodyMap, timeState, setIsPlaying) => {
  if (!timeState.isPlaying) return;

  let hasActiveObject = false;
  let allSettled = true;

  if (state?.objects) {
    for (const obj of state.objects) {
      if (!obj.isSpawned) continue;

      const body = bodyMap.get(obj.id);
      if (!body) continue;

      hasActiveObject = true;

      // Radius in pixels
      const radiusPx =
        body.circleRadius ??
        (body.plugin?.size != null
          ? (body.plugin.size / 2) * PIXELS_PER_METER
          : 0.5 * PIXELS_PER_METER);

      // Resting position in Matter Y-down:
      // surface is at y=0. Object is ABOVE surface (negative Y).
      // Center rests at y = -radiusPx
      const restingY = -radiusPx;
      const distFromRest = Math.abs(body.position.y - restingY);
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);

      if (distFromRest <= SETTLE_DIST_PX && speed < SETTLE_SPEED_PX) {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setPosition(body, { x: body.position.x, y: restingY });
      } else {
        // Anti-Noclip: ป้องกันวัตถุทะลุพื้นลงไป (Matter Y moves down)
        // ถ้า y ลงไปเกินพื้น (ซึ่งคือ restingY) ให้ดึงกลับขึ้นมาทันที
        if (body.position.y > restingY + 2) { // 2px margin
           Matter.Body.setPosition(body, { x: body.position.x, y: restingY });
           if (body.velocity.y > 0) Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
        }
        allSettled = false;
      }

      // ── Apply forces ──────────────────────────────────────────────────────
      //
      // F_world in Newtons. Matter applyForce unit: mass * px / tick²
      //
      // F_matter = F_N * PPM * (dtS²)
      // where dtS = dtMs / 1000
      //
      // forceScale: เพื่อแปลง N (world) เป็น Matter force
      // a = F/m -> Δv = (F/m) * Δt
      const forceScale = PIXELS_PER_METER / 1000;

      const forces = [...(obj.values?.forces || [])];
      if (obj.values?.force != null) {
        forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
      }

      for (const f of forces) {
        const mag = f.magnitude * forceScale;
        const angleRad = (f.angle * Math.PI) / 180;
        Matter.Body.applyForce(body, body.position, {
          x:  mag * Math.cos(angleRad),
          y: -mag * Math.sin(angleRad), // negate: world Y-up → Matter Y-down
        });
      }
    }
  }

  // Nothing spawned → stop immediately
  if (!hasActiveObject) {
    timeState.isPlaying = false;
    setIsPlaying(false);
    return;
  }

  // All settled or time exceeded → stop
  if (allSettled) {
    timeState.isPlaying = false;
    setIsPlaying(false);
    return;
  }

  Matter.Engine.update(engine, dtMs);
};
