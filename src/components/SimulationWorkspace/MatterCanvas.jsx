import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import Matter from 'matter-js';

const MatterCanvas = forwardRef(({ size, offset, zoom, simState, initialPhysics, onPhysicsChange, activeTool, spawnConfig, gridSnapping, showCursorCoords, timeStateRef, setIsPlaying }, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map()); 
  const restoredBodiesRef = useRef(new Set());
  const onPhysicsChangeRef = useRef(onPhysicsChange);
  const drawingVectorRef = useRef(null);
  const simStateRef = useRef(simState); // keep a live ref so engine init can read latest simState
  const lastAppliedHeightRef = useRef(new Map()); // track applied heights to prevent constant teleporting
  const lastAppliedVelocityRef = useRef(new Map()); // track applied velocities


  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    onPhysicsChangeRef.current = onPhysicsChange;
  }, [onPhysicsChange]);

  useEffect(() => {
    simStateRef.current = simState;
  }, [simState]);

  const { w, h } = size;
  const basePixelsPerUnit = 50; 
  const pxPerUnit = basePixelsPerUnit * zoom;
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;

  // Track mouse position relative to canvas for hologram preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const handleMouseMove = (e) => {
      const el = parent || canvas;
      const rect = el.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
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
            const radiusA = a.circleRadius || (a.plugin?.size ?? 1);
            const radiusB = b.circleRadius || (b.plugin?.size ?? 1);
            const minDist = radiusA + radiusB;
            if (dist < minDist) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              Matter.Body.setPosition(a, { x: a.position.x - nx * overlap, y: a.position.y - ny * overlap });
              Matter.Body.setPosition(b, { x: b.position.x + nx * overlap, y: b.position.y + ny * overlap });
            }
          }
        }
      }
    },
    startVectorDrag: (wx, wy, activeTool) => {
      const engine = engineRef.current;
      if (!engine) return;
      
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && !b.isStatic);
      const clickedBodies = Matter.Query.point(bodies, { x: wx, y: wy });
      
      if (clickedBodies.length > 0) {
        const body = clickedBodies[0];
        let objId = null;
        for (const [id, b] of bodyMap.current.entries()) {
          if (b === body) { objId = id; break; }
        }
        if (objId) {
          drawingVectorRef.current = {
            type: activeTool,
            objId,
            startX: body.position.x,
            startY: body.position.y,
            currentX: wx,
            currentY: wy
          };
          return true;
        }
      }
      return false;
    },
    moveVectorDrag: (wx, wy) => {
      if (drawingVectorRef.current) {
        drawingVectorRef.current.currentX = wx;
        drawingVectorRef.current.currentY = wy;
      }
    },
    endVectorDrag: (wx, wy) => {
      if (drawingVectorRef.current) {
        const v = drawingVectorRef.current;
        v.currentX = wx;
        v.currentY = wy;
        const dx = v.currentX - v.startX;
        const dy = v.currentY - v.startY;
        const res = { ...v };
        drawingVectorRef.current = null;
        return res;
      }
      return null;
    }
  }));

  useEffect(() => {
    const engine = Matter.Engine.create({
      positionIterations: 16,
      velocityIterations: 12
    });
    engineRef.current = engine;
    bodyMap.current.clear();
    restoredBodiesRef.current.clear();
    
    const ground = Matter.Bodies.rectangle(0, -20, 10000, 40, { 
      isStatic: true,
      label: 'ground',
      friction: 1,
    });
    Matter.Composite.add(engine.world, ground);

    setSimSyncToken(prev => prev + 1);

    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(() => {
        if (action.targetTime != null && action.targetTime > 0) {
          const TIME_STEP_MS = 1000 / 120;
          const numSteps = Math.ceil((action.targetTime * 1000) / TIME_STEP_MS);
          for (let i = 0; i < numSteps; i++) {
            Matter.Engine.update(engine, TIME_STEP_MS);
          }
          if (timeStateRef?.current) {
            timeStateRef.current.time = action.targetTime;
            timeStateRef.current.targetTime = null;
            timeStateRef.current.isPlaying = false;
          }
          setIsPlaying(false);
        }
      }, 50); // small delay so bodies are synced first
    }

    let raf;
    let lastTime = performance.now();
    let accumulator = 0;
    const TIME_STEP = 1000 / 120; // internal physics step ~8.33ms

    let lastSave = performance.now();

    const loop = (now) => {
      let deltaBrowser = now - lastTime;
      if (deltaBrowser > 100) deltaBrowser = 100;
      lastTime = now;

      if (timeStateRef && timeStateRef.current) {
         if (timeStateRef.current.isPlaying) {
             const tScale = timeStateRef.current.timeScale || 1;
             
             // === INSTANT FAST FORWARD to targetTime ===
             if (timeStateRef.current.targetTime !== null) {
                  const targetTime = timeStateRef.current.targetTime;
                  if (targetTime > timeStateRef.current.time) {
                      // Instantly simulate all needed steps
                      const jumpAmount = targetTime - timeStateRef.current.time;
                      const numSteps = Math.ceil((jumpAmount * 1000) / TIME_STEP);
                      for (let i = 0; i < numSteps; i++) {
                         Matter.Engine.update(engine, TIME_STEP);
                      }
                      timeStateRef.current.time = targetTime;
                      timeStateRef.current.targetTime = null;
                      timeStateRef.current.isPlaying = false;
                      setIsPlaying(false);
                      accumulator = 0;
                  } else {
                      // Target already reached or equal, just stop
                      timeStateRef.current.targetTime = null;
                      timeStateRef.current.isPlaying = false;
                      setIsPlaying(false);
                  }
             } else {
                 // Normal playback
                 accumulator += deltaBrowser * tScale;
                 let stepsThisFrame = 0;
                 while (accumulator >= TIME_STEP && stepsThisFrame < 20) {
                    // Apply continuous forces before update
                    if (simStateRef.current?.objects) {
                       for (const obj of simStateRef.current.objects) {
                          if (!obj.isSpawned || !obj.values?.force) continue;
                          const body = bodyMap.current.get(obj.id);
                          if (body) {
                             const mag = obj.values.force * 0.001; // Scaled to be physics-friendly
                             const ang = obj.values.forceAngle || 0;
                             const fx = mag * Math.cos(ang * Math.PI / 180);
                             const fy = -mag * Math.sin(ang * Math.PI / 180); // Y inverted
                             Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
                          }
                       }
                    }

                    Matter.Engine.update(engine, TIME_STEP);
                    accumulator -= TIME_STEP;
                    stepsThisFrame++;
                 }
                 // Clamp leftover accumulator to avoid spiral
                 if (accumulator > TIME_STEP * 5) accumulator = 0;
                 
                 timeStateRef.current.time += (deltaBrowser * tScale) / 1000;
             }
         }
      } else {
         accumulator += deltaBrowser;
         while (accumulator >= TIME_STEP) {
           Matter.Engine.update(engine, TIME_STEP);
           accumulator -= TIME_STEP;
         }
      }

      raf = requestAnimationFrame(loop);

      if (now - lastSave > 3000) {
        lastSave = now;
        if (onPhysicsChangeRef.current) {
           const bodiesData = {};
           let hasMovingBodies = false;
           for (const [id, body] of bodyMap.current.entries()) {
               bodiesData[id] = {
                   position: { ...body.position },
                   angle: body.angle,
                   velocity: { ...body.velocity },
                   angularVelocity: body.angularVelocity
               };
               if (body.speed > 0.1 || Math.abs(body.angularVelocity) > 0.1) {
                   hasMovingBodies = true;
               }
           }
           onPhysicsChangeRef.current(bodiesData, hasMovingBodies);
        }
      }
    };
    raf = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(raf);
      Matter.Engine.clear(engine);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineResetToken]);

  // 2. Sync simState -> Engine (also re-runs when simSyncToken bumps after reset)
  useEffect(() => {
    const engine = engineRef.current;
    const currentSimState = simStateRef.current || simState;
    if (!engine || !currentSimState) return;

    engine.gravity.y = -(currentSimState.gravity / 9.8); 
    
    const currentSpawnedIds = new Set(
      (currentSimState.objects || []).filter((o) => o.isSpawned).map((o) => o.id)
    );

    for (const [id, body] of bodyMap.current.entries()) {
      if (!currentSpawnedIds.has(id)) {
        Matter.Composite.remove(engine.world, body);
        bodyMap.current.delete(id);
      }
    }

    (currentSimState.objects || []).forEach(obj => {
      if (!obj.isSpawned) return;

      let body = bodyMap.current.get(obj.id);
      
      if (body && (body.label !== obj.shape || body.plugin?.size !== obj.size)) {
        Matter.Composite.remove(engine.world, body);
        body = null;
      }

      if (!body) {
        const startX = obj.position?.x !== undefined ? obj.position.x : ((Math.random() - 0.5) * 0.1);
        const startY = obj.position?.y !== undefined ? obj.position.y : (obj.values?.height !== undefined ? obj.values.height : 10);
        const s = obj.size !== undefined ? obj.size : 1; 

        let newBody;
        const opts = { restitution: 0, friction: 0.8 };
        if (obj.shape === 'circle') {
          opts.friction = 1.0;
          opts.frictionStatic = 2.0;
          opts.slop = 0.01;
        }
        switch(obj.shape) {
          case 'circle': 
            newBody = Matter.Bodies.circle(startX, startY, s, opts); 
            break;
          case 'polygon-3': 
            newBody = Matter.Bodies.polygon(startX, startY, 3, s / Math.sqrt(3), opts); 
            break;
          case 'rectangle': 
          default: 
            newBody = Matter.Bodies.rectangle(startX, startY, s, s, opts); 
            break;
        }
        newBody.label = obj.shape;
        newBody.plugin = { size: s }; 
        
        const u = obj.values?.velocity || 0;
        const theta = obj.values?.angle || 0;
        const vx = u * Math.cos(theta * Math.PI / 180);
        const vy = -u * Math.sin(theta * Math.PI / 180);
        Matter.Body.setVelocity(newBody, { x: vx, y: vy });

        Matter.Composite.add(engine.world, newBody);
        bodyMap.current.set(obj.id, newBody);
        body = newBody;

        // Only restore saved positions on first load, NOT after a restart
        if (simSyncToken === 0 && initialPhysics?.bodies?.[obj.id] && !restoredBodiesRef.current.has(obj.id)) {
            const saved = initialPhysics.bodies[obj.id];
            Matter.Body.setPosition(body, saved.position);
            Matter.Body.setAngle(body, saved.angle);
            Matter.Body.setVelocity(body, saved.velocity);
            Matter.Body.setAngularVelocity(body, saved.angularVelocity);
            restoredBodiesRef.current.add(obj.id);
        }
      }

      // Update height (Y position) for existing body when the slider changes
      if (body && obj.values?.height !== undefined && !timeStateRef?.current?.isPlaying) {
        const targetY = obj.values.height;
        if (lastAppliedHeightRef.current.get(obj.id) !== targetY) {
          if (Math.abs(body.position.y - targetY) > 0.01) {
            Matter.Body.setPosition(body, { x: body.position.x, y: targetY });
            Matter.Body.setVelocity(body, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(body, 0);
          }
          lastAppliedHeightRef.current.set(obj.id, targetY);
        }
      }

      body.render = body.render || {};
      body.render.fillStyle = obj.color;

      if (obj.values) {
         if (obj.values.mass !== undefined && Math.abs(body.mass - obj.values.mass) > 0.01) {
           Matter.Body.setMass(body, obj.values.mass);
         }
         if (obj.values.restitution !== undefined) {
           body.restitution = obj.values.restitution;
         }
         // Apply velocity immediately if changed while paused
         if (!timeStateRef?.current?.isPlaying && obj.values.velocity !== undefined) {
           const mag = obj.values.velocity;
           const ang = obj.values.angle || 0;
           const trackedStr = lastAppliedVelocityRef.current.get(obj.id);
           const currentStr = `${mag}_${ang}`;
           
           if (trackedStr !== currentStr) {
               const vx = mag * Math.cos(ang * Math.PI / 180);
               const vy = -mag * Math.sin(ang * Math.PI / 180); // Y is inverted in Matter.js
               Matter.Body.setVelocity(body, { x: vx, y: vy });
               lastAppliedVelocityRef.current.set(obj.id, currentStr);
           }
         }
      }
      body.frictionAir = currentSimState.airResistance ? 0.05 : 0;
    });

  }, [simState, initialPhysics?.bodies, simSyncToken]);

  // 3. Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const engine = engineRef.current;
      if (!engine) return;

      const toScreen = (wx, wy) => ({
        x: ox + wx * pxPerUnit,
        y: oy - wy * pxPerUnit
      });

      const bodies = Matter.Composite.allBodies(engine.world);

      for (const body of bodies) {
        if (body.label === 'ground') continue;
        if (!body.vertices || body.vertices.length === 0) continue;

        ctx.beginPath();
        if (body.label === 'circle') {
          const center = toScreen(body.position.x, body.position.y);
          const radius = body.circleRadius * pxPerUnit;
          ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
          
          ctx.moveTo(center.x, center.y);
          const edgeWx = body.position.x + body.circleRadius * Math.cos(body.angle);
          const edgeWy = body.position.y + body.circleRadius * Math.sin(body.angle);
          const edgeScreen = toScreen(edgeWx, edgeWy);
          ctx.lineTo(edgeScreen.x, edgeScreen.y);
        } else {
          const first = toScreen(body.vertices[0].x, body.vertices[0].y);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < body.vertices.length; i++) {
            const p = toScreen(body.vertices[i].x, body.vertices[i].y);
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.closePath();

        const color = body.render?.fillStyle || '#999999';
        ctx.fillStyle = color + 'CC'; 
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 🌟 Helper to draw arrows
      const drawArrow = (fromWx, fromWy, toWx, toWy, color) => {
        const fromPos = toScreen(fromWx, fromWy);
        const toPos = toScreen(toWx, toWy);
        const headlen = 12; // length of head in pixels
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const angle = Math.atan2(dy, dx);
        
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.lineTo(toPos.x - headlen * Math.cos(angle - Math.PI / 6), toPos.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toPos.x, toPos.y);
        ctx.lineTo(toPos.x - headlen * Math.cos(angle + Math.PI / 6), toPos.y - headlen * Math.sin(angle + Math.PI / 6));
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      };

      // 🌟 Render existing velocity and force vectors for objects
      if (simStateRef.current?.objects) {
        simStateRef.current.objects.forEach(obj => {
          if (!obj.isSpawned) return;
          const body = bodyMap.current.get(obj.id);
          if (!body) return;
          const px = body.position.x;
          const py = body.position.y;
          
          if (obj.values?.velocity) {
            const mag = obj.values.velocity;
            const ang = obj.values.angle || 0;
            // Draw blue line proportional to magnitude
            const dx = (mag * Math.cos(ang * Math.PI / 180)) * 0.2; // scale visually
            const dy = (mag * Math.sin(ang * Math.PI / 180)) * 0.2;
            const toX = px + dx; 
            const toY = py + dy;
            
            // Draw components
            if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
              ctx.setLineDash([4, 4]);
              drawArrow(px, py, px + dx, py, 'rgba(59, 130, 246, 0.4)'); // X component
              drawArrow(px + dx, py, px + dx, py + dy, 'rgba(59, 130, 246, 0.4)'); // Y component
              ctx.setLineDash([]);
            }
            
            drawArrow(px, py, toX, toY, '#3B82F6'); // Main Blue
          }
          
          if (obj.values?.force) {
            const mag = obj.values.force;
            const ang = obj.values.forceAngle || 0;
            // Draw red line proportional to force
            const dx = (mag * Math.cos(ang * Math.PI / 180)) * 0.2;
            const dy = (mag * Math.sin(ang * Math.PI / 180)) * 0.2;
            const toX = px + dx;
            const toY = py + dy;

            // Draw components
            if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
              ctx.setLineDash([4, 4]);
              drawArrow(px, py, px + dx, py, 'rgba(239, 68, 68, 0.4)'); // X component
              drawArrow(px + dx, py, px + dx, py + dy, 'rgba(239, 68, 68, 0.4)'); // Y component
              ctx.setLineDash([]);
            }

            drawArrow(px, py, toX, toY, '#EF4444'); // Main Red
          }
        });
      }

      // 🌟 Render actively drawn vector
      if (drawingVectorRef.current) {
        const v = drawingVectorRef.current;
        const color = v.type === 'velocity' ? '#3B82F6' : '#EF4444';
        const colorLight = v.type === 'velocity' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        
        const dx = v.currentX - v.startX;
        const dy = v.currentY - v.startY;
        
        if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
          ctx.setLineDash([4, 4]);
          drawArrow(v.startX, v.startY, v.startX + dx, v.startY, colorLight);
          drawArrow(v.startX + dx, v.startY, v.currentX, v.currentY, colorLight);
          ctx.setLineDash([]);
        }
        
        drawArrow(v.startX, v.startY, v.currentX, v.currentY, color);
      }

      // Hologram preview (only when 'add' tool active)
      if (activeTool === 'add' && spawnConfig) {
        ctx.beginPath();
        const s = spawnConfig.size * pxPerUnit;
        let mx = mouseRef.current.x;
        let my = mouseRef.current.y;

        // Snap preview to grid if gridSnapping is on
        if (gridSnapping) {
          const wx = (mx - ox) / pxPerUnit;
          const wy = (oy - my) / pxPerUnit;
          const snappedWx = Math.round(wx);
          const snappedWy = Math.round(wy);
          mx = ox + snappedWx * pxPerUnit;
          my = oy - snappedWy * pxPerUnit;
        }

        if (spawnConfig.shape === 'circle') {
          ctx.arc(mx, my, s, 0, 2 * Math.PI);
        } else if (spawnConfig.shape === 'polygon-3') {
          const r = s / Math.sqrt(3);
          ctx.moveTo(mx, my - r);
          ctx.lineTo(mx + s/2, my + r/2);
          ctx.lineTo(mx - s/2, my + r/2);
        } else {
          ctx.rect(mx - s/2, my - s/2, s, s);
        }
        ctx.closePath();
        
        ctx.fillStyle = spawnConfig.color + '66';
        ctx.fill();
        ctx.strokeStyle = spawnConfig.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Cursor Coords Tooltip
      // Ensure we only show it when mouse is in bounds (mx, my > -1000 check handles initial state)
      if (showCursorCoords && mouseRef.current.x > -1000) {
        let mx = mouseRef.current.x;
        let my = mouseRef.current.y;
        
        let wx = (mx - ox) / pxPerUnit;
        let wy = (oy - my) / pxPerUnit;
        
        // Match the hologram snap behavior
        if (gridSnapping) {
           wx = Math.round(wx);
           wy = Math.round(wy);
           // visually stick tooltip to the snapped grid intersection point
           mx = ox + wx * pxPerUnit;
           my = oy - wy * pxPerUnit;
        }

        const text = `${wx.toFixed(1)}m, ${wy.toFixed(1)}m`;
        ctx.font = '12px "Chakra Petch", sans-serif';
        const textWidth = ctx.measureText(text).width;
        const padX = 8;
        const boxW = textWidth + padX * 2;
        const boxH = 22;
        
        const tipX = mx + 15;
        const tipY = my + 15;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(tipX, tipY, boxW, boxH, 4);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tipX + padX, tipY + boxH/2 + 1);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h, ox, oy, pxPerUnit, activeTool, spawnConfig, gridSnapping, showCursorCoords]);

  return (
    <canvas 
      ref={canvasRef}
      width={w}
      height={h}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
});

export default MatterCanvas;