import { expect, test, describe } from "bun:test";
import Matter from "matter-js";
import {
  createPhysicsEngine,
  createGround,
  updatePhysics,
  computeGravityY,
  worldToMatter,
  matterToWorld,
  PIXELS_PER_METER as PPM,
} from "../src/features/workspace/physics/PhysicsEngine";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * สร้าง engine + ground
 * gravity รับเป็น m/s², แปลงด้วย computeGravityY อัตโนมัติ
 */
const makeEngine = (g = 9.8) => {
  const engine = createPhysicsEngine();
  engine.gravity.scale = 0.001;
  engine.gravity.x = 0;
  engine.gravity.y = computeGravityY(g);
  Matter.Composite.add(engine.world, createGround());
  return engine;
};

/**
 * สร้าง ball body จาก world coordinates (meters, Y-up)
 * แปลงเป็น Matter pixels (Y-down) อัตโนมัติ
 */
const makeBall = (xWorld, yWorld, sizeM = 1, opts = {}) => {
  const { x, y } = worldToMatter(xWorld, yWorld);
  return Matter.Bodies.circle(x, y, (sizeM / 2) * PPM, {
    friction: 0,
    frictionAir: 0,
    frictionStatic: 0,
    restitution: 0,
    ...opts,
  });
};

const FIXED_DELTA_MS = 1000 / 60;
const FIXED_DELTA_S  = FIXED_DELTA_MS / 1000;

/**
 * รัน simulation จนหยุดเองหรือครบ maxFrames
 */
const runUntilStop = (engine, bodyMap, simState = 30, maxFrames = 20000) => {
  const timeState = { time: 0, isPlaying: true };
  const setIsPlaying = (v) => { timeState.isPlaying = v; };

  let ticks = 0;
  while (timeState.isPlaying && ticks < maxFrames) {
    updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
    if (timeState.isPlaying) timeState.time += FIXED_DELTA_S;
    ticks++;
  }
  return timeState;
};

// simState helper
const makeState = (g, objects) => ({ gravity: g, objects });
const makeObj = (id, yWorld, sizeM = 1, values = {}) => ({
  id,
  isSpawned: true,
  size: sizeM,
  position: { x: 0, y: yWorld },
  values,
});

// ─────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────

