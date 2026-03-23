export const SimulationRegistry = {
  // (Free Fall / Projectile)
  free_fall: {
    id: 'free_fall',
    name: 'การตกแบบเสรี (Free Fall)',
    
    parseData: (variables) => {
      const { 
        vx = 0, 
        vy = 0, 
        velocity: b_velocity, 
        angle: b_angle, 
        fx = 0,
        fy = 0,
        force: b_force,
        forceAngle: b_forceAngle,
        h_start,
        height: b_height,
        y: b_y,
        pos_y,
        mass = 1, 
        gravity = 9.8 
      } = variables;
      
      const gravity_val = Math.abs(Number(variables.gravity ?? 9.8));
      const rawH = b_height ?? h_start ?? b_y ?? pos_y ?? 10;
      const height = Math.abs(Number(rawH));
      const size = 0.5;
      const safeY = Math.max(height, (size / 2) + 0.5); // Bug 3 — Minimum safe value: size / 2 + 0.5
      
      const velocity = b_velocity !== undefined ? Number(b_velocity) : Math.sqrt(vx * vx + vy * vy);
      const angle = b_angle !== undefined ? Number(b_angle) : (Math.atan2(vy, vx) * (180 / Math.PI));

      const forceMag = b_force !== undefined ? Number(b_force) : Math.sqrt(fx * fx + fy * fy);
      const forceAng = b_forceAngle !== undefined ? Number(b_forceAngle) : (Math.atan2(fy, fx) * (180 / Math.PI));

      return {
        gravity: gravity_val,
        airResistance: false,
        objects: [
          {
            id: 'obj_1', 
            name: 'วัตถุ 1',
            isSpawned: true,
            shape: 'circle',
            size: size, 
            color: '#FFB65A', 
            position: { x: 0, y: safeY },
            values: { 
              height: height, 
              mass: Number(mass), 
              restitution: 0,
              // Bug 5 — Use array format (velocities/forces)
              // Bug 4b — Skip if magnitude is 0
              velocities: velocity > 0 ? [{
                magnitude: Number(velocity.toFixed(2)),
                angle: Number(angle.toFixed(1)), // Bug 4a — 90 deg = Up
                name: 'v1',
                color: '#3B82F6'
              }] : [],
              forces: forceMag > 0 ? [{
                magnitude: Number(forceMag.toFixed(2)),
                angle: Number(forceAng.toFixed(1)),
                name: 'F1',
                color: '#EF4444'
              }] : []
            }
          }
        ]
      };
    }
  },
  
};

export const getSimulationTemplate = (type) => {
  return SimulationRegistry[type] || SimulationRegistry['free_fall']; 
};