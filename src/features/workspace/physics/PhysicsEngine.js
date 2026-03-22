import Matter from 'matter-js';
import { DEFAULT_SETTINGS } from '../../../constants/defaultSettings';

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

  engine.gravity.scale = 0.001;
  engine.gravity.x = 0;
  engine.gravity.y = computeGravityY(9.8);

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

const SETTLE_SPEED_PX = 1.0;  // px/tick — increased for heavy object jitter
const SETTLE_DIST_PX  = 3;    // px — tolerance for resting position
const SETTLE_HOLD_S   = 0.3;  // seconds of sustained stillness before auto-stop

// Global accumulated settled time (seconds of continuous all-still rest)
let globalSettledTime = 0;

/**
 * Resets the global settled time map across runs
 */
export const resetSettledTimeMap = () => {
  globalSettledTime = 0;
};

/**
 * Performs a single fixed-timestep physics update.
 *
 * @param {Matter.Engine} engine
 * @param {number} dtMs        - fixed delta in ms (e.g. 1000/60)
 * @param {object} state       - simState { gravity, objects }
 * @param {Map}    bodyMap     - Map<string, Matter.Body>
 * @param {object} timeState   - { time, isPlaying }
 * @param {function} setIsPlaying
 */
export const updatePhysics = (engine, dtMs, state, bodyMap, timeState, setIsPlaying) => {
  if (!timeState.isPlaying) return;

  const dtS = dtMs / 1000;

  // Sync gravity from state
  engine.gravity.scale = 0.001;
  engine.gravity.x = 0;
  engine.gravity.y = computeGravityY(state?.gravity ?? 9.8);

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

      const restingY = -radiusPx;
      const distFromRest = Math.abs(body.position.y - restingY);
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);

      // Looser thresholds for jitter-free settlement without mid-hold snapping
      const isBodyInSettleZone = distFromRest <= 4 && speed < 1.5;

      if (!isBodyInSettleZone) {
        // Anti-noclip: if object has gone BELOW restingY, pull it back up
        if (body.position.y > restingY + 8) {
           Matter.Body.setPosition(body, { x: body.position.x, y: restingY });
           if (body.velocity.y > 0) Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
        }
        allSettled = false;
      }

      // Any significant linear or angular motion resets the global hold
      const isActuallyMoving = !isBodyInSettleZone || Math.abs(body.angularVelocity) > 0.1;
      if (isActuallyMoving) {
        allSettled = false;
      }

      // ── Apply forces ──────────────────────────────────────────────────────
      //
      // F_world in Newtons. Matter applyForce unit: mass * px / tick²
      // To get 1 N to produce 1 m/s² of acceleration per real second:
      // a_matter (px/dtS) = F_N * (forceScale / m) * dtMs
      // We want this to match world coordinates correctly.
      // 0.000001 handles the mapping between Newtons, kg, and 16.66ms tick correctly.
      const forceScale = PIXELS_PER_METER * 0.000001;

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

  // No active objects — early return (timer keeps counting)
  if (!hasActiveObject) {
    globalSettledTime = 0;
    return;
  }

  // All bodies must satisfy sub-threshold speed/pos to increment global timer
  if (allSettled) {
    globalSettledTime += dtS;
  } else {
    globalSettledTime = 0;
  }

  // console.log(`[PhysicsEngine] allSettled: ${allSettled}, hold: ${globalSettledTime.toFixed(3)}s`);

  // ALL objects confirmed settled for SETTLE_HOLD_S → snap to rest and stop
  if (allSettled && globalSettledTime >= SETTLE_HOLD_S) {
    for (const obj of state.objects) {
      if (!obj.isSpawned) continue;
      const body = bodyMap.get(obj.id);
      if (!body) continue;
      
      const radiusPx = body.circleRadius ?? (body.plugin?.size / 2) * PIXELS_PER_METER ?? 0;
      const restingY = -radiusPx;

      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setPosition(body, { x: body.position.x, y: restingY });
    }

    timeState.isPlaying = false;
    setIsPlaying(false);
    return 'settled';
  }

  // If not all settled but no one is "actively moving" (e.g. in the hold period)
  if (allSettled) {
    Matter.Engine.update(engine, dtMs);
    return 'settling';
  }

  // ── Damping Logic (Air, Ground, Energy Loss) ───────────────────────────────
  // Linear drag: F_drag ∝ -v. Applied as velocity scaling per timestep.
  // dampingFactor = 1 - k*dtS*60 ensures frame-rate independence.
  // (dtS is already declared at function scope above)
  const AIR_DAMP_VAL = state?.airResistance ? DEFAULT_SETTINGS.AIR_DAMPING : 0;
  const SYS_ENERGY_LOSS = state?.energyConservation ? DEFAULT_SETTINGS.SYSTEM_ENERGY_LOSS : 0;
  const GROUND_FRIC_VAL = (state?.groundFriction || 0) * DEFAULT_SETTINGS.GROUND_DAMPING;

  for (const obj of state.objects) {
    if (!obj.isSpawned) continue;
    const body = bodyMap.get(obj.id);
    if (!body) continue;

    const radiusPx = body.circleRadius ?? (body.plugin?.size / 2) * PIXELS_PER_METER ?? 50;
    const restingY = -radiusPx;
    const isNearGround = Math.abs(body.position.y - restingY) < 10;

    const currentGroundDamp = isNearGround ? GROUND_FRIC_VAL : 0;
    const totalDamping = AIR_DAMP_VAL + currentGroundDamp + SYS_ENERGY_LOSS;

    if (totalDamping > 0) {
      // dt-scaled damping: consistent regardless of timestep
      const dampingFactor = 1 - Math.min(totalDamping * dtS * 60, 0.95);
      Matter.Body.setVelocity(body, {
        x: body.velocity.x * dampingFactor,
        y: body.velocity.y * dampingFactor,
      });
    }
  }

  Matter.Engine.update(engine, dtMs);

  // Crash Detection: Check for NaN or non-finite positions/velocities
  for (const body of Matter.Composite.allBodies(engine.world)) {
    if (!isFinite(body.position.x) || !isFinite(body.position.y) || 
        !isFinite(body.velocity.x) || !isFinite(body.velocity.y)) {
      return 'crash';
    }
  }
};
