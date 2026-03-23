import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, memo } from 'react';
import Matter from 'matter-js';
import { useCanvasInteractions } from './hooks/useCanvasInteractions';
import { worldToMatter, matterToWorld, computeGravityY } from '../../../features/workspace/physics/PhysicsEngine';
import { PIXELS_PER_METER } from '../../../features/workspace/physics/VectorRenderer';
import { useSimulationLoop } from './hooks/useSimulationLoop';

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
  const trajectoriesRef = useRef(new Map()); 
  
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
    simState, engineRef, bodyMap, drawingVectorRef, controlPanelRef, selectedObjectId
  });

  useSimulationLoop({
    canvasRef, engineRef, bodyMap, trajectoriesRef, timeStateRef,
    loopPropsRef, mouseRef, drawingVectorRef, setIsPlaying, onCrash,
    engineResetToken
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
    if (!canvas) return;
    const handleMouseMove = (e) => {
      const rect = canvas.parentElement.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
           const oldVelocity = { x: body.velocity.x, y: body.velocity.y };
           const oldAngularVelocity = body.angularVelocity;
           const oldAngle = body.angle;
           Matter.Composite.remove(engine.world, body);
           
           const opts = { 
             restitution: body.restitution, 
             friction: body.friction, 
             frictionAir: body.frictionAir, 
             frictionStatic: body.frictionStatic,
             angle: oldAngle
           };
           const radiusPx = (obj.size || 1) * PIXELS_PER_METER / 2;
           const px = body.position.x;
           const py = body.position.y;

           if (obj.shape === 'circle') body = Matter.Bodies.circle(px, py, radiusPx, opts);
           else if (obj.shape === 'polygon-3') body = Matter.Bodies.polygon(px, py, 3, radiusPx / (Math.sqrt(3) / 2), opts);
           else body = Matter.Bodies.rectangle(px, py, radiusPx * 2, radiusPx * 2, opts);
           
           body.label = obj.shape;
           body.plugin = { size: obj.size || 1 };
           Matter.Body.setVelocity(body, oldVelocity);
           Matter.Body.setAngularVelocity(body, oldAngularVelocity);
           Matter.Composite.add(engine.world, body);
           bodyMap.current.set(obj.id, body);
        }
      }

      body.render.fillStyle = obj.color;
      Matter.Body.setMass(body, obj.values?.mass || 1.0);

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
  }, [simState, simSyncToken, engineResetToken]);

  return <canvas ref={canvasRef} width={size.w} height={size.h} className="absolute inset-0 pointer-events-none z-10" />;
});

export default memo(MatterCanvas);