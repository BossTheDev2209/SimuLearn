const Matter = require('matter-js');
const engine = Matter.Engine.create({ positionIterations: 16, velocityIterations: 12 });
engine.gravity.y = -1;
const ground = Matter.Bodies.rectangle(0, -20, 1000, 40, { isStatic: true, friction: 1 });
const square = Matter.Bodies.rectangle(0, 10, 10, 10, { restitution: 0.6, friction: 1.0, frictionStatic: 2.0, slop: 0.01 });
Matter.Body.setMass(square, 20);
Matter.Body.setAngle(square, Math.PI / 4);
Matter.Composite.add(engine.world, [ground, square]);

for(let i=0; i<120; i++) {
  Matter.Engine.update(engine, 1000/120);
}
console.log('Square angle:', square.angle, 'velocity:', square.velocity);
