import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingSimulation({ onCancel, error }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const texts = ["กำลังสร้างแบบจำลอง...", "กำลังเตรียมอุปกรณ์ในแลบ...", "อีกนิดเดียวเท่านั้น..."];
  
  const variants = [
    { color: "#FF4747", type: "square", shape: "12px", path: "none" },
    { color: "#FFCC00", type: "circle", shape: "50%", path: "none" },
    { color: "#34C759", type: "triangle", shape: "0px", path: "polygon(50% 0%, 0% 100%, 100% 100%)" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => prev + 1);
    }, 1500);

    const timeout = setTimeout(() => {
      setIsStuck(true);
    }, 20000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (error) setIsStuck(true);
  }, [error]);

  const variantIndex = stepIndex % 3;
  const currentTextIndex = Math.min(Math.floor(stepIndex / 2), 2);
  const currentVariant = variants[variantIndex];

  if (isStuck || error) {
    return (
      <div className="fixed inset-0 bg-theme-main/95 backdrop-blur-md z-[100] flex items-center justify-center font-chakra p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-theme-sidebar p-10 rounded-[40px] shadow-2xl border border-theme-border flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          
          <h2 className="text-[28px] font-bold text-theme-primary mb-3 tracking-tight">
            {error ? "การเชื่อมต่อล้มเหลว" : "ใช้เวลานานผิดปกติ"}
          </h2>
          
          <p className="text-theme-muted mb-8 leading-relaxed">
            {error ? "ดูเหมือนเซิร์ฟเวอร์จะปิดตัวลงชั่วคราว (Error 521)" : "อาจเกิดจากความล่าช้าของอินเทอร์เน็ตหรือเซิร์ฟเวอร์"}
            <br/>กรุณาลองใหม่อีกครั้งครับ
          </p>

          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
            >
              ลองรีเฟรชหน้าเว็บ
            </button>
            <button 
              onClick={onCancel}
              className="px-6 py-2 rounded-xl bg-theme-hover text-theme-primary text-sm font-bold hover:opacity-80 border border-theme-border transition-all"
            >
               ยกเลิก
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-theme-main z-[100] flex flex-col items-center justify-center font-chakra">
      <div className="h-16 flex items-end justify-center mb-10">
        <AnimatePresence mode="wait">
          <motion.h2 
            key={currentTextIndex}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-[36px] font-bold text-theme-primary tracking-wide"
          >
            {texts[currentTextIndex]}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="flex gap-6 items-center">
        {[1, 0.5, 0.25].map((op, i) => (
          <motion.div 
            key={`shape-${variantIndex}-${i}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: op,
              x: 0,
              backgroundColor: currentVariant.color,
              borderRadius: currentVariant.shape,
              clipPath: currentVariant.path
            }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ 
              duration: 0.5,
              delay: i * 0.15,
              ease: "easeOut"
            }}
            className="w-16 h-16 shadow-sm shadow-black/50"
          />
        ))}
      </div>
    </div>
  );
}