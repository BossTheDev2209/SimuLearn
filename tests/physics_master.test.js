import { expect, test, describe } from "bun:test";
import Matter from "matter-js";
import {
  createPhysicsEngine,
  createGround,
  updatePhysics,
  predictSimulationTime,
  computeGravityY,
  worldToMatter,
  matterToWorld,
  PIXELS_PER_METER as PPM,
} from "../src/components/SimulationWorkspace/MatterCanvas/PhysicsEngine";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * สร้าง engine + ground
 * gravity รับเป็น m/s², แปลงด้วย computeGravityY อัตโนมัติ
 */
const makeEngine = (g = 9.8) => {
  const engine = createPhysicsEngine();
  engine.world.gravity.scale = 1;
  engine.world.gravity.x = 0;
  engine.world.gravity.y = computeGravityY(g);
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
const runUntilStop = (engine, bodyMap, simState, maxTimeSec = 30, maxFrames = 20000) => {
  const timeState = { time: 0, isPlaying: true };
  const setIsPlaying = (v) => { timeState.isPlaying = v; };

  let ticks = 0;
  while (timeState.isPlaying && ticks < maxFrames) {
    updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, maxTimeSec, timeState, setIsPlaying);
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
  test("1. ตกอิสระจาก 40m ถึงพื้นใน 2.85s–2.87s", () => {
    // สูตร: t = sqrt(2h/g) = sqrt(80/9.8) ≈ 2.857s
    // ball radius = 0.5m → center ที่ y=40.5m → ขอบล่างที่ y=40m
    const engine = makeEngine(9.8);
    const ball = makeBall(0, 40.5); // world Y=40.5m → matter y=-4050px
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [makeObj("obj_1", 40.5)]);

    const result = runUntilStop(engine, bodyMap, simState, 10);
    console.log("Test 1 — land time:", result.time.toFixed(4), "s  (expected ~2.857s)");

    expect(result.time).toBeGreaterThan(2.84);
    expect(result.time).toBeLessThan(2.88);
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
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, 30, timeState, setIsPlaying);
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
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, 30, timeState, setIsPlaying);
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
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, 30, timeState, setIsPlaying);
      timeState.time += FIXED_DELTA_S;
    }

    const deltaYPx = Math.abs(ball.position.y - startY);
    console.log("Test 4 — deltaY:", deltaYPx.toFixed(4), "px  (expected ~0)");
    expect(deltaYPx).toBeLessThan(1);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────
  test("5. Simulation หยุดเองเมื่อถึง maxTime", () => {
    const engine = makeEngine(9.8);
    const ball = makeBall(0, 10000); // สูงมาก ไม่ถึงพื้นใน maxTime
    Matter.Composite.add(engine.world, ball);

    const bodyMap = new Map([["obj_1", ball]]);
    const simState = makeState(9.8, [makeObj("obj_1", 10000)]);

    const MAX_TIME = 5;
    const result = runUntilStop(engine, bodyMap, simState, MAX_TIME, 100000);
    console.log("Test 5 — stopped at:", result.time.toFixed(4), "s  (maxTime:", MAX_TIME, "s)");

    expect(result.time).toBeLessThanOrEqual(MAX_TIME + FIXED_DELTA_S);
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
          updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, 10, timeState, setIsPlaying);
          if (timeState.isPlaying) timeState.time += FIXED_DELTA_S;
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
      updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, 30, timeState, setIsPlaying);
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
      return runUntilStop(engine, bodyMap, simState, 30).time;
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
  test("9. predictSimulationTime — ทำนายนานกว่าเวลาจริงแต่ไม่เกิน 10s", () => {
    const simState = makeState(9.8, [{
      id: "obj_1",
      isSpawned: true,
      size: 1,
      position: { x: 0, y: 40.5 },
      values: {},
    }]);

    const predicted = predictSimulationTime(simState);
    // t_real ≈ 2.857s → predicted = 2.857 * 1.2 + 1.0 ≈ 4.43s
    console.log("Test 9 — predicted:", predicted.toFixed(4), "s  (real ~2.857s)");

    expect(predicted).toBeGreaterThan(2.857); // ต้องนานกว่าเวลาจริง
    expect(predicted).toBeLessThan(10);
  });

  // ── Test 10 ─────────────────────────────────────────────────────────────
  test("10. ไม่มีวัตถุ spawn — simulation หยุดทันทีใน tick แรก", () => {
    const engine = makeEngine(9.8);
    const bodyMap = new Map(); // ไม่มี body เลย
    const simState = makeState(9.8, [
      { id: "obj_1", isSpawned: false, values: {} }, // ยังไม่ spawn
    ]);

    const timeState = { time: 0, isPlaying: true };
    const setIsPlaying = (v) => { timeState.isPlaying = v; };

    updatePhysics(engine, FIXED_DELTA_MS, simState, bodyMap, 10, timeState, setIsPlaying);

    console.log("Test 10 — isPlaying:", timeState.isPlaying, "  (expected: false)");
    expect(timeState.isPlaying).toBe(false);
  });

});