import { useState, useRef, useCallback, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import Matter from 'matter-js';
import ControlPanel from './ControlPanel';

/**
 * Attempt to find a "nice" grid spacing given a raw pixel spacing and zoom.
 * We want grid labels to be multiples of 1, 2, 5, 10, 20, 50 …
 */
function niceStep(rawStep) {
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / pow;
  if (frac <= 1) return pow;
  if (frac <= 2) return 2 * pow;
  if (frac <= 5) return 5 * pow;
  return 10 * pow;
}

function formatLabel(value) {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1e6) return value.toExponential(1);
  // Avoid floating point noise: round to 10 decimal places
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

// ────────────────────────────────────────────────────
//  Interactive Grid Component
// ────────────────────────────────────────────────────
function InteractiveGrid({ children }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Camera state  (offset = how many px the origin has been dragged from the center)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  // ── Resize observer ──────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Dragging handlers ─────────────────────────────
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return; // left-click only
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
  }, [offset]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    });
  }, []);

  const handlePointerUp = useCallback((e) => {
    dragging.current = false;
    e.currentTarget.style.cursor = 'grab';
  }, []);

  // ── Scroll-to-zoom ────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Mouse position relative to container center
    const mx = e.clientX - rect.left - size.w / 2;
    const my = e.clientY - rect.top - size.h / 2;

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 100);

    // Adjust offset so the point under the cursor stays fixed
    setOffset((prev) => ({
      x: mx - (mx - prev.x) * (newZoom / zoom),
      y: my - (my - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom, size]);

  // Attach wheel with { passive: false } so we can preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Compute grid parameters ──────────────────────
  const { w, h } = size;
  // Origin in screen pixels
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;

  // We want major grid lines roughly every ~80-120 px apart on screen.
  // 1 "unit" = (basePixelsPerUnit * zoom) screen pixels
  const basePixelsPerUnit = 50; // 1 unit = 50px at zoom=1
  const pxPerUnit = basePixelsPerUnit * zoom;

  // Choose a "nice" step so labels don't get cluttered
  const desiredPxGap = 80;
  const rawUnitStep = desiredPxGap / pxPerUnit;
  const unitStep = niceStep(rawUnitStep);
  const pxStep = unitStep * pxPerUnit; // actual px between major lines

  // Sub-grid: 5 subdivisions
  const subStep = pxStep / 5;

  // ── Generate grid lines & labels ─────────────────
  const lines = [];
  const labels = [];

  // Vertical lines (along X axis)
  {
    const startUnit = Math.floor((-ox) / pxStep) - 1;
    const endUnit = Math.ceil((w - ox) / pxStep) + 1;
    for (let i = startUnit; i <= endUnit; i++) {
      const xPx = ox + i * pxStep;
      // major line
      lines.push(
        <line key={`vM${i}`} x1={xPx} y1={0} x2={xPx} y2={h} stroke="#D5CBBD" strokeWidth={1} />
      );
      // sub-grid lines
      for (let s = 1; s < 5; s++) {
        const sx = xPx + s * subStep;
        lines.push(
          <line key={`vS${i}_${s}`} x1={sx} y1={0} x2={sx} y2={h} stroke="#EDE8E1" strokeWidth={0.5} />
        );
      }
      // label
      const unitVal = i * unitStep;
      if (Math.abs(unitVal) > 1e-10) {
        // Place label just below the X axis (or at bottom if axis is off-screen)
        const labelY = Math.min(Math.max(oy + 16, 16), h - 4);
        labels.push(
          <text
            key={`lX${i}`}
            x={xPx}
            y={labelY}
            textAnchor="middle"
            fill="#8C8278"
            fontSize={11}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ userSelect: 'none' }}
          >
            {formatLabel(unitVal)}
          </text>
        );
      }
    }
  }

  // Horizontal lines (along Y axis — math convention: up = positive)
  {
    const startUnit = Math.floor((-oy) / pxStep) - 1;
    const endUnit = Math.ceil((h - oy) / pxStep) + 1;
    for (let i = startUnit; i <= endUnit; i++) {
      const yPx = oy + i * pxStep;
      lines.push(
        <line key={`hM${i}`} x1={0} y1={yPx} x2={w} y2={yPx} stroke="#D5CBBD" strokeWidth={1} />
      );
      for (let s = 1; s < 5; s++) {
        const sy = yPx + s * subStep;
        lines.push(
          <line key={`hS${i}_${s}`} x1={0} y1={sy} x2={w} y2={sy} stroke="#EDE8E1" strokeWidth={0.5} />
        );
      }
      const unitVal = -i * unitStep; // invert because screen Y goes down
      if (Math.abs(unitVal) > 1e-10) {
        const labelX = Math.min(Math.max(ox + 6, 6), w - 30);
        labels.push(
          <text
            key={`lY${i}`}
            x={labelX}
            y={yPx + 4}
            textAnchor="start"
            fill="#8C8278"
            fontSize={11}
            fontFamily="Inter, system-ui, sans-serif"
            style={{ userSelect: 'none' }}
          >
            {formatLabel(unitVal)}
          </text>
        );
      }
    }
  }

  // Clamp axes into view
  const axisXY = Math.min(Math.max(oy, 0), h); // horizontal axis screen Y
  const axisYX = Math.min(Math.max(ox, 0), w); // vertical axis screen X

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: 'grab', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        width={w}
        height={h}
        className="absolute inset-0 z-0"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'hidden' }}
      >
        {/* Sub-grid + major grid lines */}
        {lines}

        {/* X axis (horizontal - ground) */}
        <line x1={0} y1={axisXY} x2={w} y2={axisXY} stroke="#9B8E7E" strokeWidth={4} />
        {/* Y axis (vertical) */}
        <line x1={axisYX} y1={0} x2={axisYX} y2={h} stroke="#9B8E7E" strokeWidth={1.8} />

        {/* Origin dot */}
        <circle cx={ox} cy={oy} r={3.5} fill="#9B8E7E" />

        {/* Tick marks on X axis */}
        {(() => {
          const ticks = [];
          const startUnit = Math.floor((-ox) / pxStep) - 1;
          const endUnit = Math.ceil((w - ox) / pxStep) + 1;
          for (let i = startUnit; i <= endUnit; i++) {
            if (Math.abs(i * unitStep) < 1e-10) continue;
            const xPx = ox + i * pxStep;
            ticks.push(
              <line key={`tX${i}`} x1={xPx} y1={axisXY - 5} x2={xPx} y2={axisXY + 5} stroke="#9B8E7E" strokeWidth={1.2} />
            );
          }
          return ticks;
        })()}

        {/* Tick marks on Y axis */}
        {(() => {
          const ticks = [];
          const startUnit = Math.floor((-oy) / pxStep) - 1;
          const endUnit = Math.ceil((h - oy) / pxStep) + 1;
          for (let i = startUnit; i <= endUnit; i++) {
            if (Math.abs(i * unitStep) < 1e-10) continue;
            const yPx = oy + i * pxStep;
            ticks.push(
              <line key={`tY${i}`} x1={axisYX - 5} y1={yPx} x2={axisYX + 5} y2={yPx} stroke="#9B8E7E" strokeWidth={1.2} />
            );
          }
          return ticks;
        })()}

        {/* Axis labels (numbers) */}
        {labels}
      </svg>
      {typeof children === 'function' ? children({ size, offset, zoom }) : children}
    </div>
  );
}