describe("PhysicsEngine — 10 Test Cases", () => {

  // ── Test 1 ──────────────────────────────────────────────────────────────
  test("1. ตกอิสระจาก 40m ถึงพื้น (auto-stop ~2.86s + 0.3s hold)", () => {
    // สูตร: t_land = sqrt(2h/g) = sqrt(80/9.8) ≈ 2.857s
    // auto-stop adds ~0.3s hold time (18 ticks at 60Hz)
    // ball radius = 0.5m → center ที่ y=40.5m → ขอบล่างที่ y=40m
    const engine = makeEngine(9.8);
    const ball = makeBall(0, 40.5); // world Y=40.5m → matter y=-4050px
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [makeObj("obj_1", 40.5)]);

    const result = runUntilStop(engine, bodyMap, simState);
    console.log("Test 1 — stop time:", result.time.toFixed(4), "s  (expected ~3.15s = 2.86s land + 0.3s hold)");

    // Land ~2.86s + hold ~0.3s = stop ~3.16s
    expect(result.time).toBeGreaterThan(3.0);
    expect(result.time).toBeLessThan(3.3);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────
  test("2. วัตถุบนพื้นไม่เคลื่อนที่ (Y คงที่หลัง 1s)", () => {
    // center อยู่ที่ y=0.5m → matter y=-50px
    const engine = makeEngine(9.8);
    const radiusPx = 0.5 * PPM; // 50px
    const ball = Matter.Bodies.circle(0, -radiusPx, radiusPx, {
      friction: 0, frictionAir: 0, frictionStatic: 0, restitution: 0,
    });
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [makeObj("obj_1", 0.5)]);

    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };
    for (let i = 0; i < 60; i++) {
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
      timeState.time += FIXED_DELTA_S;
    }

    const posY = matterToWorld(0, ball.position.y).y;
    console.log("Test 2 — posY:", posY.toFixed(4), "m  (expected ~0.5m)");
    expect(posY).toBeGreaterThan(0.45);
    expect(posY).toBeLessThan(0.55);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────
  test("3. velocity แนวตั้งที่ t=1s ตรงสูตร v=g*t (±5%)", () => {
    // วางที่สูง 200m เพื่อไม่ถึงพื้นใน 1s
    const engine = makeEngine(9.8);
    const ball = makeBall(0, 200.5);
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [makeObj("obj_1", 200.5)]);

    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };
    for (let i = 0; i < 60; i++) {
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
      timeState.time += FIXED_DELTA_S;
    }

    // v = g * t = 9.8 * 1 = 9.8 m/s → px/tick = 9.8 * PPM / 60
    const expectedPxPerTick = (9.8 * PPM) / 60;
    // Matter Y-down: falling = positive Y velocity
    const actualPxPerTick = ball.velocity.y;
    console.log("Test 3 — velocity:", actualPxPerTick.toFixed(4), "px/tick  (expected:", expectedPxPerTick.toFixed(4), ")");

    expect(actualPxPerTick).toBeGreaterThan(expectedPxPerTick * 0.95);
    expect(actualPxPerTick).toBeLessThan(expectedPxPerTick * 1.05);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────
  test("4. g=0 — วัตถุลอยนิ่ง ไม่เคลื่อนที่", () => {
    const engine = createPhysicsEngine();
    engine.gravity.y = 0;
    engine.gravity.scale = 1;
    Matter.Composite.add(engine.world, createGround());

    const ball = makeBall(0, 10);
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(0, [makeObj("obj_1", 10)]);

    const startY = ball.position.y;
    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };
    for (let i = 0; i < 60; i++) {
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
      timeState.time += FIXED_DELTA_S;
    }

    const deltaYPx = Math.abs(ball.position.y - startY);
    console.log("Test 4 — deltaY:", deltaYPx.toFixed(4), "px  (expected ~0)");
    expect(deltaYPx).toBeLessThan(1);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────
  // วางบนพื้น: matter_y = -radiusPx (resting position)
  test("5. Simulation หยุดเองเมื่อวัตถุทั้งหมดนิ่ง (allSettled after hold time)", () => {
  const engine = makeEngine(9.8);
  const radiusPx = 0.5 * PPM;
  const ball = Matter.Bodies.circle(0, -radiusPx, radiusPx, {
    friction: 0, frictionAir: 0, frictionStatic: 0, restitution: 0,
  });
  Matter.Composite.add(engine.world, ball);

  const bodyMap = new Map([["obj_1", ball]]);
  const simState = makeState(9.8, [makeObj("obj_1", 0.5)]);

  const timeState = { time: 0, isPlaying: true };
  const setIsPlaying = (v) => { timeState.isPlaying = v; };

  // Run for 20 ticks — settled hold time is 0.3s (18 ticks)
  let status;
  for (let i = 0; i < 20; i++) {
    const currentStatus = updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
    if (currentStatus === 'settled') status = 'settled';
    if (timeState.isPlaying && currentStatus !== 'settling') timeState.time += FIXED_DELTA_S;
    if (!timeState.isPlaying) break;
  }

  console.log("Test 5 — isPlaying:", timeState.isPlaying, "  (expected: false after hold time)");
  expect(timeState.isPlaying).toBe(false);
  expect(status).toBe('settled');
});

  // ── Test 6 ──────────────────────────────────────────────────────────────
  test("6. 60Hz vs 120Hz feed — ผลต่างกันไม่เกิน 0.1s", () => {
    const run = (frameDeltas) => {
      const engine = makeEngine(9.8);
      const ball = makeBall(0, 40.5);
      Matter.Composite.add(engine.world, ball);
      const bodyMap = new Map([["obj_1", ball]]);
      const simState = makeState(9.8, [makeObj("obj_1", 40.5)]);
      const timeState = { time: 0, isPlaying: true };
      const setIsPlaying = (v) => { timeState.isPlaying = v; };
      let acc = 0;
      for (const delta of frameDeltas) {
        if (!timeState.isPlaying) break;
        acc += delta;
        while (acc >= FIXED_DELTA_MS) {
          const status = updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
          if (timeState.isPlaying && status !== 'settling') timeState.time += FIXED_DELTA_S;
          acc -= FIXED_DELTA_MS;
        }
      }
      return timeState.time;
    };

    const t60  = run(Array(300).fill(16.666));
    const t120 = run(Array(600).fill(8.333));
    console.log("Test 6 — 60Hz:", t60.toFixed(4), "  120Hz:", t120.toFixed(4));

    expect(Math.abs(t60 - t120)).toBeLessThan(0.1);
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────
  test("7. แรงแนวนอน 100N — วัตถุเคลื่อนไปทางขวา", () => {
    const engine = makeEngine(9.8);
    // วางบนพื้น: matter_y = radiusPx
    const radiusPx = 0.5 * PPM;
    const ball = Matter.Bodies.circle(0, radiusPx, radiusPx, {
      friction: 0, frictionAir: 0, frictionStatic: 0, restitution: 0, mass: 1,
    });
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [{
      id: "obj_1",
      isSpawned: true,
      size: 1,
      position: { x: 0, y: 0.5 },
      values: { forces: [{ magnitude: 100, angle: 0 }] }, // 100N แนวนอน
    }]);

    const startX = ball.position.x;
    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };

    // รัน 60 ticks = 1 วินาที — override settled ด้วยการไม่ snap (body ไม่ on ground)
    for (let i = 0; i < 60; i++) {
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
      timeState.time += FIXED_DELTA_S;
    }

    const deltaXM = (ball.position.x - startX) / PPM;
    console.log("Test 7 — deltaX:", deltaXM.toFixed(4), "m  (expected > 0)");
    expect(deltaXM).toBeGreaterThan(0);
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────
  test("8. g ดาวอังคาร (3.72) ตกช้ากว่าโลก — อัตราส่วน ~1.62", () => {
    const drop = (g) => {
      const engine = makeEngine(g);
      const ball = makeBall(0, 40.5);
      Matter.Composite.add(engine.world, ball);
      const bodyMap = new Map([["obj_1", ball]]);
      const simState = makeState(g, [makeObj("obj_1", 40.5)]);
      return runUntilStop(engine, bodyMap, simState).time;
    };

    const tEarth = drop(9.8);
    const tMars  = drop(3.72);
    const ratio  = tMars / tEarth;
    // ทฤษฎี: t ∝ 1/sqrt(g)  → ratio = sqrt(9.8/3.72) ≈ 1.622
    console.log("Test 8 — Earth:", tEarth.toFixed(4), "  Mars:", tMars.toFixed(4), "  ratio:", ratio.toFixed(4), "  (expected ~1.62)");

    expect(tMars).toBeGreaterThan(tEarth);
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(1.75);
  });

  // ── Test 9 ──────────────────────────────────────────────────────────────
  test("9. ไม่มีวัตถุ spawn — simulation ยังรันอยู่ (timer keeps counting)", () => {
    const engine = makeEngine(9.8);
    const bodyMap = new Map(); // ไม่มี body เลย
    const simState = makeState(9.8, [
      { id: "obj_1", isSpawned: false, values: {} }, // ยังไม่ spawn
    ]);

    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };

    updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);

    // No active objects => early return, timer keeps running
    console.log("Test 9 — isPlaying:", timeState.isPlaying, "  (expected: true — timer keeps counting)");
    expect(timeState.isPlaying).toBe(true);
  });

  // ── Test 10 ─────────────────────────────────────────────────────────────
  test("10. UI Timer freezes during hold period (10m drop ≈ 1.43s display time)", () => {
    // 10m drop should take ~1.43s to land. The hold timer takes 0.3s more.
    // The UI time (result.time) should freeze at ~1.43s and not include the hold time.
    const engine = makeEngine(9.8);
    const ball = makeBall(0, 10.5); // ball rests at 0.5m
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [makeObj("obj_1", 10.5)]);
    
    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };

    let ticks = 0;
    while (timeState.isPlaying && ticks < 200) {
      const status = updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
      if (timeState.isPlaying && status !== 'settling') timeState.time += FIXED_DELTA_S;
      ticks++;
    }

    console.log("Test 10 — UI stopped checking at time:", timeState.time.toFixed(4), "s (expected ~1.43s)");
    
    // Impact time for 10m is 1.428s, allow ±0.05s tolerance
    expect(timeState.time).toBeGreaterThan(1.38);
    expect(timeState.time).toBeLessThan(1.48);
  });

  // ── Test 11 ─────────────────────────────────────────────────────────────
  test("11. Numerical Velocity Verification (Horizontal 5 m/s = 5m in 1s)", () => {
    const engine = makeEngine(9.8);
    
    // Ball resting on ground (matter_y = -radius=50px)
    const radiusPx = 0.5 * PPM;
    const pxY = -radiusPx;
    const pxX = 0;
    
    const ball = Matter.Bodies.circle(pxX, pxY, radiusPx, {
        friction: 0, frictionAir: 0, frictionStatic: 0, restitution: 0, mass: 1,
    });
    Matter.Composite.add(engine.world, ball);
    
    // Set explicit velocity using the exact sync formula from MatterCanvas
    // v = 5 m/s right (angle 0)
    const scale = PPM * (FIXED_DELTA_MS / 1000); 
    const vxSum = 5 * scale * Math.cos(0);
    const vySum = 5 * scale * Math.sin(0);
    Matter.Body.setVelocity(ball, { x: vxSum, y: -vySum });

    const bodyMap = new Map([["obj_1", ball]]);
    // Add upward force 9.8N to cancel gravity, simulating a truly frictionless slide
    const simState = makeState(9.8, [{
        id: "obj_1", isSpawned: true, size: 1, position: { x: 0, y: 0.5 },
        values: { forces: [{ magnitude: 9.8, angle: 90 }] } 
    }]);
    
    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };

    // Run exactly 1 simulated second (60 ticks)
    for (let i = 0; i < 60; i++) {
        updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, timeState, setIsPlaying);
        timeState.time += FIXED_DELTA_S;
    }
    
    const worldPos = matterToWorld(ball.position.x, ball.position.y);
    console.log("Test 11 — x position:", worldPos.x.toFixed(4), "m (expected ~5.0m)");
    
    // Should be exactly 5.0m ± 0.05m
    expect(worldPos.x).toBeGreaterThan(4.95);
    expect(worldPos.x).toBeLessThan(5.05);
  });

  // ── Test 12 ─────────────────────────────────────────────────────────────
  test("12. bounce e=0.5 from 10m — timer freezes at correct total time", () => {
    const engine = makeEngine(9.8);
    const radiusPx = 0.5 * PPM;
    const ball = Matter.Bodies.circle(0, -radiusPx, radiusPx, {
      friction: 0, frictionAir: 0, frictionStatic: 0,
      restitution: 0.5,
    });
    // Place center at 10.5m world → matter y = -1050px
    const { x, y } = worldToMatter(0, 10.5);
    Matter.Body.setPosition(ball, { x, y });
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [{
      id: "obj_1",
      isSpawned: true,
      size: 1,
      position: { x: 0, y: 10.5 },
      values: { restitution: 0.5 },
    }]);

    const result = runUntilStop(engine, bodyMap, simState);

    // t_total = sqrt(2h/g) * (1+e)/(1-e)
    const h = 10; // bottom edge to ground
    const expected = Math.sqrt(2 * h / 9.8) * (1 + 0.5) / (1 - 0.5);
    console.log("Test 12 — bounce time:", result.time.toFixed(4), "s  (expected ~", expected.toFixed(4), "s)");

    expect(result.time).toBeGreaterThan(expected * 0.92);
    expect(result.time).toBeLessThan(expected * 1.08);
  });

});