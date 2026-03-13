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
      
      // 1. Calculate Velocity & Angle from vx, vy (Trigonometry)
      // Note: If vy comes from a screen-coords backend, it might be -ve for up. 
      // But we unified the system to Math-Up, so we assume vy is already handled or we interpret as is.
      const velocity = b_velocity !== undefined ? Number(b_velocity) : Math.sqrt(vx * vx + vy * vy);
      const angle = b_angle !== undefined ? Number(b_angle) : (Math.atan2(vy, vx) * (180 / Math.PI));

      // 2. Calculate Force & ForceAngle from fx, fy
      const forceMag = b_force !== undefined ? Number(b_force) : Math.sqrt(fx * fx + fy * fy);
      const forceAng = b_forceAngle !== undefined ? Number(b_forceAngle) : (Math.atan2(fy, fx) * (180 / Math.PI));

      return {
        gravity: gravity_val,
        airResistance: false,
        objects: [
          {
            id: 'obj_1', 
            isSpawned: true,
            shape: 'circle',
            size: 0.5, 
            color: '#FFB65A', 
            values: { 
              height: Number(height), 
              velocity: Number(velocity.toFixed(2)), 
              angle: Number(angle.toFixed(1)),
              force: Number(forceMag.toFixed(2)),
              forceAngle: Number(forceAng.toFixed(1)),
              mass: Number(mass), 
              restitution: 0 
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