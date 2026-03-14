import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, memo } from 'react';
import Matter from 'matter-js';
import { PIXELS_PER_METER, renderObjectVectors, drawArrow } from './VectorRenderer';
import { createPhysicsEngine, createGround, updatePhysics, worldToMatter, matterToWorld, computeGravityY } from './PhysicsEngine';

const pointToSegmentDistance = (px, py, x1, y1, x2, y2) => {
  const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
};

const MatterCanvas = forwardRef(({ 
  size, offset, zoom, unitStep, simState, onPhysicsChange, 
  activeTool, spawnConfig, gridSnapping, showCursorCoords, 
  showResultantVector, timeStateRef, setIsPlaying,
  followedObjectId, selectedObjectId, selectedObjectIds,
  controlPanelRef, 
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

  // ── Imperative API ───────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    resetSimulation: (pendingAction) => {
      pendingActionRef.current = pendingAction || null;
      setEngineResetToken(prev => prev + 1);
    },

    findVectorAt: (wx, wy) => {
      if (!simState?.objects) return null;
      const SCALE = 0.3;
      const getVisualLength = (mag) => Math.min(Math.max(mag * SCALE, 0.5), 8.0);
      for (const obj of simState.objects) {
        if (!obj.isSpawned) continue;
        const body = bodyMap.current.get(obj.id);
        if (!body) continue;
        const wp = matterToWorld(body.position.x, body.position.y);

        const vels = [...(obj.values?.velocities || [])];
        if (obj.values?.velocity) vels.push({ magnitude: obj.values.velocity, angle: obj.values.angle || 0, isLegacy: true });
        
        let vxSum = 0, vySum = 0;
        for (let i = 0; i < vels.length; i++) {
          const v = vels[i];
          const angleRad = (v.angle * Math.PI) / 180;
          const vLen = getVisualLength(v.magnitude);
          const hx = wp.x + vLen * Math.cos(angleRad);
          const hy = wp.y + vLen * Math.sin(angleRad);
          
          if (pointToSegmentDistance(wx, wy, wp.x, wp.y, hx, hy) < 0.3)
            return { objId: obj.id, type: 'velocity', index: v.isLegacy ? null : i, isLegacy: !!v.isLegacy, name: v.name, color: v.color || '#3B82F6', magnitude: v.magnitude, angle: v.angle };
          
          vxSum += v.magnitude * Math.cos(angleRad);
          vySum += v.magnitude * Math.sin(angleRad);
        }
        // Resultant Velocity head
        const vMag = Math.sqrt(vxSum**2 + vySum**2);
        if (vMag > 0.001) {
          const vAngle = Math.atan2(vySum, vxSum);
          const vLen = getVisualLength(vMag);
          const vhx = wp.x + vLen * Math.cos(vAngle);
          const vhy = wp.y + vLen * Math.sin(vAngle);
          if (pointToSegmentDistance(wx, wy, wp.x, wp.y, vhx, vhy) < 0.3)
            return { objId: obj.id, type: 'velocity', index: 'resultant' };
        }

        const forces = [...(obj.values?.forces || [])];
        if (obj.values?.force) forces.push({ magnitude: obj.values.force, angle: obj.values.forceAngle || 0, isLegacy: true });
        
        let fxSum = 0, fySum = 0;
        for (let i = 0; i < forces.length; i++) {
          const f = forces[i];
          const angleRad = (f.angle * Math.PI) / 180;
          const fLen = getVisualLength(f.magnitude);
          const hx = wp.x + fLen * Math.cos(angleRad);
          const hy = wp.y + fLen * Math.sin(angleRad);
          if (pointToSegmentDistance(wx, wy, wp.x, wp.y, hx, hy) < 0.3)
            return { objId: obj.id, type: 'force', index: f.isLegacy ? null : i, isLegacy: !!f.isLegacy, name: f.name, color: f.color || '#EF4444', magnitude: f.magnitude, angle: f.angle };
          fxSum += f.magnitude * Math.cos(angleRad);
          fySum += f.magnitude * Math.sin(angleRad);
        }
        // Resultant Force head (Red)
        const fMag = Math.sqrt(fxSum**2 + fySum**2);
        if (fMag > 0.001) {
          const fAngle = Math.atan2(fySum, fxSum);
          const fLen = getVisualLength(fMag);
          const fhx = wp.x + fLen * Math.cos(fAngle);
          const fhy = wp.y + fLen * Math.sin(fAngle);
          if (pointToSegmentDistance(wx, wy, wp.x, wp.y, fhx, fhy) < 0.3)
            return { objId: obj.id, type: 'force', index: 'resultant' };
        }
        // Net Force head (Purple)
        if (simState?.showResultantVector) {
          const weight = (obj.values?.mass ?? 1.0) * (simState.gravity || 9.8);
          const netX = fxSum;
          const netY = fySum - weight;
          const nMag = Math.sqrt(netX**2 + netY**2);
          if (nMag > 0.001) {
            const nAngle = Math.atan2(netY, netX);
            const nLen = getVisualLength(nMag);
            const nhx = wp.x + nLen * Math.cos(nAngle);
            const nhy = wp.y + nLen * Math.sin(nAngle);
            if (pointToSegmentDistance(wx, wy, wp.x, wp.y, nhx, nhy) < 0.3)
              return { objId: obj.id, type: 'force', index: 'netResultant' };
          }
        }
      }
      return null;
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
          const cp = { x: wp.x + radiusM * Math.cos(angle), y: wp.y + radiusM * Math.sin(angle) };
          const dC = Math.sqrt((wx - cp.x) ** 2 + (wy - cp.y) ** 2);
          if (dC < minDist) { minDist = dC; bestPoint = cp; }
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
      if (!engine) return false;
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground' && !b.isStatic);
      const { x: mx, y: my } = worldToMatter(rawX, rawY);
      let hit = Matter.Query.point(bodies, { x: mx, y: my });
      if (!hit.length) {
        const { x: mx2, y: my2 } = worldToMatter(wx, wy);
        hit = Matter.Query.point(bodies, { x: mx2, y: my2 });
      }
      if (hit.length) {
        const objId = [...bodyMap.current.entries()].find(([, b]) => b === hit[0])?.[0];
        if (objId) {
          drawingVectorRef.current = { type: tool, objId, startX: wx, startY: wy, currentX: wx, currentY: wy };
          return true;
        }
      }
      return false;
    },

    moveVectorDrag: (wx, wy) => {
      if (drawingVectorRef.current) { drawingVectorRef.current.currentX = wx; drawingVectorRef.current.currentY = wy; }
    },

    endVectorDrag: (wx, wy) => {
      const v = drawingVectorRef.current;
      if (v) { v.currentX = wx; v.currentY = wy; drawingVectorRef.current = null; return v; }
      return null;
    },

    findObjectAt: (wx, wy) => {
      const engine = engineRef.current;
      if (!engine) return null;
      const { x: mx, y: my } = worldToMatter(wx, wy);
      const hit = Matter.Query.point(
        Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground'),
        { x: mx, y: my }
      );
      return hit.length ? ([...bodyMap.current.entries()].find(([, b]) => b === hit[0])?.[0] || null) : null;
    },

    teleportObject: (id, wx, wy) => {
      const body = bodyMap.current.get(id);
      if (!body) return;
      
      // ✅ Anti-Noclip: ป้องกันการลากลงพื้น
      const minWorldY = (body.plugin?.size || 1) / 2;
      const clampedWy = Math.max(minWorldY, wy);

      const { x: mx, y: my } = worldToMatter(wx, clampedWy);
      Matter.Body.setPosition(body, { x: mx, y: my });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      if (controlPanelRef?.current?.updateObjectValues) {
        controlPanelRef.current.updateObjectValues(id, { height: clampedWy });
      }
    },

    findRotationHandle: (wx, wy) => {
      if (!selectedObjectId) return null;
      const body = bodyMap.current.get(selectedObjectId);
      if (!body || body.label === 'circle') return null;
      const wp = matterToWorld(body.position.x, body.position.y);
      const radiusM = (body.plugin?.size || 1) / 2;
      const handleDist = radiusM + 0.5;
      const hx = wp.x + handleDist * Math.cos(body.angle - Math.PI / 2);
      const hy = wp.y - handleDist * Math.sin(body.angle - Math.PI / 2);
      return Math.sqrt((wx - hx) ** 2 + (wy - hy) ** 2) < 0.4 ? selectedObjectId : null;
    },

    setObjectRotation: (id, angleRad) => {
      const body = bodyMap.current.get(id);
      if (!body) return;
      Matter.Body.setAngle(body, angleRad);
      if (controlPanelRef?.current?.updateObjectValues) {
        controlPanelRef.current.updateObjectValues(id, { angle: Math.round((angleRad * 180 / Math.PI) * 10) / 10 });
      }
    },
    checkCollision: (wx, wy, size, shape, excludeId = null) => {
      const engine = engineRef.current;
      if (!engine) return false;
      
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => {
        if (b.label === 'ground') return false;
        if (excludeId) {
          const bId = [...bodyMap.current.entries()].find(([, val]) => val === b)?.[0];
          return bId !== excludeId;
        }
        return true;
      });

      const { x: px, y: py } = worldToMatter(wx, wy);
      const radiusPx = (size * PIXELS_PER_METER) / 2;
      let tempBody;
      if (shape === 'circle') tempBody = Matter.Bodies.circle(px, py, radiusPx);
      else if (shape === 'polygon-3') tempBody = Matter.Bodies.polygon(px, py, 3, radiusPx / (Math.sqrt(3) / 2));
      else tempBody = Matter.Bodies.rectangle(px, py, radiusPx * 2, radiusPx * 2);
      
      const collisions = Matter.Query.collides(tempBody, bodies);
      return collisions.length > 0;
    },

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

    const loop = (now) => {
      const delta = Math.min(now - lastTime, 100);
      lastTime = now;

      if (timeStateRef.current?.isPlaying) {
        accumulator += delta * (timeStateRef.current.timeScale || 1);
        while (accumulator >= FIXED_DELTA_MS) {
          updatePhysics(engine, FIXED_DELTA_MS, loopPropsRef.current.simState, bodyMap.current, timeStateRef.current, setIsPlaying);
          timeStateRef.current.totalPhysicsTicks = (timeStateRef.current.totalPhysicsTicks || 0) + 1;
          timeStateRef.current.time = timeStateRef.current.totalPhysicsTicks * (FIXED_DELTA_MS / 1000);
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

      const { size, offset, zoom, showCursorCoords, showResultantVector, gridSnapping, unitStep, activeTool, spawnConfig, simState: loopSimState, selectedObjectId: loopSelectedId, selectedObjectIds: loopSelectedIds } = loopPropsRef.current;
      ctx.clearRect(0, 0, size.w, size.h);

      const PPM_ZOOMED = PIXELS_PER_METER * zoom;
      const ox = size.w / 2 + offset.x;
      const oy = size.h / 2 + offset.y;
      const toScreen = (wx, wy) => ({ x: ox + wx * PPM_ZOOMED, y: oy - wy * PPM_ZOOMED });

      // Draw Trajectories
      if (loopPropsRef.current.simState?.showTrajectory) {
        trajectoriesRef.current.forEach((traj) => {
          if (traj.points.length < 2) return;
          ctx.save();
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          for (let i = 0; i < traj.points.length - 1; i++) {
            const p1 = toScreen(traj.points[i].x, traj.points[i].y);
            const p2 = toScreen(traj.points[i+1].x, traj.points[i+1].y);
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = traj.color;
            ctx.globalAlpha = traj.points[i].alpha;
            ctx.stroke();
          }
          ctx.restore();
        });
      }

      // Draw Bodies
      Matter.Composite.allBodies(engine.world).forEach(body => {
        if (body.label === 'ground') return;
        const objId = [...bodyMap.current.entries()].find(([, b]) => b === body)?.[0];
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
          for (let i = 1; i < verts.length; i++) { const p = toScreen(verts[i].x, verts[i].y); ctx.lineTo(p.x, p.y); }
        }
        ctx.closePath();
        ctx.fillStyle = (body.render?.fillStyle || '#999999') + 'CC';
        ctx.fill();
        ctx.strokeStyle = body.render?.fillStyle;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Follow Ring
        if (loopPropsRef.current.followedObjectId === objId) {
          ctx.beginPath();
          if (body.label === 'circle') { const c = toScreen(worldPos.x, worldPos.y); ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 4, 0, 2 * Math.PI); }
          else { const verts = body.vertices.map(v => matterToWorld(v.x, v.y)); const f = toScreen(verts[0].x, verts[0].y); ctx.moveTo(f.x, f.y); for (let i = 1; i < verts.length; i++) { const p = toScreen(verts[i].x, verts[i].y); ctx.lineTo(p.x, p.y); } ctx.closePath(); }
          ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
        }

        // Selection Highlight
        const isSelected = loopSelectedId === objId || (loopSelectedIds || []).includes(objId);
        if (activeTool === 'cursor' && isSelected) {
          ctx.beginPath();
          if (body.label === 'circle') { const c = toScreen(worldPos.x, worldPos.y); ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 4, 0, 2 * Math.PI); }
          else { const verts = body.vertices.map(v => matterToWorld(v.x, v.y)); const f = toScreen(verts[0].x, verts[0].y); ctx.moveTo(f.x, f.y); for (let i = 1; i < verts.length; i++) { const p = toScreen(verts[i].x, verts[i].y); ctx.lineTo(p.x, p.y); } ctx.closePath(); }
          ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 3; ctx.stroke();
          
          if (body.label !== 'circle' && loopSelectedId === objId) {
            const rM = (body.plugin?.size || 1) / 2;
            const hd = rM + 0.5;
            const hWorld = { x: worldPos.x + hd * Math.cos(body.angle - Math.PI / 2), y: worldPos.y - hd * Math.sin(body.angle - Math.PI / 2) };
            const hScreen = toScreen(hWorld.x, hWorld.y);
            const cScreen = toScreen(worldPos.x, worldPos.y);
            ctx.beginPath(); ctx.moveTo(cScreen.x, cScreen.y); ctx.lineTo(hScreen.x, hScreen.y);
            ctx.strokeStyle = '#FFB65A'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(hScreen.x, hScreen.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFB65A'; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
          }
        }
      });

      // ✅ Erase Hover Highlight
      if (activeTool === 'erase' && mouseRef.current.x > -1000) {
        const wx = (mouseRef.current.x - ox) / PPM_ZOOMED;
        const wy = (oy - mouseRef.current.y) / PPM_ZOOMED;
        let hoverObjId = null;
        const { x: mx, y: my } = worldToMatter(wx, wy);
        const hit = Matter.Query.point(Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground'), { x: mx, y: my });
        if (hit.length) hoverObjId = [...bodyMap.current.entries()].find(([, b]) => b === hit[0])?.[0] || null;

        if (hoverObjId) {
          const body = bodyMap.current.get(hoverObjId);
          if (body) {
            const worldPos = matterToWorld(body.position.x, body.position.y);
            const radiusM = (body.circleRadius ?? (body.plugin?.size / 2)) / PIXELS_PER_METER;
            ctx.beginPath();
            if (body.label === 'circle') { const c = toScreen(worldPos.x, worldPos.y); ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 6, 0, 2 * Math.PI); }
            else { const verts = body.vertices.map(v => matterToWorld(v.x, v.y)); const f = toScreen(verts[0].x, verts[0].y); ctx.moveTo(f.x, f.y); for (let i = 1; i < verts.length; i++) { const p = toScreen(verts[i].x, verts[i].y); ctx.lineTo(p.x, p.y); } ctx.closePath(); }
            ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 4; ctx.stroke();
          }
        }
      }

      // Draw Vectors
      (loopSimState?.objects || []).forEach(obj => {
        if (obj.isSpawned && bodyMap.current.get(obj.id)) {
          renderObjectVectors(ctx, toScreen, obj, bodyMap.current.get(obj.id), showResultantVector, loopSimState.gravity);
        }
      });

      // Dragging Vector Preview
      if (drawingVectorRef.current) {
        const v = drawingVectorRef.current;
        drawArrow(ctx, toScreen, v.startX, v.startY, v.currentX, v.currentY, v.type === 'velocity' ? '#3B82F6' : '#EF4444');
      }

      // Grid snap dot
      if (gridSnapping && mouseRef.current.x > -1000) {
        const us = unitStep || 1;
        const wx = Math.round(((mouseRef.current.x - ox) / PPM_ZOOMED) / us) * us;
        const wy = Math.round(((oy - mouseRef.current.y) / PPM_ZOOMED) / us) * us;
        const s = toScreen(wx, wy);
        ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 2 * Math.PI); ctx.fillStyle = '#9CA3AF'; ctx.fill();
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

      // Add Tool Hologram Preview
      if (activeTool === 'add' && spawnConfig && mouseRef.current.x > -1000) {
        const us = unitStep || 1;
        const wx = Math.round(((mouseRef.current.x - ox) / PPM_ZOOMED) / us) * us;
        const wy = Math.round(((oy - mouseRef.current.y) / PPM_ZOOMED) / us) * us;
        const s = toScreen(wx, wy);
        const radiusPx = (spawnConfig.size * PIXELS_PER_METER * zoom) / 2;
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        if (spawnConfig.shape === 'circle') ctx.arc(s.x, s.y, radiusPx, 0, 2 * Math.PI);
        else if (spawnConfig.shape === 'polygon-3') { ctx.moveTo(s.x, s.y - radiusPx); ctx.lineTo(s.x + radiusPx, s.y + radiusPx); ctx.lineTo(s.x - radiusPx, s.y + radiusPx); }
        else ctx.rect(s.x - radiusPx, s.y - radiusPx, radiusPx * 2, radiusPx * 2);
        ctx.closePath();
        ctx.fillStyle = spawnConfig.color || '#FFB65A'; ctx.fill();
        ctx.strokeStyle = spawnConfig.color || '#FFB65A'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
      }

      // Vector hover highlight for cursor and erase tools
      if ((activeTool === 'erase' || activeTool === 'cursor') && mouseRef.current.x > -1000) {
        const SCALE = 0.3; // same as findVectorAt
        const getVisualLength = (mag) => Math.min(Math.max(mag * SCALE, 0.5), 8.0);
        const wx = (mouseRef.current.x - ox) / PPM_ZOOMED;
        const wy = (oy - mouseRef.current.y) / PPM_ZOOMED;

        for (const obj of (loopSimState?.objects || [])) {
          if (!obj.isSpawned) continue;
          const body = bodyMap.current.get(obj.id);
          if (!body) continue;
          const wp = matterToWorld(body.position.x, body.position.y);

          const allVecs = [
            ...(obj.values?.velocities || []).map(v => ({ ...v, vtype: 'velocity' })),
            ...(obj.values?.forces || []).map(f => ({ ...f, vtype: 'force' })),
          ];

          for (const v of allVecs) {
            const angleRad = (v.angle * Math.PI) / 180;
            const vLen = getVisualLength(v.magnitude);
            const hx = wp.x + vLen * Math.cos(angleRad);
            const hy = wp.y + vLen * Math.sin(angleRad);
            
            if (pointToSegmentDistance(wx, wy, wp.x, wp.y, hx, hy) < 0.3) {
              // Draw highlighted version
              const color = v.vtype === 'velocity' ? '#3B82F6' : '#EF4444';
              drawArrow(ctx, toScreen, wp.x, wp.y, hx, hy, color, 5, 1.0);
              break;
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); Matter.Engine.clear(engine); Matter.Composite.clear(engine.world, false); };
  }, [engineResetToken]);

  // ── Sync simState → engine ───────────────────────────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simState) return;

    engine.gravity.scale = 1;
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
          const scale = PIXELS_PER_METER / 60;
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