import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, memo } from 'react';
import Matter from 'matter-js';
import { PIXELS_PER_METER, renderObjectVectors, drawArrow } from './VectorRenderer';
import { createPhysicsEngine, createGround, updatePhysics, predictSimulationTime } from './PhysicsEngine';

const MatterCanvas = forwardRef(({ 
  size, offset, zoom, unitStep, simState, onPhysicsChange, 
  activeTool, spawnConfig, gridSnapping, showCursorCoords, 
  showResultantVector, timeStateRef, setIsPlaying, maxTime 
}, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map());
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const drawingVectorRef = useRef(null);
  
  const [engineResetToken, setEngineResetToken] = useState(0);
  const [simSyncToken, setSimSyncToken] = useState(0);
  const pendingActionRef = useRef(null);

  // Sync state for loop access
  const loopPropsRef = useRef({});
  useEffect(() => {
    loopPropsRef.current = { 
      simState, gridSnapping, showCursorCoords, showResultantVector, 
      activeTool, spawnConfig, maxTime, size, offset, zoom, unitStep 
    };
  }, [simState, gridSnapping, showCursorCoords, showResultantVector, activeTool, spawnConfig, maxTime, size, offset, zoom, unitStep]);

  // Imperative API for Parent
  useImperativeHandle(ref, () => ({
    resetSimulation: (pendingAction) => {
      pendingActionRef.current = pendingAction || null;
      setEngineResetToken(prev => prev + 1);
    },
    // Required for handleGridClick and erasing vectors
    findVectorAt: (wx, wy) => {
      if (!simState?.objects) return null;
      const HIT_RADIUS = 0.5; // Meters

      for (const obj of simState.objects) {
        if (!obj.isSpawned) continue;
        const body = bodyMap.current.get(obj.id);
        if (!body) continue;

        const bx = body.position.x;
        const by = body.position.y;

        // Check velocities
        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0, isLegacy: true });

        for (let i = 0; i < vels.length; i++) {
          const v = vels[i];
          const vx = v.magnitude * Math.cos((v.angle * Math.PI) / 180) * 0.2;
          const vy = v.magnitude * Math.sin((v.angle * Math.PI) / 180) * 0.2;
          
          // Check proximity to arrow head (approximate)
          const headX = bx + vx, headY = by + vy;
          const dist = Math.sqrt((wx - headX) ** 2 + (wy - headY) ** 2);
          if (dist < HIT_RADIUS) {
            return { objId: obj.id, type: 'velocity', index: v.isLegacy ? null : i, isLegacy: !!v.isLegacy };
          }
        }

        // Check forces
        const forces = [...(obj.values?.forces || [])];
        if (obj.values?.force) forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0, isLegacy: true });

        for (let i = 0; i < forces.length; i++) {
          const f = forces[i];
          const fx = f.magnitude * Math.cos((f.angle * Math.PI) / 180) * 0.2;
          const fy = f.magnitude * Math.sin((f.angle * Math.PI) / 180) * 0.2;
          
          const headX = bx + fx, headY = by + fy;
          const dist = Math.sqrt((wx - headX) ** 2 + (wy - headY) ** 2);
          if (dist < HIT_RADIUS) {
            return { objId: obj.id, type: 'force', index: f.isLegacy ? null : i, isLegacy: !!f.isLegacy };
          }
        }
      }
      return null;
    },
    predictSimulationTime: () => {
      return predictSimulationTime(simState);
    },
    findSnapPoint: (wx, wy) => {
      const engine = engineRef.current;
      if (!engine) return null;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground');
      let bestPoint = null, minDist = 0.5;
      for (const body of bodies) {
        const dCenter = Math.sqrt((wx - body.position.x)**2 + (wy - body.position.y)**2);
        if (dCenter < minDist) { minDist = dCenter; bestPoint = { x: body.position.x, y: body.position.y }; }
        for (const v of body.vertices) {
          const dV = Math.sqrt((wx - v.x)**2 + (wy - v.y)**2);
          if (dV < minDist) { minDist = dV; bestPoint = { x: v.x, y: v.y }; }
        }
      }
      return bestPoint;
    },
    startVectorDrag: (wx, wy, tool, rawX, rawY) => {
      const engine = engineRef.current;
      if (!engine) return;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && !b.isStatic);
      let hit = Matter.Query.point(bodies, { x: rawX, y: rawY });
      if (!hit.length) hit = Matter.Query.point(bodies, { x: wx, y: wy });
      if (hit.length) {
        const body = hit[0];
        let objId = [...bodyMap.current.entries()].find(([,b]) => b === body)?.[0];
        if (objId) {
          drawingVectorRef.current = { type: tool, objId, startX: wx, startY: wy, currentX: wx, currentY: wy };
          return true;
        }
      }
      return false;
    },
    moveVectorDrag: (wx, wy) => { if (drawingVectorRef.current) { drawingVectorRef.current.currentX = wx; drawingVectorRef.current.currentY = wy; } },
    endVectorDrag: (wx, wy) => {
      const v = drawingVectorRef.current;
      if (v) { v.currentX = wx; v.currentY = wy; drawingVectorRef.current = null; return v; }
      return null;
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

  // Main Effect: Engine Creation and Render Loop
  useEffect(() => {
    const engine = createPhysicsEngine();
    engineRef.current = engine;
    bodyMap.current.clear();

    const ground = createGround();
    Matter.Composite.add(engine.world, ground);
    setSimSyncToken(v => v + 1);

    let raf;
    let lastTime = performance.now();
    let accumulator = 0;
    const TIME_STEP_MS = 1000 / 120;
    const DT = 1 / 120;

    const loop = (now) => {
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      if (timeStateRef.current?.isPlaying) {
        accumulator += delta * (timeStateRef.current.timeScale || 1);
        while (accumulator >= TIME_STEP_MS) {
          updatePhysics(engine, DT, loopPropsRef.current.simState, bodyMap.current, loopPropsRef.current.maxTime, timeStateRef.current, setIsPlaying);
          accumulator -= TIME_STEP_MS;
        }
      }

      // Draw
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const { size, offset, zoom, showCursorCoords, showResultantVector, activeTool, spawnConfig, gridSnapping, unitStep } = loopPropsRef.current;
        ctx.clearRect(0, 0, size.w, size.h);
        
        const pxPerUnit = PIXELS_PER_METER * zoom;
        const ox = size.w/2 + offset.x, oy = size.h/2 + offset.y;
        const toScreen = (wx, wy) => ({ x: ox + wx * pxPerUnit, y: oy - wy * pxPerUnit });

        // Draw Bodies
        Matter.Composite.allBodies(engine.world).forEach(body => {
          if (body.label === 'ground') return;
          ctx.beginPath();
          if (body.label === 'circle') {
             const c = toScreen(body.position.x, body.position.y); ctx.arc(c.x, c.y, body.circleRadius * pxPerUnit, 0, 2*Math.PI);
          } else {
             const first = toScreen(body.vertices[0].x, body.vertices[0].y); ctx.moveTo(first.x, first.y);
             for(let i=1; i<body.vertices.length; i++) { const p = toScreen(body.vertices[i].x, body.vertices[i].y); ctx.lineTo(p.x, p.y); }
          }
          ctx.closePath();
          ctx.fillStyle = (body.render?.fillStyle || '#999999') + 'CC'; ctx.fill();
          ctx.strokeStyle = body.render?.fillStyle; ctx.lineWidth = 2; ctx.stroke();
        });

        // Draw Vectors
        (loopPropsRef.current.simState?.objects || []).forEach(obj => {
          if (obj.isSpawned && bodyMap.current.get(obj.id)) {
            renderObjectVectors(ctx, toScreen, obj, bodyMap.current.get(obj.id), showResultantVector);
          }
        });

        // Current Dragging Vector
        if (drawingVectorRef.current) {
          const v = drawingVectorRef.current;
          drawArrow(ctx, toScreen, v.startX, v.startY, v.currentX, v.currentY, v.type === 'velocity' ? '#3B82F6' : '#EF4444');
        }

        // Overlays (Grid snapping, Cursor coords)
        if (gridSnapping && mouseRef.current.x > -1000) {
          const us = (unitStep || 1) / 5;
          const wx = Math.round(((mouseRef.current.x - ox) / pxPerUnit) / us) * us;
          const wy = Math.round(((oy - mouseRef.current.y) / pxPerUnit) / us) * us;
          const s = toScreen(wx, wy); ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 2 * Math.PI); ctx.fillStyle = '#9CA3AF'; ctx.fill();
        }

        if (showCursorCoords && mouseRef.current.x > -1000) {
          const wx = (mouseRef.current.x - ox) / pxPerUnit, wy = (oy - mouseRef.current.y) / pxPerUnit;
          const text = `${wx.toFixed(1)}m, ${wy.toFixed(1)}m`;
          ctx.font = '12px "Chakra Petch"'; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(mouseRef.current.x+15, mouseRef.current.y+15, ctx.measureText(text).width + 10, 20);
          ctx.fillStyle = '#fff'; ctx.fillText(text, mouseRef.current.x+20, mouseRef.current.y+30);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); Matter.Engine.clear(engine); Matter.Composite.clear(engine.world, false); };
  }, [engineResetToken]);

  // Sync state to engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simState) return;
    engine.gravity.y = -(simState.gravity / 1000);
    
    // Body lifecycle logic (add/remove)
    const activeIds = new Set(simState.objects?.filter(o => o.isSpawned).map(o => o.id) || []);
    for (const [id, b] of bodyMap.current.entries()) { if(!activeIds.has(id)) { Matter.Composite.remove(engine.world, b); bodyMap.current.delete(id); } }

    simState.objects?.forEach(obj => {
      if (!obj.isSpawned) return;
      let body = bodyMap.current.get(obj.id);
      if (!body) {
        const opts = { restitution: obj.values?.restitution || 0, friction: 0.5, frictionStatic: 0.8 };
        if (obj.shape === 'circle') body = Matter.Bodies.circle(obj.position?.x || 0, obj.position?.y || 10, obj.size || 1, opts);
        else if (obj.shape === 'polygon-3') body = Matter.Bodies.polygon(obj.position?.x || 0, obj.position?.y || 10, 3, (obj.size || 1) / Math.sqrt(3), opts);
        else body = Matter.Bodies.rectangle(obj.position?.x || 0, obj.position?.y || 10, obj.size || 1, obj.size || 1, opts);
        
        body.label = obj.shape; body.plugin = { size: obj.size || 1 };
        Matter.Composite.add(engine.world, body);
        bodyMap.current.set(obj.id, body);
      }
      body.render.fillStyle = obj.color;
      if (obj.values && !timeStateRef.current?.isPlaying) {
        if (obj.values.height !== undefined) Matter.Body.setPosition(body, { x: body.position.x, y: obj.values.height });
      }
    });
  }, [simState, simSyncToken]);

  return <canvas ref={canvasRef} width={size.w} height={size.h} className="absolute inset-0 pointer-events-none z-10" />;
});

export default memo(MatterCanvas);
