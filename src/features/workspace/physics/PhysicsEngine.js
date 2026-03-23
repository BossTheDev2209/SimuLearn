import Matter from 'matter-js';
import { 
  PIXELS_PER_METER, SETTLE_HOLD_S, worldToMatter, matterToWorld,
  computeGravityY, createPhysicsEngine, createGround, checkCrash,
  applyAntiNoclip
} from './PhysicsUtils';

export { 
  PIXELS_PER_METER, SETTLE_HOLD_S, worldToMatter, matterToWorld,
  computeGravityY, createPhysicsEngine, createGround,
};

const DEFAULT_SETTINGS = {
  AIR_DAMPING: 0.1,
  SYSTEM_ENERGY_LOSS: 0.02,
  GROUND_DAMPING: 0.05,
};

let globalSettledTime = 0;
export const resetSettledTimeMap = () => { globalSettledTime = 0; };

const applyForces = (body, obj, forceScale) => {
  const forces = [...(obj.values?.forces || [])];
  if (obj.values?.force != null) {
    forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
  }
  for (const f of forces) {
    const mag = f.magnitude * forceScale;
    const angleRad = (f.angle * Math.PI) / 180;
    Matter.Body.applyForce(body, body.position, {
      x: mag * Math.cos(angleRad),
      y: -mag * Math.sin(angleRad),
    });
  }
};

const applyDamping = (body, damping, dtS, restingY) => {
  if (damping <= 0) return;
  const dampingFactor = 1 - Math.min(damping * dtS * 60, 0.95);
  Matter.Body.setVelocity(body, {
    x: body.velocity.x * dampingFactor,
    y: body.velocity.y * dampingFactor,
  });
};

export const updatePhysics = (engine, dtMs, state, bodyMap, timeState, setIsPlaying) => {
  if (!timeState.isPlaying) return;
  const dtS = dtMs / 1000;
  engine.gravity.y = computeGravityY(state?.gravity ?? 9.8);

  let hasActiveObject = false;
  let allSettleZone = true;
  let allActuallyStill = true;
  let allImpacted = true;
  const forceScale = PIXELS_PER_METER * 0.000001;

  if (state?.objects) {
    for (const obj of state.objects) {
      if (!obj.isSpawned) continue;
      const body = bodyMap.get(obj.id);
      if (!body) continue;
      hasActiveObject = true;

      const radiusPx = body.circleRadius ?? (body.plugin?.size / 2) * PIXELS_PER_METER ?? 0;
      const restingY = -radiusPx;
      const distFromRest = Math.abs(body.position.y - restingY);
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);

      const hasImpacted = distFromRest <= 4; 
      if (hasImpacted) {
         body.plugin = body.plugin || {};
         body.plugin.hasImpacted = true;
      }
      if (!body.plugin?.hasImpacted) allImpacted = false;

      const isBodyInSettleZone = distFromRest <= 6 && speed < 2.0;
      if (!isBodyInSettleZone) allSettleZone = false;

      const isActuallyStill = isBodyInSettleZone && Math.abs(body.angularVelocity) < 0.1;
      if (!isActuallyStill) allActuallyStill = false;

      applyAntiNoclip(body, restingY);
      applyForces(body, obj, forceScale);
    }
  }

  if (!hasActiveObject) { globalSettledTime = 0; return; }
  if (allActuallyStill) globalSettledTime += dtS; else globalSettledTime = 0;

  if (allActuallyStill && globalSettledTime >= SETTLE_HOLD_S) {
    for (const obj of state.objects) {
      const body = bodyMap.get(obj.id);
      if (!body) continue;
      const r = body.circleRadius ?? (body.plugin?.size / 2) * PIXELS_PER_METER ?? 0;
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      Matter.Body.setPosition(body, { x: body.position.x, y: -r });
    }
    timeState.isPlaying = false;
    setIsPlaying(false);
    return 'settled';
  }

  let status = undefined;
  if (allImpacted || allSettleZone) status = 'settling';

  const AIR_DAMP_VAL = state?.airResistance ? DEFAULT_SETTINGS.AIR_DAMPING : 0;
  const SYS_ENERGY_LOSS = state?.energyConservation ? DEFAULT_SETTINGS.SYSTEM_ENERGY_LOSS : 0;
  const GROUND_FRIC_VAL = (state?.groundFriction || 0) * DEFAULT_SETTINGS.GROUND_DAMPING;

  for (const obj of state.objects) {
    if (!obj.isSpawned) continue;
    const body = bodyMap.get(obj.id);
    if (!body) continue;
    const r = body.circleRadius ?? (body.plugin?.size / 2) * PIXELS_PER_METER ?? 50;
    const isNearGround = Math.abs(body.position.y + r) < 20;
    const curGroundDamp = isNearGround ? GROUND_FRIC_VAL : 0;
    applyDamping(body, AIR_DAMP_VAL + curGroundDamp + SYS_ENERGY_LOSS, dtS, -r);
  }

  Matter.Engine.update(engine, dtMs);
  if (checkCrash(engine)) return 'crash';
  return status;
};
