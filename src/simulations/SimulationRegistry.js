export const SimulationRegistry = {
  // (Free Fall / Projectile)
  free_fall: {
    id: 'free_fall',
    name: 'การตกแบบเสรี (Free Fall)',
    
    parseData: (variables) => {
      const { vx = 0, vy = 0, h_start = 10, mass = 1, gravity = 9.8 } = variables;
      
      const velocity = Math.sqrt(vx * vx + vy * vy);
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);

      return {
        gravity: gravity,
        airResistance: false,
        objects: [
          {
            id: 'obj_1', 
            isSpawned: true,
            shape: 'circle',
            size: 20, 
            color: '#FFB65A', 
            values: { 
              height: h_start, 
              velocity: velocity, 
              angle: angle, 
              mass: mass, 
              restitution: 0.6 
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