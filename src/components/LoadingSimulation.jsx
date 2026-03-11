import React, { useEffect, useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingSimulation() {
  const [stepIndex, setStepIndex] = useState(0);
  const texts = ["กำลังสร้างแบบจำลอง...", "กำลังเตรียมอุปกรณ์ในแลบ...", "อีกนิดเดียวเท่านั้น..."];
  
  const variants = [
    { color: "#FF4747", type: "square", shape: "12px", path: "none" },
    { color: "#FFCC00", type: "circle", shape: "50%", path: "none" },
    { color: "#34C759", type: "triangle", shape: "0px", path: "polygon(50% 0%, 0% 100%, 100% 100%)" }
  ];

  useEffect(() => {
    // Loop stepIndex from 0 up to a large number. 
    // We update every 1500ms so a complete variant cycle (3 boxes sliding) feels right. 
    // The text will slowly progress through the 3 phrases.
    const interval = setInterval(() => {
      setStepIndex((prev) => prev + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Map the continuously incrementing stepIndex to our arrays
  const variantIndex = stepIndex % 3;
  // Make the text stay on each phrase for 2 ticks (3 seconds) then advance, clamping at the last item (2)
  const currentTextIndex = Math.min(Math.floor(stepIndex / 2), 2);
  const currentVariant = variants[variantIndex];

  return (
    <div className="fixed inset-0 bg-[#FAF9F6] z-[100] flex flex-col items-center justify-center font-chakra pointer-events-none">
      {/* ส่วนข้อความ: Fade เลื่อนลงมาจากด้านบน แล้วออกด้านล่าง */}
      <div className="h-16 flex items-end justify-center mb-10">
        <AnimatePresence mode="wait">
          <motion.h2 
            key={currentTextIndex}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-[36px] font-bold text-[#CDBEA9] tracking-wide"
          >
            {texts[currentTextIndex]}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="flex gap-6 items-center">
        {/* กล่อง 3 อัน เลื่อนพร้อมๆกัน ความทึบลดหลั่นขั้นละ 2 เท่า */}
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
              delay: i * 0.15, // Delay ให้กล่องตามมาเป็นจังหวะ
              ease: "easeOut"
            }}
            className="w-16 h-16 shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}