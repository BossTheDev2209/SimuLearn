import Matter from 'matter-js';

const HZ = 120;
const DT_MS = 1000 / HZ;

function diagnoseGravity() {
    const engine = Matter.Engine.create();
    engine.gravity.scale = 0.001; 
    engine.gravity.y = 1; 

    const body = Matter.Bodies.circle(0, 0, 1, { frictionAir: 0, mass: 1 });
    Matter.Composite.add(engine.world, body);

    console.log("--- Gravity Displacement Test ---");
    console.log(`Initial y: ${body.position.y}`);
    Matter.Engine.update(engine, DT_MS);
    console.log(`y after 1 step (8.333ms): ${body.position.y}`);
    
    // In SI, d = 0.5 * a * t^2.
    // If a = g * scale = 0.001 per ms^2.
    // d = 0.5 * 0.001 * (8.333)^2 = 0.0347
    const expected_d_si = 0.5 * 0.001 * (DT_MS * DT_MS);
    console.log(`Expected d (SI formula): ${expected_d_si.toFixed(6)}`);
    console.log(`Ratio (actual_d / expected_d_si): ${body.position.y / expected_d_si}`);
}

diagnoseGravity();
