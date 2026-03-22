import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, memo } from 'react';
import Matter from 'matter-js';
import { PIXELS_PER_METER } from '../../../features/workspace/physics/VectorRenderer';
import { createPhysicsEngine, createGround, updatePhysics, worldToMatter, matterToWorld, computeGravityY } from '../../../features/workspace/physics/PhysicsEngine';
import { formatScientific } from '../../../utils/format';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { renderCanvas } from './utils/renderCanvas';




const MatterCanvas = forwardRef(({ 
  size, offset, zoom, unitStep, simState, onPhysicsChange, 
  activeTool, spawnConfig, gridSnapping, showCursorCoords, 
  showResultantVector, timeStateRef, setIsPlaying,
  followedObjectId, selectedObjectId, selectedObjectIds,
  controlPanelRef, onCrash
}, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map());
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const drawingVectorRef = useRef(null);
  const trajectoriesRef = useRef(new Map()); // id -> { color, points: [] }
  
  const [engineResetToken, setEngineResetToken] = useState(0);
  const [simSyncToken, setSimSyncToken] = useState(0);
  const pendingActionRef = useRef(null);

  const loopPropsRef = useRef({});
  useEffect(() => {
    loopPropsRef.current = { 
      simState, gridSnapping, showCursorCoords, showResultantVector, 
      activeTool, spawnConfig, size, offset, zoom, unitStep,
      followedObjectId, selectedObjectId, selectedObjectIds,
      onPhysicsChange,
    };
  }, [simState, gridSnapping, showCursorCoords, showResultantVector,
      activeTool, spawnConfig, size, offset, zoom, unitStep,
      followedObjectId, selectedObjectId, selectedObjectIds, onPhysicsChange]);

  const interactions = useCanvasInteractions({
    simState,
    engineRef,
    bodyMap,
    drawingVectorRef,
    controlPanelRef,
    selectedObjectId
  });

  // ── Imperative API ───────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    resetSimulation: (pendingAction) => {
      pendingActionRef.current = pendingAction || null;
      setEngineResetToken(prev => prev + 1);
    },
    ...interactions,
    handleSeek: (val) => {
      timeStateRef.current.time = val;
      timeStateRef.current.totalPhysicsTicks = Math.round(val * 60);
    }
  }));

  // Track mouse
  useEffect(() => {
    const canvas = canvasRef.current;
    const handleMouseMove = (e) => {
      const rect = canvas.parentElement.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ── Main Render Loop ─────────────────────────────────────────────────────
  useEffect(() => {
    const engine = createPhysicsEngine();
    engineRef.current = engine;
    bodyMap.current.clear();
    trajectoriesRef.current.clear();
    Matter.Composite.add(engine.world, createGround());
    setSimSyncToken(v => v + 1);

    let raf;
    let lastTime = performance.now();
    let accumulator = 0;
    const FIXED_DELTA_MS = 1000 / 60;
    
    // To support smooth interpolation
    const prevStates = new Map(); // id -> { x, y, angle }
    const currentStates = new Map(); // id -> { x, y, angle }

    const loop = (now) => {
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      if (timeStateRef.current?.isPlaying) {
        accumulator += delta * (timeStateRef.current.timeScale || 1);
        
        while (accumulator >= FIXED_DELTA_MS) {
          // Sync current to prev before update
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

          // Update current states
          for (const [id, body] of bodyMap.current) {
            currentStates.set(id, { x: body.position.x, y: body.position.y, angle: body.angle });
          }

          timeStateRef.current.totalPhysicsTicks = (timeStateRef.current.totalPhysicsTicks || 0) + 1;
          // Freeze UI timer if physics engine returns 'settling' so we don't count the hold period
          if (status !== 'settling') {
             timeStateRef.current.time = timeStateRef.current.totalPhysicsTicks * (FIXED_DELTA_MS / 1000);
          }
          accumulator -= FIXED_DELTA_MS;

          // Track Trajectories
          if (loopPropsRef.current.simState?.showTrajectory) {
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
          }
        }
      }

      // Continuous Trajectory Decay (Happens even when paused)
      trajectoriesRef.current.forEach((traj) => {
        traj.points.forEach(p => { p.alpha -= 0.005; }); // Decay alpha
        traj.points = traj.points.filter(p => p.alpha > 0); // Remove faded points
      });

      // ✅ ส่ง world-meter bodies กลับให้ useCameraEngine
      if (loopPropsRef.current.onPhysicsChange) {
        const worldBodies = {};
        for (const [id, body] of bodyMap.current) {
          worldBodies[id] = { position: matterToWorld(body.position.x, body.position.y) };
        }
        loopPropsRef.current.onPhysicsChange(worldBodies, timeStateRef.current?.isPlaying);
      }

      // ── Draw ────────────────────────────────────────────────────────────
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(loop); return; }

      renderCanvas({
        ctx,
        loopPropsRef,
        timeStateRef,
        accumulator,
        FIXED_DELTA_MS,
        engineRef,
        bodyMap,
        prevStates,
        currentStates,
        trajectoriesRef,
        mouseRef,
        drawingVectorRef
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); Matter.Engine.clear(engine); Matter.Composite.clear(engine.world, false); };
  }, [engineResetToken]);

  // ── Sync simState → engine ───────────────────────────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simState) return;

    engine.gravity.scale = 0.001;
    engine.gravity.x = 0;
    engine.gravity.y = computeGravityY(simState.gravity || 9.8);

    const activeIds = new Set(simState.objects?.filter(o => o.isSpawned).map(o => o.id) || []);
    for (const [id, b] of bodyMap.current.entries()) {
      if (!activeIds.has(id)) { Matter.Composite.remove(engine.world, b); bodyMap.current.delete(id); }
    }

    simState.objects?.forEach(obj => {
      if (!obj.isSpawned) return;
      let body = bodyMap.current.get(obj.id);

      if (!body) {
        // Create new body
        const opts = { restitution: obj.values?.restitution || 0, friction: 0.0, frictionAir: 0.0, frictionStatic: 0.0 };
        const { x: px, y: py } = worldToMatter(obj.position?.x || 0, obj.position?.y || 10);
        const radiusPx = (obj.size || 1) * PIXELS_PER_METER / 2;

        if (obj.shape === 'circle') body = Matter.Bodies.circle(px, py, radiusPx, opts);
        else if (obj.shape === 'polygon-3') body = Matter.Bodies.polygon(px, py, 3, radiusPx / (Math.sqrt(3) / 2), opts);
        else body = Matter.Bodies.rectangle(px, py, radiusPx * 2, radiusPx * 2, opts);

        body.label = obj.shape;
        body.plugin = { size: obj.size || 1 };
        Matter.Composite.add(engine.world, body);
        bodyMap.current.set(obj.id, body);
      } else {
        // Update existing body if size or shape changed
        const currentSize = body.plugin?.size || 1;
        const currentShape = body.label;
        
        if (currentSize !== obj.size || currentShape !== obj.shape) {
           Matter.Composite.remove(engine.world, body);
           
           const opts = { 
             restitution: body.restitution, 
             friction: body.friction, 
             frictionAir: body.frictionAir, 
             frictionStatic: body.frictionStatic,
             angle: body.angle
           };
           const radiusPx = (obj.size || 1) * PIXELS_PER_METER / 2;
           const px = body.position.x;
           const py = body.position.y;

           if (obj.shape === 'circle') body = Matter.Bodies.circle(px, py, radiusPx, opts);
           else if (obj.shape === 'polygon-3') body = Matter.Bodies.polygon(px, py, 3, radiusPx / (Math.sqrt(3) / 2), opts);
           else body = Matter.Bodies.rectangle(px, py, radiusPx * 2, radiusPx * 2, opts);
           
           body.label = obj.shape;
           body.plugin = { size: obj.size || 1 };
           Matter.Body.setVelocity(body, body.velocity);
           Matter.Composite.add(engine.world, body);
           bodyMap.current.set(obj.id, body);
        }
      }

      body.render.fillStyle = obj.color;

      if (obj.values && !timeStateRef.current?.isPlaying) {
        if (obj.values.height !== undefined) {
          const { y: newY } = worldToMatter(matterToWorld(body.position.x, body.position.y).x, obj.values.height);
          Matter.Body.setPosition(body, { x: body.position.x, y: newY });
        }

        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });

        let vxSum = 0, vySum = 0;
        for (const v of vels) {
          const angleRad = (v.angle * Math.PI) / 180;
          const FIXED_DELTA_MS = 1000 / 60; // Should match engine fixed delta
          const scale = PIXELS_PER_METER * (FIXED_DELTA_MS / 1000);
          vxSum += v.magnitude * scale * Math.cos(angleRad);
          vySum += v.magnitude * scale * Math.sin(angleRad);
        }
        Matter.Body.setVelocity(body, { x: vxSum, y: -vySum });
      }
    });
  }, [simState, simSyncToken]);

  return <canvas ref={canvasRef} width={size.w} height={size.h} className="absolute inset-0 pointer-events-none z-10" />;
});

export default memo(MatterCanvas);