import Matter from 'matter-js';

/**
 * Initializes the Matter.js engine with custom parameters.
 */
export const createPhysicsEngine = () => {
  // Set resting threshold to prevent infinite micro-bouncing
  Matter.Resolver._restingThresh = 0.1;

  return Matter.Engine.create({
    positionIterations: 12, // Increased for precision
    velocityIterations: 8,
  });
};

/**
 * Creates the static ground body.
 */
export const createGround = () => {
  return Matter.Bodies.rectangle(0, -20.5, 10000, 41, {
    isStatic: true,
    label: 'ground',
    friction: 0.8,
    frictionStatic: 1.2, // Phase 1 fix
  });
};

/**
 * Performs a single physics step with custom logic (Hard Stop, Forces, Velocity Threshold).
 */
export const updatePhysics = (engine, dt, state, bodyMap, maxTime, timeState, setIsPlaying) => {
  if (!timeState.isPlaying) return;

  // 1. Hard Stop Logic (Absolute)
  if (timeState.time >= (maxTime || Infinity)) {
    timeState.time = maxTime;
    timeState.isPlaying = false;
    setIsPlaying(false);
    
    // Force absolute stop: set all non-static velocities to zero
    Matter.Composite.allBodies(engine.world).forEach(body => {
      if (!body.isStatic) Matter.Body.setVelocity(body, { x: 0, y: 0 });
    });
    return;
  }

  // 2. Apply Custom Forces
  if (state?.objects) {
    for (const obj of state.objects) {
      if (!obj.isSpawned) continue;
      const body = bodyMap.get(obj.id);
      if (!body) continue;

      // 🌟 Velocity Threshold to prevent sliding (Phase 1 fix)
      const speedSq = body.velocity.x ** 2 + body.velocity.y ** 2;
      const distFromGround = Math.abs(body.position.y - (body.circleRadius || body.plugin?.size / 2 || 0));
      if (speedSq < 0.01 && distFromGround < 0.05) {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      }

      // Apply assigned forces
      const forces = [...(obj.values?.forces || [])];
      if (obj.values?.force) {
        forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
      }
      for (const f of forces) {
        const mag = f.magnitude / 1000000;
        Matter.Body.applyForce(body, body.position, {
          x: mag * Math.cos((f.angle * Math.PI) / 180),
          y: mag * Math.sin((f.angle * Math.PI) / 180),
        });
      }
    }
  }

  // 3. System Update
  Matter.Engine.update(engine, dt * 1000); 
  timeState.time += dt;

  // 4. Auto-stop if energy vanishes
  const allBodies = Matter.Composite.allBodies(engine.world).filter((b) => !b.isStatic);
  let totalEnergy = 0;
  for (const b of allBodies) {
    totalEnergy += 0.5 * b.mass * (b.velocity.x ** 2 + b.velocity.y ** 2);
  }
  if (totalEnergy < 0.00001 && timeState.time > 0.5) {
    timeState.isPlaying = false;
    setIsPlaying(false);
  }
};

/**
 * Predicts the time till simulation ends based on kinematics (s = ut + 0.5at^2).
 */
export const predictSimulationTime = (simState) => {
  if (!simState || !simState.objects) return 10.0;
  const g = (simState.gravity || 9.8) / 10; // Scaled for Matter.js
  let maxT = 0;

  simState.objects.forEach(obj => {
    if (!obj.isSpawned) return;
    
    const radius = (obj.shape === 'circle' ? obj.size : obj.size / 2) || 0.5;
    const h = (obj.position?.y || 0) - radius;
    if (h <= 0) return;

    // Get initial vertical velocity (u)
    let uy = 0;
    const vels = [...(obj.values?.velocities || [])];
    if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
    
    vels.forEach(v => {
      uy += v.magnitude * Math.sin((v.angle * Math.PI) / 180) * 0.1; // Scale factor matching physics
    });

    // Solve for t: 0 = h + uy*t - 0.5*g*t^2  => 0.5*g*t^2 - uy*t - h = 0
    // t = (uy + sqrt(uy^2 + 2*g*h)) / g
    const t = (uy + Math.sqrt(uy * uy + 2 * g * h)) / g;
    if (t > maxT) maxT = t;
  });

  return Math.min(Math.max(maxT + 1.5, 5), 30); // Buffer and clamps
};
