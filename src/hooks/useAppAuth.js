import { useCallback } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export function useAppAuth() {
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      localStorage.setItem("currentUserId", user.uid);
      localStorage.setItem("currentUserName", user.displayName || "User");
      window.location.reload(); 
    } catch (error) {
      console.error("Auth Error (Google):", error.code, error.message);
      alert("ล็อกอิน Google ไม่สำเร็จ: " + error.message);
    }
  };

  const handleEmailLogin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      localStorage.setItem("currentUserId", user.uid);
      localStorage.setItem("currentUserName", user.displayName || user.email.split('@')[0]);
      window.location.reload();
    } catch (error) {
      console.error("Auth Error (Login):", error.code, error.message);
      if (error.code === 'auth/operation-not-allowed') {
        alert("ระบบล็อกอินด้วยอีเมลยังไม่ถูกเปิดใช้งาน กรุณาตั้งค่าใน Firebase Console");
      } else if (error.code === 'auth/invalid-credential') {
        alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleEmailSignup = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      localStorage.setItem("currentUserId", user.uid);
      localStorage.setItem("currentUserName", user.email.split('@')[0]);
      window.location.reload();
    } catch (error) {
      console.error("Auth Error (Signup):", error.code, error.message);
      if (error.code === 'auth/operation-not-allowed') {
        alert("ระบบสมัครสมาชิกด้วยอีเมลยังไม่ถูกเปิดใช้งาน กรุณาตั้งค่าใน Firebase Console");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("อีเมลนี้ถูกใช้งานไปแล้ว");
      } else {
        alert("สมัครสมาชิกไม่สำเร็จ: " + error.message);
      }
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem("currentUserId", "guest_" + Date.now());
    localStorage.setItem("currentUserName", "Guest User");
    window.location.reload();
  };

  const handleLogout = useCallback(() => {
    localStorage.clear();
    window.location.href = "/";
  }, []);

  return {
    handleGoogleLogin,
    handleEmailLogin,
    handleEmailSignup,
    handleGuestLogin,
    handleLogout
  };
}
