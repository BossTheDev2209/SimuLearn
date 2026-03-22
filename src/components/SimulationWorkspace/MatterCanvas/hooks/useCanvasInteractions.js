import Matter from 'matter-js';
import { PIXELS_PER_METER } from '../../../../features/workspace/physics/VectorRenderer';
import { worldToMatter, matterToWorld } from '../../../../features/workspace/physics/PhysicsEngine';
import { pointToSegmentDistance } from '../utils/canvasMath';

export const useCanvasInteractions = ({
  simState,
  engineRef,
  bodyMap,
  drawingVectorRef,
  controlPanelRef,
  selectedObjectId
}) => {
  const findVectorAt = (wx, wy) => {
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
      
      const fMag = Math.sqrt(fxSum**2 + fySum**2);
      if (fMag > 0.001) {
        const fAngle = Math.atan2(fySum, fxSum);
        const fLen = getVisualLength(fMag);
        const fhx = wp.x + fLen * Math.cos(fAngle);
        const fhy = wp.y + fLen * Math.sin(fAngle);
        if (pointToSegmentDistance(wx, wy, wp.x, wp.y, fhx, fhy) < 0.3)
          return { objId: obj.id, type: 'force', index: 'resultant' };
      }
      
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
  };

  const findSnapPoint = (wx, wy) => {
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
  };

  const startVectorDrag = (wx, wy, tool, rawX, rawY) => {
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
  };

  const moveVectorDrag = (wx, wy) => {
    if (drawingVectorRef.current) { 
        drawingVectorRef.current.currentX = wx; 
        drawingVectorRef.current.currentY = wy; 
    }
  };

  const endVectorDrag = (wx, wy) => {
    const v = drawingVectorRef.current;
    if (v) { 
        v.currentX = wx; 
        v.currentY = wy; 
        drawingVectorRef.current = null; 
        return v; 
    }
    return null;
  };

  const findObjectAt = (wx, wy) => {
    const engine = engineRef.current;
    if (!engine) return null;
    const { x: mx, y: my } = worldToMatter(wx, wy);
    const hit = Matter.Query.point(
      Matter.Composite.allBodies(engine.world).filter(b => b.label !== 'ground'),
      { x: mx, y: my }
    );
    return hit.length ? ([...bodyMap.current.entries()].find(([, b]) => b === hit[0])?.[0] || null) : null;
  };

  const teleportObject = (id, wx, wy) => {
    const body = bodyMap.current.get(id);
    if (!body) return;
    
    const minWorldY = (body.plugin?.size || 1) / 2;
    const clampedWy = Math.max(minWorldY, wy);

    const { x: mx, y: my } = worldToMatter(wx, clampedWy);
    Matter.Body.setPosition(body, { x: mx, y: my });
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    if (controlPanelRef?.current?.updateObjectValues) {
      controlPanelRef.current.updateObjectValues(id, { height: clampedWy });
    }
  };

  const findRotationHandle = (wx, wy) => {
    if (!selectedObjectId) return null;
    const body = bodyMap.current.get(selectedObjectId);
    if (!body || body.label === 'circle') return null;
    const wp = matterToWorld(body.position.x, body.position.y);
    const radiusM = (body.plugin?.size || 1) / 2;
    const handleDist = radiusM + 0.5;
    const hx = wp.x + handleDist * Math.cos(body.angle - Math.PI / 2);
    const hy = wp.y - handleDist * Math.sin(body.angle - Math.PI / 2);
    return Math.sqrt((wx - hx) ** 2 + (wy - hy) ** 2) < 0.4 ? selectedObjectId : null;
  };

  const setObjectRotation = (id, angleRad) => {
    const body = bodyMap.current.get(id);
    if (!body) return;
    Matter.Body.setAngle(body, angleRad);
    if (controlPanelRef?.current?.updateObjectValues) {
      controlPanelRef.current.updateObjectValues(id, { angle: Math.round((angleRad * 180 / Math.PI) * 10) / 10 });
    }
  };

  const checkCollision = (wx, wy, size, shape, excludeId = null) => {
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
  };

  return {
    findVectorAt,
    findSnapPoint,
    startVectorDrag,
    moveVectorDrag,
    endVectorDrag,
    findObjectAt,
    teleportObject,
    findRotationHandle,
    setObjectRotation,
    checkCollision
  };
};
