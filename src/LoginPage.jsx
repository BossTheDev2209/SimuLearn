import React, { useEffect, useState } from 'react';
import BackgroundAnimation from './components/Login/BackgroundAnimation';
import LoginForm from './components/Login/LoginForm';

export default function LoginPage({ onGoogleLogin, onEmailLogin, onEmailSignup, onGuestLogin }) {
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

  return (
    <div className="flex w-full h-screen font-chakra bg-theme-main text-theme-primary overflow-hidden relative">
      
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#F9F8F6] dark:bg-[#1E1F22] border-r border-theme-border flex-col items-center justify-center overflow-hidden z-0">
        
        <div className="absolute z-10 text-center pointer-events-none p-10">
          <h1 className="text-5xl font-bold text-theme-primary mb-4 drop-shadow-md">
            <span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span>
          </h1>
          <p className="text-xl text-theme-secondary font-medium">
            เปลี่ยนโจทย์ฟิสิกส์ที่ซับซ้อน ให้เป็นภาพจำลองที่คุณสัมผัสได้
          </p>
        </div>

        <BackgroundAnimation />
        
      </div>

      <div className="w-full lg:w-[45%] flex items-center justify-center bg-theme-panel relative z-20">
        
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

        <LoginForm 
          onGoogleLogin={onGoogleLogin}
          onEmailLogin={onEmailLogin}
          onEmailSignup={onEmailSignup}
          onGuestLogin={onGuestLogin}
        />
      </div>
    </div>
  );
}