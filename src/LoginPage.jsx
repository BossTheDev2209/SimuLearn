import React, { useState } from 'react';
import { auth, provider } from './firebase'; 
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      localStorage.setItem("currentUserId", result.user.uid);
      localStorage.setItem("currentUserName", result.user.displayName || result.user.email);
      window.location.href = "/"; 
    } catch (error) { console.error(error); }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) return alert("กรุณากรอกข้อมูลให้ครบครับ");
    try {
      let result;
      if (isSignUp) {
        result = await createUserWithEmailAndPassword(auth, email, password);
        alert("สมัครสมาชิกสำเร็จ!");
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
      localStorage.setItem("currentUserId", result.user.uid);
      localStorage.setItem("currentUserName", email.split('@')[0]);
      window.location.href = "/"; 
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("currentUserId", "guest_" + Date.now());
    localStorage.setItem("currentUserName", "Guest Mode");
    window.location.href = "/"; 
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#37353E] font-sans px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#FFB65A]">SimuLearn</h1>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-2 text-[#F9F8F6]">
          {isSignUp ? "สร้างบัญชีใหม่" : "ลงชื่อเข้าใช้"}
        </h2>
        
        {/* 💡 ปุ่ม Google พร้อม Logo ใหม่ */}
        <button 
          onClick={handleGoogleLogin} 
          className="flex items-center justify-center gap-3 w-full py-3 border border-[#715A5A] text-[#F9F8F6] rounded-full hover:bg-[#44444E] mb-6 transition duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="font-medium">ดำเนินการต่อด้วย Google</span>
        </button>

        <div className="flex items-center mb-6">
          <div className="flex-grow border-t border-[#715A5A]"></div>
          <span className="px-3 text-[#D3DAD9]">หรือ</span>
          <div className="flex-grow border-t border-[#715A5A]"></div>
        </div>

        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="ที่อยู่อีเมล" 
          className="w-full bg-[#44444E] text-[#F9F8F6] rounded-full px-5 py-3 mb-4 outline-none focus:ring-2 focus:ring-[#FFB65A]" 
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="รหัสผ่าน" 
          className="w-full bg-[#44444E] text-[#F9F8F6] rounded-full px-5 py-3 mb-6 outline-none focus:ring-2 focus:ring-[#FFB65A]" 
        />

        <button 
          onClick={handleEmailAuth} 
          className="w-full bg-[#FFB65A] text-[#37353E] font-bold py-3 rounded-full mb-4 shadow-lg hover:bg-[#C59355]"
        >
          {isSignUp ? "สมัครสมาชิกเลย" : "เข้าสู่ระบบ"}
        </button>

        <p className="text-center text-[#D3DAD9] mb-6">
          {isSignUp ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชี? "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#FFB65A] underline">
            {isSignUp ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </p>

        <div className="border-t border-[#44444E] w-full mb-6"></div>
        <button 
          onClick={handleGuestLogin} 
          className="w-full text-[#D3DAD9] hover:text-[#F9F8F6] text-sm transition"
        >
          ทดลองใช้งานแบบ Guest ➔
        </button>
      </div>
    </div>
  );
}
export default LoginPage;