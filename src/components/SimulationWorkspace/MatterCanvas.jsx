import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, memo } from 'react';
import Matter from 'matter-js';

const MatterCanvas = forwardRef(({ size, offset, zoom, unitStep, simState, initialPhysics, onPhysicsChange, activeTool, spawnConfig, gridSnapping, showCursorCoords, showResultantVector, timeStateRef, setIsPlaying }, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map()); 
  const restoredBodiesRef = useRef(new Set());
  const onPhysicsChangeRef = useRef(onPhysicsChange);
  const drawingVectorRef = useRef(null);
  const simStateRef = useRef(simState); 
  const lastAppliedHeightRef = useRef(new Map()); 
  const lastAppliedVelocityRef = useRef(new Map()); 
  const mouseRef = useRef({ x: -1000, y: -1000 });

  // 🌟 Ref to store all drawing-related props to avoid loop re-initialization
  const drawPropsRef = useRef({
    size, offset, zoom, unitStep, activeTool, spawnConfig, gridSnapping, showCursorCoords, showResultantVector
  });

  useEffect(() => {
    onPhysicsChangeRef.current = onPhysicsChange;
  }, [onPhysicsChange]);

  useEffect(() => {
    simStateRef.current = simState;
    drawPropsRef.current.gridSnapping = gridSnapping;
    drawPropsRef.current.showCursorCoords = showCursorCoords;
    drawPropsRef.current.showResultantVector = showResultantVector;
    drawPropsRef.current.activeTool = activeTool;
    drawPropsRef.current.spawnConfig = spawnConfig;
  }, [simState, gridSnapping, showCursorCoords, showResultantVector, activeTool, spawnConfig]);

  useEffect(() => {
    drawPropsRef.current.size = size;
    drawPropsRef.current.offset = offset;
    drawPropsRef.current.zoom = zoom;
    drawPropsRef.current.unitStep = unitStep;
  }, [size, offset, zoom, unitStep]);

  // Track mouse position
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const handleMouseMove = (e) => {
      const el = parent || canvas;
      const rect = el.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const [engineResetToken, setEngineResetToken] = useState(0);
  const pendingActionRef = useRef(null);
  const [simSyncToken, setSimSyncToken] = useState(0);

  useImperativeHandle(ref, () => ({
    resetSimulation: (pendingAction) => {
      pendingActionRef.current = pendingAction || null;
      setEngineResetToken(prev => prev + 1);
    },
    separateBodies: () => {
      const engine = engineRef.current;
      if (!engine) return;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && !b.isStatic);
      for (let pass = 0; pass < 5; pass++) {
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const radA = a.circleRadius || (a.plugin?.size ?? 1);
            const radB = b.circleRadius || (b.plugin?.size ?? 1);
            const minDist = radA + radB;
            if (dist < minDist) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist; const ny = dy / dist;
              Matter.Body.setPosition(a, { x: a.position.x - nx * overlap, y: a.position.y - ny * overlap });
              Matter.Body.setPosition(b, { x: b.position.x + nx * overlap, y: b.position.y + ny * overlap });
            }
          }
        }
      }
    },
    startVectorDrag: (wx, wy, tool, rawX, rawY) => {
      const engine = engineRef.current;
      if (!engine) return;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && !b.isStatic);
      
      // Try hitting bodies using RAW coordinates first to avoid snapping jumps if near center
      let clicked = Matter.Query.point(bodies, { x: rawX, y: rawY });
      if (clicked.length === 0) clicked = Matter.Query.point(bodies, { x: wx, y: wy });

      if (clicked.length > 0) {
        const body = clicked[0];
        let objId = null;
        for (const [id, b] of bodyMap.current.entries()) { if (b === body) { objId = id; break; } }
        if (objId) {
          drawingVectorRef.current = { type: tool, objId, startX: body.position.x, startY: body.position.y, currentX: wx, currentY: wy };
          return true;
        }
      }
      return false;
    },
    moveVectorDrag: (wx, wy) => { if (drawingVectorRef.current) { drawingVectorRef.current.currentX = wx; drawingVectorRef.current.currentY = wy; } },
    endVectorDrag: (wx, wy) => {
      if (drawingVectorRef.current) {
        const v = drawingVectorRef.current;
        v.currentX = wx; v.currentY = wy;
        drawingVectorRef.current = null;
        return v;
      }
      return null;
    },
    findVectorAt: (wx, wy) => {
      if (!simStateRef.current?.objects) return null;
      for (const obj of simStateRef.current.objects) {
        if (!obj.isSpawned) continue;
        const body = bodyMap.current.get(obj.id);
        if (!body) continue;
        const px = body.position.x; const py = body.position.y;
        const vels = (obj.values?.velocities || []).slice();
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0, isLegacy: true });
        for (let i = 0; i < vels.length; i++) {
          const v = vels[i];
          const tox = px + (v.magnitude * Math.cos(v.angle * Math.PI / 180)) * 0.2;
          const toy = py + (v.magnitude * Math.sin(v.angle * Math.PI / 180)) * 0.2;
          if (distToSegment(wx, wy, px, py, tox, toy) < 0.2) return { objId: obj.id, type: 'velocity', index: i, isLegacy: v.isLegacy };
        }
        const forces = (obj.values?.forces || []).slice();
        if (obj.values?.force) forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0, isLegacy: true });
        for (let i = 0; i < forces.length; i++) {
          const f = forces[i];
          const tox = px + (f.magnitude * Math.cos(f.angle * Math.PI / 180)) * 0.2;
          const toy = py + (f.magnitude * Math.sin(f.angle * Math.PI / 180)) * 0.2;
          if (distToSegment(wx, wy, px, py, tox, toy) < 0.2) return { objId: obj.id, type: 'force', index: i, isLegacy: f.isLegacy };
        }
      }
      return null;
    },
    predictSimulationTime: () => {
      const state = simStateRef.current;
      if (!state || !state.objects || state.objects.length === 0) return 3;

      const tempEngine = Matter.Engine.create({ positionIterations: 6, velocityIterations: 4 });
      tempEngine.gravity.y = -(state.gravity / 1000);
      
      const ground = Matter.Bodies.rectangle(0, -20, 10000, 40, { isStatic: true, friction: 1 });
      Matter.Composite.add(tempEngine.world, ground);

      const bodies = [];
      state.objects.forEach(obj => {
        if (!obj.isSpawned) return;
        const startX = obj.position?.x ?? 0;
        const startY = obj.position?.y ?? (obj.values?.height ?? 10);
        const s = obj.size ?? 1;
        const opts = { restitution: obj.values?.restitution || 0, friction: 0.8, frictionAir: state.airResistance ? 0.05 : 0 };
        
        let body;
        if (obj.shape === 'circle') body = Matter.Bodies.circle(startX, startY, s, opts);
        else if (obj.shape === 'polygon-3') body = Matter.Bodies.polygon(startX, startY, 3, s / Math.sqrt(3), opts);
        else body = Matter.Bodies.rectangle(startX, startY, s, s, opts);
        
        let vx = 0, vy = 0;
        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
        vels.forEach(v => { 
          vx += (v.magnitude / 60) * Math.cos(v.angle * Math.PI / 180); 
          vy += (v.magnitude / 60) * Math.sin(v.angle * Math.PI / 180); 
        });
        Matter.Body.setVelocity(body, { x: vx, y: vy });
        if (obj.values?.mass) Matter.Body.setMass(body, obj.values.mass);
        
        Matter.Composite.add(tempEngine.world, body);
        bodies.push({ body, obj });
      });

      if (bodies.length === 0) return 3;

      let currentTime = 0;
      const MAX_PREDICT_TIME = 20; // 20 seconds limit
      const Hz = 120;
      const dt = 1/Hz;
      const stepMs = 1000/Hz;

      while (currentTime < MAX_PREDICT_TIME) {
        for (const b of bodies) {
          const forces = [...(b.obj.values?.forces || [])];
          if (b.obj.values?.force) forces.push({ magnitude: b.obj.values.force, angle: b.obj.values.forceAngle || 0 });
          for (const f of forces) {
            const mag = f.magnitude / 1000000;
            Matter.Body.applyForce(b.body, b.body.position, { x: mag * Math.cos(f.angle * Math.PI / 180), y: mag * Math.sin(f.angle * Math.PI / 180) });
          }
        }
        Matter.Engine.update(tempEngine, stepMs);
        currentTime += dt;

        let totalEnergy = 0;
        for (const b of bodies) {
          totalEnergy += 0.5 * b.body.mass * (b.body.velocity.x**2 + b.body.velocity.y**2);
        }
        if (totalEnergy < 0.00001 && currentTime > 0.5) break; 
      }
      
      return Math.round(currentTime * 100) / 100;
    }
  }));

  const distToSegment = (px, py, x1, y1, x2, y2) => {
    const l2 = (x1 - x2)**2 + (y1 - y2)**2;
    if (l2 === 0) return Math.sqrt((px-x1)**2 + (py-y1)**2);
    let t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
    return Math.sqrt((px - (x1 + t * (x2 - x1)))**2 + (py - (y1 + t * (y2 - y1)))**2);
  };

  // 🌟 UNIFIED PHYSICS & DRAW LOOP 🌟
  useEffect(() => {
    const engine = Matter.Engine.create({ positionIterations: 12, velocityIterations: 8 });
    engineRef.current = engine;
    bodyMap.current.clear();
    restoredBodiesRef.current.clear();
    
    const ground = Matter.Bodies.rectangle(0, -20, 10000, 40, { isStatic: true, label: 'ground', friction: 1 });
    Matter.Composite.add(engine.world, ground);
    setSimSyncToken(prev => prev + 1);

    if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setTimeout(() => {
          if (action.targetTime != null && action.targetTime > 0) {
            const STEP = 1000 / 120;
            const steps = Math.ceil((action.targetTime * 1000) / STEP);
            for (let i = 0; i < steps; i++) Matter.Engine.update(engine, STEP);
            if (timeStateRef?.current) { timeStateRef.current.time = action.targetTime; timeStateRef.current.isPlaying = false; }
            setIsPlaying(false);
          }
        }, 50);
    }

    let raf;
    let lastTime = performance.now();
    let accumulator = 0;
    const HZ = 120;
    const TIME_STEP = 1000 / HZ;
    const DT = 1 / HZ;
    let lastSave = performance.now();

    const drawArrow = (ctx, toScreen, fromWx, fromWy, toWx, toWy, color) => {
      const fromPos = toScreen(fromWx, fromWy);
      const toPos = toScreen(toWx, toWy);
      const headlen = 10;
      const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
      ctx.beginPath(); ctx.moveTo(fromPos.x, fromPos.y); ctx.lineTo(toPos.x, toPos.y);
      ctx.lineTo(toPos.x - headlen * Math.cos(angle - Math.PI / 6), toPos.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(toPos.x, toPos.y); ctx.lineTo(toPos.x - headlen * Math.cos(angle + Math.PI / 6), toPos.y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    };

    const loop = (now) => {
      let deltaBrowser = now - lastTime;
      if (deltaBrowser > 100) deltaBrowser = 100;
      lastTime = now;

      // 1. Physics Step
      if (timeStateRef?.current) {
        if (timeStateRef.current.isPlaying) {
          const tScale = timeStateRef.current.timeScale || 1;
          if (timeStateRef.current.targetTime !== null) {
              const target = timeStateRef.current.targetTime;
              if (target > timeStateRef.current.time) {
                  const steps = Math.ceil((target - timeStateRef.current.time) * 1000 / TIME_STEP);
                  for (let i = 0; i < steps; i++) Matter.Engine.update(engine, TIME_STEP);
                  timeStateRef.current.time = target;
              }
              timeStateRef.current.targetTime = null;
              timeStateRef.current.isPlaying = false;
              setIsPlaying(false);
          } else {
              accumulator += deltaBrowser * tScale;
              let steps = 0;
              while (accumulator >= TIME_STEP && steps < 10) {
                 if (simStateRef.current?.objects) {
                    for (const obj of simStateRef.current.objects) {
                       if (!obj.isSpawned) continue;
                       const body = bodyMap.current.get(obj.id);
                       if (!body) continue;
                       const forces = [...(obj.values?.forces || [])];
                       if (obj.values?.force) forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0 });
                       for (const f of forces) {
                          const mag = f.magnitude / 1000000;
                          Matter.Body.applyForce(body, body.position, { x: mag * Math.cos(f.angle * Math.PI / 180), y: mag * Math.sin(f.angle * Math.PI / 180) });
                       }
                    }
                 }
                 Matter.Engine.update(engine, TIME_STEP);
                 accumulator -= TIME_STEP; steps++;
                 timeStateRef.current.time += DT;

                 // Auto-stop if energy is low
                 const allBodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
                 let totalEnergy = 0;
                 for(const b of allBodies) {
                   totalEnergy += 0.5 * b.mass * (b.velocity.x**2 + b.velocity.y**2);
                 }
                 if (totalEnergy < 0.00001 && timeStateRef.current.time > 0.5) {
                   timeStateRef.current.isPlaying = false;
                   setIsPlaying(false);
                   break;
                 }
              }
              if (accumulator > TIME_STEP * 5) accumulator = 0;
          }
        }
      }

      // 2. Draw Step
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
          const { size, offset, zoom, activeTool, spawnConfig, gridSnapping, showCursorCoords, showResultantVector, unitStep } = drawPropsRef.current;
          const { w, h } = size;
          const pxPerUnit = 50 * zoom;
          const ox = w/2 + offset.x; const oy = h/2 + offset.y;
          const toScreen = (wx, wy) => ({ x: ox + wx * pxPerUnit, y: oy - wy * pxPerUnit });

          ctx.clearRect(0, 0, w, h);
          const bodies = Matter.Composite.allBodies(engine.world);

          // Render Bodies
          for (const body of bodies) {
            if (body.label === 'ground' || !body.vertices.length) continue;
            ctx.beginPath();
            if (body.label === 'circle') {
              const center = toScreen(body.position.x, body.position.y);
              ctx.arc(center.x, center.y, body.circleRadius * pxPerUnit, 0, 2 * Math.PI);
              ctx.moveTo(center.x, center.y);
              const edge = toScreen(body.position.x + body.circleRadius * Math.cos(body.angle), body.position.y + body.circleRadius * Math.sin(body.angle));
              ctx.lineTo(edge.x, edge.y);
            } else {
              const first = toScreen(body.vertices[0].x, body.vertices[0].y);
              ctx.moveTo(first.x, first.y);
              for (let i = 1; i < body.vertices.length; i++) {
                const p = toScreen(body.vertices[i].x, body.vertices[i].y); ctx.lineTo(p.x, p.y);
              }
            }
            ctx.closePath();
            const color = body.render?.fillStyle || '#999999';
            ctx.fillStyle = color + 'CC'; ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
          }

          // Vectors
          if (simStateRef.current?.objects) {
            simStateRef.current.objects.forEach(obj => {
              if (!obj.isSpawned) return;
              const body = bodyMap.current.get(obj.id);
              if (!body) return;
              const vels = [...(obj.values?.velocities || [])];
              if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
              vels.forEach(v => drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + (v.magnitude * Math.cos(v.angle*Math.PI/180)) * 0.2, body.position.y + (v.magnitude * Math.sin(v.angle*Math.PI/180)) * 0.2, '#3B82F6'));
              const forces = [...(obj.values?.forces || [])];
              if (obj.values?.force) forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle|| 0 });
              forces.forEach(f => drawArrow(ctx, toScreen, body.position.x, body.position.y, body.position.x + (f.magnitude * Math.cos(f.angle*Math.PI/180)) * 0.2, body.position.y + (f.magnitude * Math.sin(f.angle*Math.PI/180)) * 0.2, '#EF4444'));
            });
          }

          // Active Drawing Vector
          if (drawingVectorRef.current) {
            const v = drawingVectorRef.current;
            drawArrow(ctx, toScreen, v.startX, v.startY, v.currentX, v.currentY, v.type === 'velocity' ? '#3B82F6' : '#EF4444');
          }

          // UI Overlays (Grid snapping, Cursor tooltip, Hologram)
          if (gridSnapping && mouseRef.current.x > -1000) {
            const us = (unitStep || 1) / 5;
            const wx = Math.round(((mouseRef.current.x - ox) / pxPerUnit) / us) * us;
            const wy = Math.round(((oy - mouseRef.current.y) / pxPerUnit) / us) * us;
            const s = toScreen(wx, wy); ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 2 * Math.PI); ctx.fillStyle = '#9CA3AF'; ctx.fill();
          }

          if (activeTool === 'add' && spawnConfig) {
            ctx.beginPath(); const s = spawnConfig.size * pxPerUnit; 
            let mx = mouseRef.current.x, my = mouseRef.current.y;
            if (gridSnapping) {
               const us = (unitStep || 1) / 5; 
               mx = ox + Math.round(((mx - ox) / pxPerUnit) / us) * us * pxPerUnit; 
               my = oy - Math.round(((oy - my) / pxPerUnit) / us) * us * pxPerUnit;
            }
            if (spawnConfig.shape === 'circle') ctx.arc(mx, my, s, 0, 2 * Math.PI);
            else if (spawnConfig.shape === 'polygon-3') { const r = s/Math.sqrt(3); ctx.moveTo(mx, my-r); ctx.lineTo(mx+s/2, my+r/2); ctx.lineTo(mx-s/2, my+r/2); }
            else ctx.rect(mx - s/2, my - s/2, s, s);
            ctx.fillStyle = spawnConfig.color + '44'; ctx.fill(); ctx.strokeStyle = spawnConfig.color; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
          }

          if (showCursorCoords && mouseRef.current.x > -1000) {
            const wx = (mouseRef.current.x - ox) / pxPerUnit; const wy = (oy - mouseRef.current.y) / pxPerUnit;
            const text = `${wx.toFixed(1)}m, ${wy.toFixed(1)}m`;
            ctx.font = '12px "Chakra Petch"'; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(mouseRef.current.x+15, mouseRef.current.y+15, ctx.measureText(text).width + 10, 20);
            ctx.fillStyle = '#fff'; ctx.fillText(text, mouseRef.current.x+20, mouseRef.current.y+30);
          }
      }

      raf = requestAnimationFrame(loop);
      if (now - lastSave > 2000) {
        lastSave = now;
        const data = {};
        for (const [id, b] of bodyMap.current.entries()) data[id] = { position: {...b.position}, angle: b.angle, velocity: {...b.velocity}, angularVelocity: b.angularVelocity };
        if (onPhysicsChangeRef.current) onPhysicsChangeRef.current(data, true);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { 
      cancelAnimationFrame(raf); 
      Matter.Engine.clear(engine);
      Matter.Composite.clear(engine.world, false); // Clear bodies specifically
    };
  }, [engineResetToken]);

  // Sync simState -> Engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simStateRef.current) return;
    engine.gravity.y = -(simStateRef.current.gravity / 1000);
    
    const spawned = new Set((simStateRef.current.objects || []).filter(o => o.isSpawned).map(o => o.id));
    for (const [id, body] of bodyMap.current.entries()) { if (!spawned.has(id)) { Matter.Composite.remove(engine.world, body); bodyMap.current.delete(id); } }

    (simStateRef.current.objects || []).forEach(obj => {
      if (!obj.isSpawned) return;
      let body = bodyMap.current.get(obj.id);
      if (!body) {
        const startX = obj.position?.x ?? 0;
        const startY = obj.position?.y ?? (obj.values?.height ?? 10);
        const s = obj.size ?? 1;
        const opts = { restitution: obj.values?.restitution || 0, friction: 0.8 };
        
        if (obj.shape === 'circle') {
          body = Matter.Bodies.circle(startX, startY, s, opts);
        } else if (obj.shape === 'polygon-3') {
          body = Matter.Bodies.polygon(startX, startY, 3, s / Math.sqrt(3), opts);
        } else {
          body = Matter.Bodies.rectangle(startX, startY, s, s, opts);
        }
        body.label = obj.shape;
        body.plugin = { size: s };
        
        let vx = 0, vy = 0;
        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
        vels.forEach(v => { 
          vx += (v.magnitude / 60) * Math.cos(v.angle * Math.PI / 180); 
          vy += (v.magnitude / 60) * Math.sin(v.angle * Math.PI / 180); 
        });
        Matter.Body.setVelocity(body, { x: vx, y: vy });
        Matter.Composite.add(engine.world, body);
        bodyMap.current.set(obj.id, body);
      }
      body.render.fillStyle = obj.color;
      if (obj.values) {
        if (obj.values.mass) Matter.Body.setMass(body, obj.values.mass);
        if (!timeStateRef?.current?.isPlaying) {
          if (obj.values.height !== undefined) Matter.Body.setPosition(body, { x: body.position.x, y: obj.values.height });
          let vx = 0, vy = 0;
          const vels = [...(obj.values?.velocities || [])];
          if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
          vels.forEach(v => { 
            vx += (v.magnitude / 60) * Math.cos(v.angle * Math.PI / 180); 
            vy += (v.magnitude / 60) * Math.sin(v.angle * Math.PI / 180); 
          });
          Matter.Body.setVelocity(body, { x: vx, y: vy });
        }
      }
      body.frictionAir = simStateRef.current.airResistance ? 0.05 : 0;
    });
  }, [simState, simSyncToken]);

  return <canvas ref={canvasRef} width={size.w} height={size.h} className="absolute inset-0 pointer-events-none z-10" />;
});

export default memo(MatterCanvas);