// ────────────────────────────────────────────────────
//  MatterCanvas - Render and update Matter.js
// ────────────────────────────────────────────────────
function MatterCanvas({ size, offset, zoom, simState }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map()); // Maps obj.id -> Matter.Body

  const { w, h } = size;
  const basePixelsPerUnit = 50; 
  const pxPerUnit = basePixelsPerUnit * zoom;
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;

  // 1. Initialize engine
  useEffect(() => {
    const engine = Matter.Engine.create();
    engineRef.current = engine;
    
    // Create an invisible static ground plane at y=0 extending downwards.
    // Center at y=-20, height 40, so the top edge is precisely at y=0.
    const ground = Matter.Bodies.rectangle(0, -20, 10000, 40, { 
      isStatic: true,
      label: 'ground',
      friction: 1,
    });
    Matter.Composite.add(engine.world, ground);

    let raf;
    let lastTime = performance.now();
    const loop = (now) => {
      // cap delta to avoid massive leaps on tab switch
      Matter.Engine.update(engine, Math.min(now - lastTime, 32)); 
      lastTime = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(raf);
      Matter.Engine.clear(engine);
    };
  }, []);

  // 2. Sync simState -> Engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simState) return;

    // Gravity: Matter.js defaults internal gravity.y = 1 (~Earth). 
    // We negate it so objects fall downwards in our mathematical grid (Y goes up, so negative Y falls down).
    engine.gravity.y = -(simState.gravity / 9.8); 
    
    // Only objects that are spawned exist in the engine
    const currentSpawnedIds = new Set(
      simState.objects.filter((o) => o.isSpawned).map((o) => o.id)
    );

    // Remove deleted or despawned objects
    for (const [id, body] of bodyMap.current.entries()) {
      if (!currentSpawnedIds.has(id)) {
        Matter.Composite.remove(engine.world, body);
        bodyMap.current.delete(id);
      }
    }

    // Add / Update spawned objects
    simState.objects.forEach(obj => {
      if (!obj.isSpawned) return;

      const r = 0.5; // base radius/half-size in world units
      let body = bodyMap.current.get(obj.id);
      
      // Recreate body if shape or size changes
      if (body && (body.label !== obj.shape || body.plugin?.size !== obj.size)) {
        Matter.Composite.remove(engine.world, body);
        body = null;
      }

      // Add new objects
      if (!body) {
        // start falling from height property if available, otherwise 10
        const startY = obj.values?.height !== undefined ? obj.values.height : 10;
        const s = obj.size !== undefined ? obj.size : 1; 

        let newBody;
        const opts = { restitution: 0.8, friction: 0.1 };
        switch(obj.shape) {
          case 'circle': 
            // s is radius
            newBody = Matter.Bodies.circle(0, startY, s, opts); 
            break;
          case 'polygon-3': 
            // matter.js polygon size is radius of bounding circle, a triangle of sides 's' roughly has circumradius s / Math.sqrt(3)
            newBody = Matter.Bodies.polygon(0, startY, 3, s / Math.sqrt(3), opts); 
            break;
          case 'rectangle': 
          default: 
            // rectangular sides equal to width s
            newBody = Matter.Bodies.rectangle(0, startY, s, s, opts); 
            break;
        }
        newBody.label = obj.shape;
        newBody.plugin = { size: s }; // remember size
        
        // Apply initial velocity upon spawn
        const u = obj.values?.velocity || 0;
        const theta = obj.values?.angle || 0;
        // Mathematic angle: 0 = +X, 90 = +Y (Up).
        // In Matter.js, -Y is UP. So vy is negative for going up.
        const vx = u * Math.cos(theta * Math.PI / 180);
        const vy = -u * Math.sin(theta * Math.PI / 180);
        Matter.Body.setVelocity(newBody, { x: vx, y: vy });

        Matter.Composite.add(engine.world, newBody);
        bodyMap.current.set(obj.id, newBody);
        body = newBody;
      }

      // Update properties
      body.render = body.render || {};
      body.render.fillStyle = obj.color;

      if (obj.values) {
         if (obj.values.mass !== undefined && Math.abs(body.mass - obj.values.mass) > 0.01) {
           Matter.Body.setMass(body, obj.values.mass);
         }
         if (obj.values.restitution !== undefined) {
           body.restitution = obj.values.restitution;
         }
      }
      // Increased from 0.02 to 0.05 to make air resistance more visibly obvious
      body.frictionAir = simState.airResistance ? 0.05 : 0;
    });

  }, [simState]);

  // 3. Render Canvas synced with camera
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const engine = engineRef.current;
      if (!engine) return;

      // Map local world coord to screen coord. World Y is UP, Screen Y is DOWN.
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
          
          // Draw a line to show rotation
          ctx.moveTo(center.x, center.y);
          // Note: In Matter.js angle is standard mathematics (0 = right, increasing clockwise natively, 
          // but we inverted Y earlier. The simplest way to show rotation reliably is to project 
          // the angle and draw to the edge. Since world Y is up, and our toScreen handles projection:
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
        ctx.fillStyle = color + 'CC'; // translucent 
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h, ox, oy, pxPerUnit]);

  return (
    <canvas 
      ref={canvasRef}
      width={w}
      height={h}
      className="absolute inset-0 pointer-events-none z-10"
    />
  );
}

