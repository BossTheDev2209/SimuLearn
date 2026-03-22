import React, { useState } from 'react';

export default function LoginForm({ onGoogleLogin, onEmailLogin, onEmailSignup, onGuestLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGuestClick = () => {
    if (onGuestLogin) {
      onGuestLogin();
    } else {
      localStorage.setItem("currentUserId", "guest_" + Date.now());
      localStorage.setItem("currentUserName", "Guest User");
      window.location.reload(); 
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      onEmailLogin(email, password);
    } else {
      onEmailSignup(email, password);
    }
  };

  return (
    <div className="w-full max-w-[420px] px-8 py-10 mt-8 lg:mt-0 relative z-30 pointer-events-auto">
      
      <div className="text-center lg:hidden mb-8">
        <h1 className="text-4xl font-bold text-theme-primary">
          <span className="text-[#FFB65A]">Simu</span><span className="text-[#C59355]">Learn</span>
        </h1>
      </div>

      <h2 className="text-2xl font-bold text-center mb-8 text-theme-primary">
        {isLogin ? 'ลงชื่อเข้าใช้' : 'สมัครสมาชิก'}
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="email" 
          placeholder="ที่อยู่อีเมล" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-theme-main border border-theme-border-hover text-theme-primary rounded-lg px-4 py-3 outline-none focus:border-[#FFB65A] focus:ring-1 focus:ring-[#FFB65A] transition-all placeholder-theme-muted"
          required
        />
        <input 
          type="password" 
          placeholder="รหัสผ่าน" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-theme-main border border-theme-border-hover text-theme-primary rounded-lg px-4 py-3 outline-none focus:border-[#FFB65A] focus:ring-1 focus:ring-[#FFB65A] transition-all placeholder-theme-muted"
          required
        />
        <button 
          type="submit"
          className="w-full bg-[#FFB65A] text-gray-900 font-bold rounded-lg px-4 py-3 hover:bg-[#F0A03E] transition-all shadow-sm mt-2"
        >
          {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
      </form>

      <p className="text-center text-sm text-theme-secondary mt-6">
        {isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'} {' '}
        <button 
          type="button"
          onClick={() => setIsLogin(prev => !prev)}
          className="text-[#FFB65A] hover:underline font-semibold p-1 cursor-pointer transition-all hover:opacity-80"
        >
          {isLogin ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </button>
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
  );
}
