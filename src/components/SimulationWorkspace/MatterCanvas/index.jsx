import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, memo } from 'react';
import Matter from 'matter-js';
import { PIXELS_PER_METER, renderObjectVectors, drawArrow } from './VectorRenderer';
import { createPhysicsEngine, createGround, updatePhysics, predictSimulationTime, worldToMatter, matterToWorld, computeGravityY } from './PhysicsEngine';

const MatterCanvas = forwardRef(({ 
  size, offset, zoom, unitStep, simState, onPhysicsChange, 
  activeTool, spawnConfig, gridSnapping, showCursorCoords, 
  showResultantVector, timeStateRef, setIsPlaying, maxTime,
  followedObjectId, selectedObjectId
}, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map());
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const drawingVectorRef = useRef(null);
  
  const [engineResetToken, setEngineResetToken] = useState(0);
  const [simSyncToken, setSimSyncToken] = useState(0);
  const pendingActionRef = useRef(null);

  // ✅ เพิ่ม onPhysicsChange เข้า loopPropsRef เพื่อให้ render loop เข้าถึงได้
  const loopPropsRef = useRef({});
  useEffect(() => {
    loopPropsRef.current = { 
      simState, gridSnapping, showCursorCoords, showResultantVector, 
      activeTool, spawnConfig, maxTime, size, offset, zoom, unitStep,
      followedObjectId, selectedObjectId,
      onPhysicsChange, // ✅ เพิ่มตรงนี้
    };
  }, [simState, gridSnapping, showCursorCoords, showResultantVector,
      activeTool, spawnConfig, maxTime, size, offset, zoom, unitStep,
      followedObjectId, selectedObjectId, onPhysicsChange]); // ✅ เพิ่มใน dependency array

  // Imperative API for Parent
  useImperativeHandle(ref, () => ({
    resetSimulation: (pendingAction) => {
      pendingActionRef.current = pendingAction || null;
      setEngineResetToken(prev => prev + 1);
    },

    findVectorAt: (wx, wy) => {
      if (!simState?.objects) return null;

      for (const obj of simState.objects) {
        if (!obj.isSpawned) continue;
        const body = bodyMap.current.get(obj.id);
        if (!body) continue;

        const worldPos = matterToWorld(body.position.x, body.position.y);
        const bx = worldPos.x;
        const by = worldPos.y;

        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0, isLegacy: true });

        for (let i = 0; i < vels.length; i++) {
          const v = vels[i];
          const headX = bx + v.magnitude * Math.cos((v.angle * Math.PI) / 180) * 0.2;
          const headY = by + v.magnitude * Math.sin((v.angle * Math.PI) / 180) * 0.2;
          const dist = Math.sqrt((wx - headX) ** 2 + (wy - headY) ** 2);
          if (dist < 0.5) {
            return { objId: obj.id, type: 'velocity', index: v.isLegacy ? null : i, isLegacy: !!v.isLegacy };
          }
        }

        const forces = [...(obj.values?.forces || [])];
        if (obj.values?.force) forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0, isLegacy: true });

        for (let i = 0; i < forces.length; i++) {
          const f = forces[i];
          const headX = bx + f.magnitude * Math.cos((f.angle * Math.PI) / 180) * 0.2;
          const headY = by + f.magnitude * Math.sin((f.angle * Math.PI) / 180) * 0.2;
          const dist = Math.sqrt((wx - headX) ** 2 + (wy - headY) ** 2);
          if (dist < 0.5) {
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
        const wp = matterToWorld(body.position.x, body.position.y);
        const dCenter = Math.sqrt((wx - wp.x) ** 2 + (wy - wp.y) ** 2);
        if (dCenter < minDist) { minDist = dCenter; bestPoint = { x: wp.x, y: wp.y }; }
        
        if (body.label === 'circle') {
          const radiusM = body.circleRadius / PIXELS_PER_METER;
          const angle = Math.atan2(wy - wp.y, wx - wp.x);
          const circumferencePoint = {
            x: wp.x + radiusM * Math.cos(angle),
            y: wp.y + radiusM * Math.sin(angle)
          };
          const dCircle = Math.sqrt((wx - circumferencePoint.x) ** 2 + (wy - circumferencePoint.y) ** 2);
          if (dCircle < minDist) { minDist = dCircle; bestPoint = circumferencePoint; }
        } else {
          for (const v of body.vertices) {
            const wv = matterToWorld(v.x, v.y);
            const dV = Math.sqrt((wx - wv.x) ** 2 + (wy - wv.y) ** 2);
            if (dV < minDist) { minDist = dV; bestPoint = { x: wv.x, y: wv.y }; }
          }
        }
      }
      return bestPoint;
    },

    startVectorDrag: (wx, wy, tool, rawX, rawY) => {
      const engine = engineRef.current;
      if (!engine) return;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && !b.isStatic);
      const { x: mx, y: my } = worldToMatter(rawX, rawY);
      let hit = Matter.Query.point(bodies, { x: mx, y: my });
      if (!hit.length) {
        const { x: mx2, y: my2 } = worldToMatter(wx, wy);
        hit = Matter.Query.point(bodies, { x: mx2, y: my2 });
      }
      if (hit.length) {
        const body = hit[0];
        const objId = [...bodyMap.current.entries()].find(([, b]) => b === body)?.[0];
        if (objId) {
          drawingVectorRef.current = { type: tool, objId, startX: wx, startY: wy, currentX: wx, currentY: wy };
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
      const v = drawingVectorRef.current;
      if (v) { v.currentX = wx; v.currentY = wy; drawingVectorRef.current = null; return v; }
      return null;
    },
    
    findObjectAt: (wx, wy) => {
      const engine = engineRef.current;
      if (!engine) return null;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground');
      const { x: mx, y: my } = worldToMatter(wx, wy);
      const hit = Matter.Query.point(bodies, { x: mx, y: my });
      if (hit.length) {
        const body = hit[0];
        const objId = [...bodyMap.current.entries()].find(([, b]) => b === body)?.[0];
        return objId || null;
      }
      return null;
    },

    teleportObject: (id, wx, wy) => {
      const body = bodyMap.current.get(id);
      if (!body) return;
      const { x: mx, y: my } = worldToMatter(wx, wy);
      Matter.Body.setPosition(body, { x: mx, y: my });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      if (controlPanelRef.current?.updateObjectValues) {
        controlPanelRef.current.updateObjectValues(id, { height: wy });
      }
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
    const FIXED_DELTA_MS = 1000 / 60;

    const loop = (now) => {
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      if (timeStateRef.current?.isPlaying) {
        accumulator += delta * (timeStateRef.current.timeScale || 1);
        while (accumulator >= FIXED_DELTA_MS) {
          updatePhysics(
            engine,
            FIXED_DELTA_MS,
            loopPropsRef.current.simState,
            bodyMap.current,
            loopPropsRef.current.maxTime,
            timeStateRef.current,
            setIsPlaying
          );
          if (timeStateRef.current) {
            timeStateRef.current.totalPhysicsTicks = (timeStateRef.current.totalPhysicsTicks || 0) + 1;
            timeStateRef.current.time = timeStateRef.current.totalPhysicsTicks * (FIXED_DELTA_MS / 1000);
          }
          accumulator -= FIXED_DELTA_MS;
        }
      }

      // ✅ ส่ง bodies กลับให้ useCameraEngine ทุก frame
      // แปลงจาก Matter px → world meters ก่อนส่ง
      if (loopPropsRef.current.onPhysicsChange) {
        const worldBodies = {};
        for (const [id, body] of bodyMap.current) {
          worldBodies[id] = {
            position: matterToWorld(body.position.x, body.position.y),
          };
        }
        loopPropsRef.current.onPhysicsChange(worldBodies, timeStateRef.current?.isPlaying);
      }

      // ── Draw ──────────────────────────────────────────────────────────
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const {
          size, offset, zoom,
          showCursorCoords, showResultantVector,
          gridSnapping, unitStep,
        } = loopPropsRef.current;

        ctx.clearRect(0, 0, size.w, size.h);

        const PPM_ZOOMED = PIXELS_PER_METER * zoom;
        const ox = size.w / 2 + offset.x;
        const oy = size.h / 2 + offset.y;

        // toScreen: world meters (Y-up) → screen pixels
        const toScreen = (wx, wy) => ({
          x: ox + wx * PPM_ZOOMED,
          y: oy - wy * PPM_ZOOMED,
        });

        // Draw Bodies
        Matter.Composite.allBodies(engine.world).forEach(body => {
          if (body.label === 'ground') return;

          const worldPos = matterToWorld(body.position.x, body.position.y);
          const radiusM = (body.circleRadius ?? (body.plugin?.size / 2)) / PIXELS_PER_METER;

          ctx.beginPath();
          if (body.label === 'circle') {
            const c = toScreen(worldPos.x, worldPos.y);
            ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED, 0, 2 * Math.PI);
          } else {
            const verts = body.vertices.map(v => matterToWorld(v.x, v.y));
            const first = toScreen(verts[0].x, verts[0].y);
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < verts.length; i++) {
              const p = toScreen(verts[i].x, verts[i].y);
              ctx.lineTo(p.x, p.y);
            }
          }
          ctx.closePath();
          ctx.fillStyle = (body.render?.fillStyle || '#999999') + 'CC';
          ctx.fill();
          ctx.strokeStyle = body.render?.fillStyle;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Focus Ring
          if (loopPropsRef.current.followedObjectId && bodyMap.current.get(loopPropsRef.current.followedObjectId) === body) {
            ctx.beginPath();
            if (body.label === 'circle') {
              const c = toScreen(worldPos.x, worldPos.y);
              ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 4, 0, 2 * Math.PI);
            } else {
              const verts = body.vertices.map(v => matterToWorld(v.x, v.y));
              const first = toScreen(verts[0].x, verts[0].y);
              ctx.moveTo(first.x, first.y);
              for (let i = 1; i < verts.length; i++) {
                const p = toScreen(verts[i].x, verts[i].y);
                ctx.lineTo(p.x, p.y);
              }
              ctx.closePath();
            }
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Selected Highlight (Cursor Tool)
          if (loopPropsRef.current.activeTool === 'cursor' && loopPropsRef.current.selectedObjectId && bodyMap.current.get(loopPropsRef.current.selectedObjectId) === body) {
            ctx.beginPath();
            if (body.label === 'circle') {
              const c = toScreen(worldPos.x, worldPos.y);
              ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 4, 0, 2 * Math.PI);
            } else {
              const verts = body.vertices.map(v => matterToWorld(v.x, v.y));
              const first = toScreen(verts[0].x, verts[0].y);
              ctx.moveTo(first.x, first.y);
              for (let i = 1; i < verts.length; i++) {
                const p = toScreen(verts[i].x, verts[i].y);
                ctx.lineTo(p.x, p.y);
              }
              ctx.closePath();
            }
            ctx.strokeStyle = '#4ADE80'; // Green highlight
            ctx.lineWidth = 3;
            ctx.stroke();
          }
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

        // Grid snap dot
        if (gridSnapping && mouseRef.current.x > -1000) {
          const us = (unitStep || 1) / 5;
          const wx = Math.round(((mouseRef.current.x - ox) / PPM_ZOOMED) / us) * us;
          const wy = Math.round(((oy - mouseRef.current.y) / PPM_ZOOMED) / us) * us;
          const s = toScreen(wx, wy);
          ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#9CA3AF'; ctx.fill();
        }

        // Cursor coords
        if (showCursorCoords && mouseRef.current.x > -1000) {
          const wx = (mouseRef.current.x - ox) / PPM_ZOOMED;
          const wy = (oy - mouseRef.current.y) / PPM_ZOOMED;
          const text = `${wx.toFixed(1)}m, ${wy.toFixed(1)}m`;
          ctx.font = '12px "Chakra Petch"';
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(mouseRef.current.x + 15, mouseRef.current.y + 15, ctx.measureText(text).width + 10, 20);
          ctx.fillStyle = '#fff';
          ctx.fillText(text, mouseRef.current.x + 20, mouseRef.current.y + 30);
        }
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

  // Sync simState → engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simState) return;

    engine.gravity.scale = 1;
    engine.gravity.x = 0;
    engine.gravity.y = computeGravityY(simState.gravity || 9.8);

    const activeIds = new Set(simState.objects?.filter(o => o.isSpawned).map(o => o.id) || []);
    for (const [id, b] of bodyMap.current.entries()) {
      if (!activeIds.has(id)) {
        Matter.Composite.remove(engine.world, b);
        bodyMap.current.delete(id);
      }
    }

    simState.objects?.forEach(obj => {
      if (!obj.isSpawned) return;

      let body = bodyMap.current.get(obj.id);

      if (!body) {
        const opts = {
          restitution: obj.values?.restitution || 0,
          friction: 0.0,
          frictionAir: 0.0,
          frictionStatic: 0.0,
        };

        const { x: px, y: py } = worldToMatter(obj.position?.x || 0, obj.position?.y || 10);
        const radiusPx = (obj.size || 1) * PIXELS_PER_METER / 2;

        if (obj.shape === 'circle') {
          body = Matter.Bodies.circle(px, py, radiusPx, opts);
        } else if (obj.shape === 'polygon-3') {
          body = Matter.Bodies.polygon(px, py, 3, radiusPx / (Math.sqrt(3) / 2), opts);
        } else {
          body = Matter.Bodies.rectangle(px, py, radiusPx * 2, radiusPx * 2, opts);
        }

        body.label = obj.shape;
        body.plugin = { size: obj.size || 1 };
        Matter.Composite.add(engine.world, body);
        bodyMap.current.set(obj.id, body);
      }

      body.render.fillStyle = obj.color;

      if (obj.values && !timeStateRef.current?.isPlaying) {
        if (obj.values.height !== undefined) {
          const { y: newY } = worldToMatter(
            matterToWorld(body.position.x, body.position.y).x,
            obj.values.height
          );
          Matter.Body.setPosition(body, { x: body.position.x, y: newY });
        }

        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) {
          vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0 });
        }

        let vxSum = 0, vySum = 0;
        for (const v of vels) {
          const angleRad = (v.angle * Math.PI) / 180;
          const scale = PIXELS_PER_METER / 60;
          vxSum += v.magnitude * scale * Math.cos(angleRad);
          vySum += v.magnitude * scale * Math.sin(angleRad);
        }
        Matter.Body.setVelocity(body, { x: vxSum, y: -vySum });
      }
    });
  }, [simState, simSyncToken]);

  return (
    <canvas
      ref={canvasRef}
      width={size.w}
      height={size.h}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
});

export default memo(MatterCanvas);