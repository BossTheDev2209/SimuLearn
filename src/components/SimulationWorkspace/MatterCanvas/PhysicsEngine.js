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
 * Performs a single physics step with custom logic (Settling/Grounded Stop, Forces).
 */
export const updatePhysics = (engine, dt, state, bodyMap, maxTime, timeState, setIsPlaying) => {
  if (!timeState.isPlaying) return;

  // 1. Calculate Grounded State for all objects
  let allSettled = true;
  if (state?.objects) {
    for (const obj of state.objects) {
      if (!obj.isSpawned) continue;
      const body = bodyMap.get(obj.id);
      if (!body) continue;

      const radius = (body.circleRadius || body.plugin?.size / 2 || 0.5);
      const distFromGround = Math.abs(body.position.y - radius);
      const speedSq = body.velocity.x ** 2 + body.velocity.y ** 2;

      // 🌟 Settlement Logic: If close to ground and slow, snap to stop
      if (speedSq < 0.01 && distFromGround < 0.05) {
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
      } else {
        allSettled = false;
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

  // 2. Stop Simulation if all objects are grounded/settled (or maxTime safety hit)
  if ((allSettled && timeState.time > 0.5) || timeState.time >= (maxTime * 1.5 || 30)) {
    timeState.isPlaying = false;
    setIsPlaying(false);
    return;
  }

  // 3. System Update
  Matter.Engine.update(engine, dt * 1000); 
  timeState.time += dt;
};

/**
 * Predicts the time till simulation ends based on kinematics (s = ut + 0.5at^2).
 */
export const predictSimulationTime = (simState) => {
  if (!simState || !simState.objects) return 10.0;
  // Matter.js gravity scale to world units: typically ~1.0 in Matter = 9.8 in sim
  const g = (simState.gravity || 9.8) / 9.8; 
  let maxT = 0;

  simState.objects.forEach(obj => {
    if (!obj.isSpawned) return;
    
    const radius = (obj.shape === 'circle' ? obj.size : obj.size / 2) || 0.5;
    const h = Math.max(0, (obj.position?.y || 0) - radius);
    if (h <= 0 && (!obj.values?.velocities || obj.values.velocities.length === 0)) return;

    // Get initial vertical velocity (u) - Matter.js Y is down, but our WY is up.
    // So positive angle in WY (up) means negative Y in Matter.
    let uy = 0;
    const vels = [...(obj.values?.velocities || [])];
    if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
    
    vels.forEach(v => {
      // angle 90 in UI = UP = -Y in Matter. uy should represent speed TOWARDS ground?
      // Let's use standard h = vy*t + 0.5*g*t^2 where h is distance to ground.
      // angle 270 in UI = DOWN. sin(270) = -1. So vy = -mag * sin(angle).
      uy -= v.magnitude * Math.sin((v.angle * Math.PI) / 180) * 0.1; 
    });

    // Solve for t: 0.5*g*t^2 + uy*t - h = 0
    // t = (-uy + sqrt(uy^2 + 2*g*h)) / g
    const disc = uy * uy + 2 * g * h;
    if (disc >= 0) {
      const t = (-uy + Math.sqrt(disc)) / g;
      if (t > maxT) maxT = t;
    }
  });

  // Add a generous 20% buffer + 1s for settling. Clamp between 5s and 45s.
  return Math.min(Math.max(maxT * 1.2 + 1.0, 5), 45);
};
