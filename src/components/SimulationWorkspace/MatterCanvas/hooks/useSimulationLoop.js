import { useEffect } from 'react';
import Matter from 'matter-js';
import { 
  createPhysicsEngine, createGround, updatePhysics, matterToWorld, resetSettledTimeMap 
} from '../../../../features/workspace/physics/PhysicsEngine';
import { renderCanvas } from '../utils/renderCanvas';

export const useSimulationLoop = ({
  canvasRef,
  engineRef,
  bodyMap,
  trajectoriesRef,
  timeStateRef,
  loopPropsRef,
  mouseRef,
  drawingVectorRef,
  setIsPlaying,
  onCrash,
  engineResetToken,
}) => {
  useEffect(() => {
    const engine = createPhysicsEngine();
    engineRef.current = engine;
    bodyMap.current.clear();
    resetSettledTimeMap();
    if (trajectoriesRef.current) trajectoriesRef.current.clear();
    Matter.Composite.add(engine.world, createGround());

    let raf;
    let lastTime = performance.now();
    let accumulator = 0;
    const FIXED_DELTA_MS = 1000 / 60;
    const FIXED_DELTA_S = FIXED_DELTA_MS / 1000;
    
    const prevStates = new Map();
    const currentStates = new Map();

    const loop = (now) => {
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      if (timeStateRef.current?.isPlaying) {
        accumulator += delta * (timeStateRef.current.timeScale || 1);
        
        let substeps = 0;
        const MAX_SUBSTEPS = 10; // BUG 2: Cap substeps to prevent divergence

        while (accumulator >= FIXED_DELTA_MS && substeps < MAX_SUBSTEPS) {
          for (const [id, body] of bodyMap.current) {
            prevStates.set(id, { x: body.position.x, y: body.position.y, angle: body.angle });
          }

          const status = updatePhysics(engine, FIXED_DELTA_MS, loopPropsRef.current.simState, bodyMap.current, timeStateRef.current, setIsPlaying);
          
          if (status === 'crash') {
            timeStateRef.current.isPlaying = false;
            setIsPlaying(false);
            onCrash?.();
            accumulator = 0;
            break;
          }

          for (const [id, body] of bodyMap.current) {
            currentStates.set(id, { x: body.position.x, y: body.position.y, angle: body.angle });
          }

          // BUG 1: Separate trajectory ticks from experiment time ticks
          // totalPhysicsTicks only counts "active" experiment time
          if (status !== 'settling' && status !== 'settled') {
             timeStateRef.current.totalPhysicsTicks = (timeStateRef.current.totalPhysicsTicks || 0) + 1;
             timeStateRef.current.time = timeStateRef.current.totalPhysicsTicks * FIXED_DELTA_S;
          }

          if (loopPropsRef.current.simState?.showTrajectory) {
            updateTrajectories(bodyMap, trajectoriesRef, loopPropsRef);
          }

          accumulator -= FIXED_DELTA_MS;
          substeps++;
        }
      }

      decayTrajectories(trajectoriesRef);
      syncPhysicsChange(bodyMap, loopPropsRef, timeStateRef);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        renderCanvas({
          ctx, loopPropsRef, timeStateRef, accumulator, FIXED_DELTA_MS,
          engineRef, bodyMap, prevStates, currentStates, trajectoriesRef,
          mouseRef, drawingVectorRef
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      Matter.Engine.clear(engine);
      Matter.Composite.clear(engine.world, false);
    };
  }, [engineResetToken]);
};

// Internal helpers to keep loop clean
const updateTrajectories = (bodyMap, trajectoriesRef, loopPropsRef) => {
  for (const [id, body] of bodyMap.current.entries()) {
    if (body.label === 'ground') continue;
    let traj = trajectoriesRef.current.get(id);
    if (!traj) {
      const obj = loopPropsRef.current.simState.objects?.find(o => o.id === id);
      traj = { color: obj?.color || '#FFB65A', points: [] };
      trajectoriesRef.current.set(id, traj);
    }
    traj.points.push({ ...matterToWorld(body.position.x, body.position.y), alpha: 0.8 });
    if (traj.points.length > 200) traj.points.shift();
  }
};

const decayTrajectories = (trajectoriesRef) => {
  trajectoriesRef.current.forEach((traj) => {
    traj.points.forEach(p => { p.alpha -= 0.005; });
    traj.points = traj.points.filter(p => p.alpha > 0);
  });
};

const syncPhysicsChange = (bodyMap, loopPropsRef, timeStateRef) => {
  if (loopPropsRef.current.onPhysicsChange) {
    const worldBodies = {};
    for (const [id, body] of bodyMap.current) {
      worldBodies[id] = { position: matterToWorld(body.position.x, body.position.y) };
    }
    loopPropsRef.current.onPhysicsChange(worldBodies, timeStateRef.current?.isPlaying);
  }
};