// ────────────────────────────────────────────────────
//  PhysicsBoard (parent component)
// ────────────────────────────────────────────────────
export default function PhysicsBoard({ activeSim, isInteracting }) {
  const shouldHideLogo = isInteracting || activeSim !== null;
  const [simState, setSimState] = useState(null);

  return (
    <div className="flex-1 flex flex-col h-full w-full relative">
      {/* Landing Logo */}
      <AnimatePresence>
        {!shouldHideLogo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <h1 className="text-[80px] font-bold tracking-wide drop-shadow-sm">
              <span className="text-[#FFB65A]">Simu</span>
              <span className="text-[#C59355]">Learn</span>
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Simulation View */}
      {activeSim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col h-full w-full overflow-hidden"
        >
          {/* Prompt Title Header */}
          <div className="px-8 pt-6 pb-4 min-w-0">
            <h2 className="text-[22px] font-bold text-gray-900 truncate max-w-[60%]" title={`หัวข้อแบบจำลอง: ${activeSim.title}`}>
              หัวข้อแบบจำลอง: {activeSim.title}
            </h2>
          </div>

          {/* Panel + Grid row */}
          <div className="flex-1 flex min-h-0 px-6 pb-6 gap-4">
            {/* Control Panel */}
            <div className="rounded-2xl overflow-hidden border border-[#D5CBBD] shadow-sm">
              <ControlPanel 
                simulationType={activeSim.simulationType} 
                onUpdate={setSimState}
              />
            </div>

            {/* Grid Canvas Area */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-[#D5CBBD] bg-white relative shadow-sm">
              <InteractiveGrid>
                {({ size, offset, zoom }) => (
                  <MatterCanvas 
                    size={size} 
                    offset={offset} 
                    zoom={zoom} 
                    simState={simState} 
                  />
                )}
              </InteractiveGrid>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}