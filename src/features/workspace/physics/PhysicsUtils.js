import Matter from 'matter-js';

export const PIXELS_PER_METER = 100;
export const SETTLE_HOLD_S = 0.3;

export const worldToMatter = (x, y) => ({
  x: x * PIXELS_PER_METER,
  y: -y * PIXELS_PER_METER,
});

export const matterToWorld = (x, y) => ({
  x: x / PIXELS_PER_METER,
  y: -y / PIXELS_PER_METER,
});

export const computeGravityY = (g) => (g * PIXELS_PER_METER) / 1000;

export const createPhysicsEngine = () => {
  return Matter.Engine.create({
    positionIterations: 30,
    velocityIterations: 20,
    enableSleeping: false,
  });
};

export const createGround = () => {
  return Matter.Bodies.rectangle(0, 50, 100000, 100, {
    isStatic: true,
    label: 'ground',
    friction: 0.0,
    frictionStatic: 0.0,
    restitution: 0,
  });
};

export const checkCrash = (engine) => {
  for (const body of Matter.Composite.allBodies(engine.world)) {
    if (!isFinite(body.position.x) || !isFinite(body.position.y) || 
        !isFinite(body.velocity.x) || !isFinite(body.velocity.y)) {
      return true;
    }
  }
  return false;
};

export const applyAntiNoclip = (body, restingY) => {
  if (body.position.y > restingY + 8) {
    Matter.Body.setPosition(body, { x: body.position.x, y: restingY });
    if (body.velocity.y > 0) Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
  }
};
