import { useState, useRef, useCallback, useEffect } from 'react';
//อันนี้ผมให้ AI ทำ 100% เลยนะ
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import Matter from 'matter-js';
import ControlPanel from './ControlPanel';

/**
 * niceStep และ formatLabel (ร่างเดิมบอส 100%)
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
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

// ────────────────────────────────────────────────────
//  Interactive Grid Component (ร่างเดิมบอส 100%)
// ────────────────────────────────────────────────────
function InteractiveGrid({ children, initialCamera, onCameraChange }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  const [offset, setOffset] = useState(initialCamera?.offset || { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialCamera?.zoom || 1);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

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

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
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

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left - size.w / 2;
    const my = e.clientY - rect.top - size.h / 2;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(Math.max(zoom * factor, 0.05), 100);
    setOffset((prev) => ({
      x: mx - (mx - prev.x) * (newZoom / zoom),
      y: my - (my - prev.y) * (newZoom / zoom),
    }));
    setZoom(newZoom);
  }, [zoom, size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (onCameraChange) onCameraChange({ offset, zoom });
  }, [offset, zoom, onCameraChange]);

  const { w, h } = size;
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;
  const pxPerUnit = 50 * zoom;
  const pxStep = niceStep(80 / pxPerUnit) * pxPerUnit;
  const subStep = pxStep / 5;

  const lines = [];
  const labels = [];

  // Vertical lines
  {
    const startUnit = Math.floor((-ox) / pxStep) - 1;
    const endUnit = Math.ceil((w - ox) / pxStep) + 1;
    for (let i = startUnit; i <= endUnit; i++) {
      const xPx = ox + i * pxStep;
      lines.push(<line key={`vM${i}`} x1={xPx} y1={0} x2={xPx} y2={h} stroke="#50535C" strokeWidth={1} />);
      for (let s = 1; s < 5; s++) {
        const sx = xPx + s * subStep;
        lines.push(<line key={`vS${i}_${s}`} x1={sx} y1={0} x2={sx} y2={h} stroke="#3F4147" strokeWidth={0.5} />);
      }
      const unitVal = i * niceStep(80 / pxPerUnit);
      if (Math.abs(unitVal) > 1e-10) {
        labels.push(<text key={`lX${i}`} x={xPx} y={Math.min(Math.max(oy + 16, 16), h - 4)} textAnchor="middle" fill="#949BA4" fontSize={11}>{formatLabel(unitVal)}</text>);
      }
    }
  }

  // Horizontal lines
  {
    const startUnit = Math.floor((-oy) / pxStep) - 1;
    const endUnit = Math.ceil((h - oy) / pxStep) + 1;
    for (let i = startUnit; i <= endUnit; i++) {
      const yPx = oy + i * pxStep;
      lines.push(<line key={`hM${i}`} x1={0} y1={yPx} x2={w} y2={yPx} stroke="#50535C" strokeWidth={1} />);
      for (let s = 1; s < 5; s++) {
        const sy = yPx + s * subStep;
        lines.push(<line key={`hS${i}_${s}`} x1={0} y1={sy} x2={w} y2={sy} stroke="#3F4147" strokeWidth={0.5} />);
      }
      const unitVal = -i * niceStep(80 / pxPerUnit);
      if (Math.abs(unitVal) > 1e-10) {
        labels.push(<text key={`lY${i}`} x={Math.min(Math.max(ox + 6, 6), w - 30)} y={yPx + 4} textAnchor="start" fill="#949BA4" fontSize={11}>{formatLabel(unitVal)}</text>);
      }
    }
  }

  const axisXY = Math.min(Math.max(oy, 0), h);
  const axisYX = Math.min(Math.max(ox, 0), w);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ cursor: 'grab', touchAction: 'none' }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
      <svg width={w} height={h} className="absolute inset-0 z-0" style={{ overflow: 'hidden' }}>
        {lines}
        <line x1={0} y1={axisXY} x2={w} y2={axisXY} stroke="#B5BAC1" strokeWidth={4} />
        <line x1={axisYX} y1={0} x2={axisYX} y2={h} stroke="#B5BAC1" strokeWidth={1.8} />
        <circle cx={ox} cy={oy} r={3.5} fill="#B5BAC1" />
        {labels}
      </svg>
      {typeof children === 'function' ? children({ size, offset, zoom }) : children}
    </div>
  );
}

// ────────────────────────────────────────────────────
//  MatterCanvas - ฉบับร่างเดิมบอส + ซ่อมระบบพุ่งและเซฟ
// ────────────────────────────────────────────────────
function MatterCanvas({ size, offset, zoom, simState, initialPhysics, onPhysicsChange, isAutoRun }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const bodyMap = useRef(new Map());
  const restoredBodiesRef = useRef(new Set());
  const onPhysicsChangeRef = useRef(onPhysicsChange);

  // ⭐ ซ่อม 1: ดึง Ref ล่าสุดเสมอเพื่อลดลูปนรก
  useEffect(() => { onPhysicsChangeRef.current = onPhysicsChange; }, [onPhysicsChange]);

  const { w, h } = size;
  const pxPerUnit = 50 * zoom;
  const ox = w / 2 + offset.x;
  const oy = h / 2 + offset.y;

  useEffect(() => {
    const engine = Matter.Engine.create({ positionIterations: 16, velocityIterations: 12 });
    engineRef.current = engine;
    Matter.Composite.add(engine.world, Matter.Bodies.rectangle(0, -20, 10000, 40, { isStatic: true, label: 'ground', friction: 1 }));

    let raf;
    let lastSave = performance.now();
    let lastTime = performance.now();
    let accumulator = 0;
    const TIME_STEP = 1000 / 120;

    const loop = (now) => {
      let delta = now - lastTime;
      if (delta > 100) delta = 100;
      lastTime = now;
      accumulator += delta;
      while (accumulator >= TIME_STEP) {
        Matter.Engine.update(engine, TIME_STEP);
        accumulator -= TIME_STEP;
      }
      raf = requestAnimationFrame(loop);

      // ⭐ ซ่อม 2: ระบบเซฟDebounce (เซฟเฉพาะตอนหยุดนิ่ง)
      if (now - lastSave > 3000) {
        lastSave = now;
        if (onPhysicsChangeRef.current) {
          const bodiesData = {};
          let hasMovingBodies = false;
          for (const [id, body] of bodyMap.current.entries()) {
            bodiesData[id] = { position: { ...body.position }, angle: body.angle, velocity: { ...body.velocity }, angularVelocity: body.angularVelocity };
            if (body.speed > 0.1) hasMovingBodies = true;
          }
          onPhysicsChangeRef.current(bodiesData, hasMovingBodies);
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); Matter.Engine.clear(engine); };
  }, []);

  // Sync simState -> Engine (ร่างเดิมบอส + ระบบพุ่ง)
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !simState) return;

    engine.gravity.y = -(simState.gravity / 9.8);
    
    // ⭐ ระบบพุ่ง: ถ้าเป็น AutoRun ให้ถือว่า spawned ทันที
    const currentSpawnedIds = new Set(
      simState.objects.filter((o) => o.isSpawned || isAutoRun).map((o) => o.id)
    );

    for (const [id, body] of bodyMap.current.entries()) {
      if (!currentSpawnedIds.has(id)) {
        Matter.Composite.remove(engine.world, body);
        bodyMap.current.delete(id);
      }
    }

    simState.objects.forEach(obj => {
      if (!obj.isSpawned && !isAutoRun) return;

      let body = bodyMap.current.get(obj.id);
      if (!body) {
        const startY = obj.values?.height ?? 10;
        const s = obj.size ?? 1;
        let newBody;
        const opts = { restitution: 0.6, friction: 0.8 };
        if (obj.shape === 'circle') newBody = Matter.Bodies.circle(0, startY, s, opts);
        else if (obj.shape === 'polygon-3') newBody = Matter.Bodies.polygon(0, startY, 3, s / Math.sqrt(3), opts);
        else newBody = Matter.Bodies.rectangle(0, startY, s, s, opts);
        
        newBody.label = obj.shape;
        
        // เซ็ตความเร็ว (ร่างเดิมบอส)
        const u = obj.values?.velocity || 0;
        const theta = obj.values?.angle || 0;
        Matter.Body.setVelocity(newBody, { x: u * Math.cos(theta * Math.PI / 180), y: -u * Math.sin(theta * Math.PI / 180) });

        Matter.Composite.add(engine.world, newBody);
        bodyMap.current.set(obj.id, newBody);
        body = newBody;
      }
      body.render.fillStyle = obj.color;
      body.frictionAir = simState.airResistance ? 0.05 : 0;
    });
  }, [simState, isAutoRun]); // 👈 เพิ่ม isAutoRun เพื่อให้พุ่งทันที

  // Render Canvas (ร่างเดิมบอส 100%)
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const toScreen = (wx, wy) => ({ x: ox + wx * pxPerUnit, y: oy - wy * pxPerUnit });
      Matter.Composite.allBodies(engineRef.current.world).forEach(body => {
        if (body.label === 'ground') return;
        ctx.beginPath();
        if (body.label === 'circle') {
          const center = toScreen(body.position.x, body.position.y);
          ctx.arc(center.x, center.y, body.circleRadius * pxPerUnit, 0, 2 * Math.PI);
        } else {
          const first = toScreen(body.vertices[0].x, body.vertices[0].y);
          ctx.moveTo(first.x, first.y);
          body.vertices.forEach(v => { const p = toScreen(v.x, v.y); ctx.lineTo(p.x, p.y); });
        }
        ctx.closePath();
        ctx.fillStyle = (body.render.fillStyle || '#999999') + 'CC';
        ctx.fill();
        ctx.strokeStyle = body.render.fillStyle;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, h, ox, oy, pxPerUnit]);

  return <canvas ref={canvasRef} width={w} height={h} className="absolute inset-0 pointer-events-none z-10" />;
}

// ────────────────────────────────────────────────────
//  PhysicsBoard (ร่างเดิมบอส 100% + รับ prop ใหม่)
// ────────────────────────────────────────────────────
export default function PhysicsBoard({ activeSim, isInteracting, isAutoRun, onSaveControlState, onSavePhysicsState }) {
  const shouldHideLogo = isInteracting || activeSim !== null;
  const [simState, setSimState] = useState(null);

  const cameraRef = useRef(activeSim?.physicsState?.camera || { zoom: 1, offset: {x:0, y:0} });
  const bodiesRef = useRef(activeSim?.physicsState?.bodies || {});

  const handleControlUpdate = useCallback((state) => {
    setSimState(state);
    if (onSaveControlState) onSaveControlState(state);
  }, [onSaveControlState]);

  const handleCameraChange = useCallback((camera) => {
    cameraRef.current = camera;
    if (onSavePhysicsState) onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current });
  }, [onSavePhysicsState]);

  const handlePhysicsChange = useCallback((bodies, isMoving) => {
    bodiesRef.current = bodies;
    if (onSavePhysicsState) onSavePhysicsState({ camera: cameraRef.current, bodies: bodiesRef.current }, false, isMoving);
  }, [onSavePhysicsState]);

  return (
    <div className="flex-1 flex flex-col h-full w-full relative">
      <AnimatePresence>
        {!shouldHideLogo && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-[80px] font-bold tracking-wide">
              <span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span>
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {activeSim && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full w-full overflow-hidden">
          <div className="px-8 pt-6 pb-4">
            <h2 className="text-[22px] font-bold text-[#DBDEE1] bg-[#715A5A] inline-block px-4 py-2 rounded-lg truncate max-w-[60%]">
              หัวข้อแบบจำลอง: {activeSim.title}
            </h2>
          </div>
          <div className="flex-1 flex min-h-0 px-6 pb-6 gap-4">
            <div className="rounded-2xl overflow-hidden border border-[#1E1F22] shadow-sm">
              <ControlPanel key={activeSim.id} initialState={activeSim.controlState || activeSim.data} onUpdate={handleControlUpdate} />
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-[#1E1F22] bg-[#2B2D31] relative shadow-sm">
              <InteractiveGrid initialCamera={activeSim.physicsState?.camera} onCameraChange={handleCameraChange}>
                {({ size, offset, zoom }) => (
                  <MatterCanvas size={size} offset={offset} zoom={zoom} simState={simState} initialPhysics={activeSim.physicsState} onPhysicsChange={handlePhysicsChange} isAutoRun={isAutoRun} />
                )}
              </InteractiveGrid>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}