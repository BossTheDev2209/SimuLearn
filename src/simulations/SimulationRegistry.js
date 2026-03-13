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
        h_start = 10, 
        mass = 1, 
        gravity = 9.8 
      } = variables;
      
      // แต่ถ้าไม่มี (ส่งแค่ vx, vy) ทำ Trigonometry เอง
      const velocity = b_velocity !== undefined ? Number(b_velocity) : Math.sqrt(vx * vx + vy * vy);
      const angle = b_angle !== undefined ? Number(b_angle) : (Math.atan2(vy, vx) * (180 / Math.PI));

      return {
        gravity: gravity,
        airResistance: false,
        objects: [
          {
            id: 'obj_1', 
            isSpawned: true,
            shape: 'circle',
            size: 0.5, 
            color: '#FFB65A', 
            values: { 
              height: h_start, 
              velocity: velocity, 
              angle: angle, 
              mass: mass, 
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