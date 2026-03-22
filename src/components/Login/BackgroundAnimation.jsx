import React, { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export default function BackgroundAnimation() {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);

  useEffect(() => {
    if (!sceneRef.current) return;
    
    const isVisible = window.getComputedStyle(sceneRef.current.parentElement).display !== 'none';
    if (!isVisible) return;

    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          MouseConstraint = Matter.MouseConstraint,
          Mouse = Matter.Mouse,
          Composite = Matter.Composite,
          Bodies = Matter.Bodies;

    const engine = Engine.create();
    engineRef.current = engine;

    const width = sceneRef.current.clientWidth || (window.innerWidth * 0.55);
    const height = sceneRef.current.clientHeight || window.innerHeight;

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width,
        height,
        background: 'transparent',
        wireframes: false,
        pixelRatio: window.devicePixelRatio 
      }
    });
    renderRef.current = render;

    const wallOptions = { isStatic: true, render: { fillStyle: '#DBDEE1' } };
    const ground = Bodies.rectangle(width / 2, height + 25, width + 100, 50, wallOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height + 100, wallOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height + 100, wallOptions);

    const shapes = [];
    const colors = ['#FFB65A', '#22C55E', '#3B82F6', '#EF4444', '#A855F7'];
    
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * (width - 100) + 50;
      const y = -(Math.random() * 800) - 50; 
      const size = Math.random() * 30 + 20;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const isCircle = Math.random() > 0.5;
      if (isCircle) {
        shapes.push(Bodies.circle(x, y, size / 2, { 
          restitution: 0.9, 
          render: { fillStyle: color } 
        }));
      } else {
        shapes.push(Bodies.rectangle(x, y, size, size, { 
          restitution: 0.6, 
          render: { fillStyle: color } 
        }));
      }
    }

    Composite.add(engine.world, [ground, leftWall, rightWall, ...shapes]);

    const mouse = Mouse.create(render.canvas);
    mouse.pixelRatio = window.devicePixelRatio; 

    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    });
    Composite.add(engine.world, mouseConstraint);
    render.mouse = mouse; 

    Render.run(render);
    const runner = Runner.create();
    runnerRef.current = runner;
    Runner.run(runner, engine);

    const handleResize = () => {
      if (!sceneRef.current || !renderRef.current) return;
      render.canvas.width = sceneRef.current.clientWidth;
      render.canvas.height = sceneRef.current.clientHeight;
      Matter.Body.setPosition(ground, { x: sceneRef.current.clientWidth / 2, y: sceneRef.current.clientHeight + 25 });
      Matter.Body.setPosition(rightWall, { x: sceneRef.current.clientWidth + 25, y: sceneRef.current.clientHeight / 2 });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      Render.stop(renderRef.current);
      Runner.stop(runnerRef.current);
      Engine.clear(engineRef.current);
      renderRef.current.canvas.remove();
      renderRef.current.canvas = null;
      renderRef.current.context = null;
      renderRef.current.textures = {};
    };
  }, []);

  return <div ref={sceneRef} className="absolute inset-0 z-0"></div>;
}
