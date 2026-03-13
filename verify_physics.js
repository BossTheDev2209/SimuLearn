import Matter from 'matter-js';

const HZ = 120;
const DT_MS = 1000 / HZ; // 8.333 ms
const DT_SEC = 1 / HZ;

// DERIVED COEFFICIENTS (1 unit = 1 meter)
const COEFF_G = 0.001; // g_sim = g_real / 1000
const COEFF_V = 1 / 60; // v_sim = v_real / 60
const COEFF_F = 1 / 1000000; // f_sim = f_real / 1M

function testFreeFall() {
    console.log("--- FINAL TEST: Free Fall ---");
    const engine = Matter.Engine.create();
    engine.gravity.scale = 0.001; // default
    engine.gravity.y = 9.8 * COEFF_G / 0.001; // = 9.8
    
    const body = Matter.Bodies.circle(0, 0, 1, { frictionAir: 0 });
    Matter.Composite.add(engine.world, body);

    let time = 0;
    const DISTANCE = 10;
    while (body.position.y < DISTANCE && time < 10) {
        Matter.Engine.update(engine, DT_MS);
        time += DT_SEC;
    }
    console.log(`Expected time (10m): 1.428s. Actual: ${time.toFixed(4)}s`);
    // Expected v_real = 9.8 * 1.428 = 13.99 m/s
    // Expected v_sim = 13.99 / 60 = 0.233
    console.log(`Sim Velocity: ${body.velocity.y.toFixed(6)}. Expected: ${(9.8 * time / 60).toFixed(6)}`);
}

function testVelocity() {
    console.log("\n--- FINAL TEST: Constant Velocity ---");
    const engine = Matter.Engine.create();
    engine.gravity.y = 0;
    const body = Matter.Bodies.circle(0, 0, 1, { frictionAir: 0 });
    Matter.Body.setVelocity(body, { x: 10 * COEFF_V, y: 0 });
    Matter.Composite.add(engine.world, body);

    let time = 0;
    while (body.position.x < 10 && time < 10) {
        Matter.Engine.update(engine, DT_MS);
        time += DT_SEC;
    }
    console.log(`Expected time (10m at 10m/s): 1s. Actual: ${time.toFixed(4)}s`);
}

function testForce() {
    console.log("\n--- FINAL TEST: Constant Force ---");
    const engine = Matter.Engine.create();
    engine.gravity.y = 0;
    const mass = 2;
    const body = Matter.Bodies.circle(0, 0, 1, { frictionAir: 0, mass: mass });
    Matter.Composite.add(engine.world, body);

    let time = 0;
    const F_REAL = 5;
    while (time < 1.0) {
        Matter.Body.applyForce(body, body.position, { x: F_REAL * COEFF_F, y: 0 });
        Matter.Engine.update(engine, DT_MS);
        time += DT_SEC;
    }
    // a = 5/2 = 2.5m/s^2. d = 0.5 * 2.5 * 1^2 = 1.25m
    console.log(`Expected distance (1s, 5N, 2kg): 1.25m. Actual: ${body.position.x.toFixed(4)}m`);
}

testFreeFall();
testVelocity();
testForce();
