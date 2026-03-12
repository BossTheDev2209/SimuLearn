import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

export default function LoginPage({ onGoogleLogin, onEmailLogin, onGuestLogin }) {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const runnerRef = useRef(null);

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') return true;
    if (savedTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'system';

    const applyTheme = (dark) => {
      if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setIsDark(dark);
    };

    if (savedTheme === 'system') {
      const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(systemQuery.matches); 

      const handleSystemChange = (e) => applyTheme(e.matches);
      systemQuery.addEventListener('change', handleSystemChange);
      return () => systemQuery.removeEventListener('change', handleSystemChange);
    } else {
      applyTheme(savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newIsDark = !isDark;
    
    if (newIsDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    setIsDark(newIsDark);
    window.dispatchEvent(new Event('storage'));
  };

  const handleGuestClick = () => {
    if (onGuestLogin) {
      onGuestLogin();
    } else {
      localStorage.setItem("currentUserId", "guest_" + Date.now());
      localStorage.setItem("currentUserName", "Guest User");
      window.location.reload(); 
    }
  };

  useEffect(() => {
    if (!sceneRef.current) return;

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

  return (
    <div className="flex w-full h-screen font-chakra bg-theme-main text-theme-primary overflow-hidden">
      
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#F9F8F6] dark:bg-[#1E1F22] border-r border-theme-border flex-col items-center justify-center overflow-hidden">
        
        <div className="absolute z-10 text-center pointer-events-none p-10">
          <h1 className="text-5xl font-bold text-theme-primary mb-4 drop-shadow-md">
            <span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span>
          </h1>
          <p className="text-xl text-theme-secondary font-medium">
            เปลี่ยนโจทย์ฟิสิกส์ที่ซับซ้อน ให้เป็นภาพจำลองที่คุณสัมผัสได้
          </p>
        </div>

        <div ref={sceneRef} className="absolute inset-0 z-0"></div>
        
      </div>

      <div className="w-full lg:w-[45%] flex items-center justify-center bg-theme-panel relative z-10">
        
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-theme-main border border-theme-border text-theme-secondary hover:text-[#FFB65A] hover:border-[#FFB65A] hover:scale-110 transition-all shadow-sm z-50"
          title={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2"/>
              <path d="M12 20v2"/>
              <path d="m4.93 4.93 1.41 1.41"/>
              <path d="m17.66 17.66 1.41 1.41"/>
              <path d="M2 12h2"/>
              <path d="M20 12h2"/>
              <path d="m6.34 17.66-1.41 1.41"/>
              <path d="m19.07 4.93-1.41 1.41"/>
            </svg>
          )}
        </button>

        <div className="w-full max-w-[420px] px-8 py-10 mt-8 lg:mt-0">
          
          <div className="text-center lg:hidden mb-8">
            <h1 className="text-4xl font-bold text-theme-primary">
              <span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-center mb-8 text-theme-primary">
            ลงชื่อเข้าใช้
          </h2>

          <button 
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#2B2D31] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-[#1E1F22] rounded-lg px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#3F4147] transition-all font-semibold shadow-sm mb-6"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            ดำเนินการต่อด้วย Google
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-theme-border"></div>
            <span className="px-4 text-sm text-theme-muted font-medium bg-theme-panel">หรือ</span>
            <div className="flex-1 border-t border-theme-border"></div>
          </div>

          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="ที่อยู่อีเมล" 
              className="w-full bg-theme-main border border-theme-border-hover text-theme-primary rounded-lg px-4 py-3 outline-none focus:border-[#FFB65A] focus:ring-1 focus:ring-[#FFB65A] transition-all placeholder-theme-muted"
            />
            <input 
              type="password" 
              placeholder="รหัสผ่าน" 
              className="w-full bg-theme-main border border-theme-border-hover text-theme-primary rounded-lg px-4 py-3 outline-none focus:border-[#FFB65A] focus:ring-1 focus:ring-[#FFB65A] transition-all placeholder-theme-muted"
            />
            <button 
              onClick={onEmailLogin}
              className="w-full bg-[#FFB65A] text-gray-900 font-bold rounded-lg px-4 py-3 hover:bg-[#F0A03E] transition-all shadow-sm mt-2"
            >
              เข้าสู่ระบบ
            </button>
          </div>

          <p className="text-center text-sm text-theme-secondary mt-6">
            ยังไม่มีบัญชี? <a href="#" className="text-[#FFB65A] hover:underline font-semibold">สมัครสมาชิก</a>
          </p>

          <div className="mt-10 pt-6 border-t border-theme-border text-center">
            <button 
              onClick={handleGuestClick}
              className="text-sm font-semibold text-theme-muted hover:text-theme-primary transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              ทดลองใช้งานแบบ Guest 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}