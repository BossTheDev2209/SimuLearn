import Matter from 'matter-js';
import { PIXELS_PER_METER, renderObjectVectors, drawArrow } from '../../../../features/workspace/physics/VectorRenderer';
import { worldToMatter, matterToWorld } from '../../../../features/workspace/physics/PhysicsEngine';
import { formatScientific } from '../../../../utils/format';
import { pointToSegmentDistance } from './canvasMath';

export const renderCanvas = ({
  ctx, loopPropsRef, timeStateRef, accumulator, FIXED_DELTA_MS,
  engineRef, bodyMap, prevStates, currentStates, trajectoriesRef, mouseRef,
  drawingVectorRef
}) => {
  const { size, offset, zoom, showCursorCoords, showResultantVector, gridSnapping, unitStep, activeTool, spawnConfig, simState: loopSimState, selectedObjectId: loopSelectedId, selectedObjectIds: loopSelectedIds } = loopPropsRef.current;
  const engine = engineRef.current;
  
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

  // Interpolation alpha
  const alpha = timeStateRef.current?.isPlaying && (accumulator) ? (accumulator / FIXED_DELTA_MS) : 0;

  // Draw Bodies
  if (engine && engine.world) {
    Matter.Composite.allBodies(engine.world).forEach(body => {
      if (body.label === 'ground') return;
      const objId = [...bodyMap.current.entries()].find(([, b]) => b === body)?.[0];
      
      let pos = { x: body.position.x, y: body.position.y };
      let angle = body.angle;

      // Apply visual interpolation
      if (timeStateRef.current?.isPlaying && objId) {
        const prev = prevStates.get(objId);
        const curr = currentStates.get(objId);
        if (prev && curr) {
          pos.x = prev.x + (curr.x - prev.x) * alpha;
          pos.y = prev.y + (curr.y - prev.y) * alpha;
          angle = prev.angle + (curr.angle - prev.angle) * alpha;
        }
      }

      const worldPos = matterToWorld(pos.x, pos.y);
      const radiusM = (body.circleRadius ?? (body.plugin?.size / 2)) / PIXELS_PER_METER;

      ctx.save();
      ctx.beginPath();
      if (body.label === 'circle') {
        const c = toScreen(worldPos.x, worldPos.y);
        ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED, 0, 2 * Math.PI);
      } else {
        const c = toScreen(worldPos.x, worldPos.y);
        ctx.translate(c.x, c.y);
        ctx.rotate(angle);
        const sizePx = (body.plugin?.size || 1) * PPM_ZOOMED;
        if (body.label === 'polygon-3') {
           const r = radiusM * PPM_ZOOMED;
           ctx.moveTo(r * Math.cos(-Math.PI/2), r * Math.sin(-Math.PI/2));
           ctx.lineTo(r * Math.cos(Math.PI/6), r * Math.sin(Math.PI/6));
           ctx.lineTo(r * Math.cos(5*Math.PI/6), r * Math.sin(5*Math.PI/6));
        } else {
           ctx.rect(-sizePx/2, -sizePx/2, sizePx, sizePx);
        }
      }
      ctx.closePath();
      ctx.fillStyle = (body.render?.fillStyle || '#999999') + 'CC';
      ctx.fill();
      ctx.strokeStyle = body.render?.fillStyle || '#999999';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Canvas Object Name
      if (loopSimState?.showObjectNames && objId) {
        const obj = loopSimState.objects?.find(o => o.id === objId);
        if (obj) {
          const c = toScreen(worldPos.x, worldPos.y);
          const radiusPx = radiusM * PPM_ZOOMED;
          const labelY = c.y - radiusPx - 15;

          ctx.font = "bold 11px 'Chakra Petch', sans-serif";
          const text = obj.name;
          const metrics = ctx.measureText(text);
          const padding = 6;
          const rectW = metrics.width + padding * 2;
          const rectH = 18;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath(); ctx.roundRect(c.x - rectW / 2, labelY - rectH / 2, rectW, rectH, 4); ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1; ctx.stroke();

          ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(text, c.x, labelY);
        }
      }

      // Follow Ring
      if (loopPropsRef.current.followedObjectId === objId) {
        ctx.beginPath();
        if (body.label === 'circle') { const c = toScreen(worldPos.x, worldPos.y); ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 4, 0, 2 * Math.PI); }
        else { 
          const c = toScreen(worldPos.x, worldPos.y);
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(angle);
          const sizePx = (body.plugin?.size || 1) * PPM_ZOOMED + 8;
          ctx.rect(-sizePx/2, -sizePx/2, sizePx, sizePx); ctx.restore();
        }
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
      }

      // Selection Highlight
      const isSelected = loopSelectedId === objId || (loopSelectedIds || []).includes(objId);
      if (activeTool === 'cursor' && isSelected) {
        ctx.beginPath();
        if (body.label === 'circle') { const c = toScreen(worldPos.x, worldPos.y); ctx.arc(c.x, c.y, radiusM * PPM_ZOOMED + 4, 0, 2 * Math.PI); }
        else { 
          const c = toScreen(worldPos.x, worldPos.y);
          ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(angle);
          const sizePx = (body.plugin?.size || 1) * PPM_ZOOMED + 8;
          ctx.rect(-sizePx/2, -sizePx/2, sizePx, sizePx); ctx.restore();
        }
        ctx.strokeStyle = '#4ADE80'; ctx.lineWidth = 3; ctx.stroke();
      }
    });
  }

  // Erase Hover Highlight
  if (activeTool === 'erase' && mouseRef.current.x > -1000 && engine && engine.world) {
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
    const text = `${formatScientific(wx)}m, ${formatScientific(wy)}m`;
    
    ctx.save();
    ctx.font = '12px "Chakra Petch", sans-serif';
    const metrics = ctx.measureText(text);
    const padding = 6;
    const rectW = metrics.width + padding * 2;
    const rectH = 20;
    
    const rx = mouseRef.current.x + 15;
    const ry = mouseRef.current.y + 15;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(rx, ry, rectW, rectH, 4);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rx + padding, ry + rectH / 2);
    ctx.restore();
  }

  // Add Tool Hologram Preview
  if (activeTool === 'add' && spawnConfig && mouseRef.current.x > -1000) {
    const us = unitStep || 1;
    const wx = Math.round(((mouseRef.current.x - ox) / PPM_ZOOMED) / us) * us;
    let wy = Math.round(((oy - mouseRef.current.y) / PPM_ZOOMED) / us) * us;
    
    const minWy = (spawnConfig.size || 1) / 2;
    if (wy < minWy) wy = minWy;

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
          const color = v.vtype === 'velocity' ? '#3B82F6' : '#EF4444';
          drawArrow(ctx, toScreen, wp.x, wp.y, hx, hy, color, 5, 1.0);
          break;
        }
      }
    }
  }
};
