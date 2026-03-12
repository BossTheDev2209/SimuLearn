import React, { useState, useEffect } from 'react';

// --- SVG Icons Components (ย่อขนาดให้พอดี Toolbar) ---
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const RestartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

export default function Timebar({
  isPlaying,
  timeScale,
  displayTime,
  onTogglePlay,
  onRestart,
  onTimeScaleChange,
  onSeek, // ฟังก์ชันใหม่สำหรับกรอเวลาตอนพิมพ์
}) {
  const [isTimebarOpen, setIsTimebarOpen] = useState(true);
  const [inputVal, setInputVal] = useState('');

  // อัปเดตช่อง Input เมื่อเวลาเปลี่ยน (ถ้าไม่ได้พิมพ์อยู่)
  useEffect(() => {
    if (document.activeElement?.id !== 'time-jump-input') {
      setInputVal((displayTime ?? 0).toFixed(1));
    }
  }, [displayTime]);

  // เมื่อพิมพ์ตัวเลข ให้ Simulation หยุดแล้วขยับไปเวลานั้นเลย (แต่ยังไม่ Play)
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    const numVal = parseFloat(val);
    if (!isNaN(numVal) && numVal >= 0) {
      onSeek(numVal);
    }
  };

  // เวลากดปุ่มลูกศรจิ๋วของเรา
  const handleStep = (amount) => {
    let current = parseFloat(inputVal);
    if (isNaN(current)) current = 0;
    const nextVal = Math.max(0, current + amount);
    setInputVal(nextVal.toFixed(1));
    onSeek(nextVal);
  };

  // เวลากด Enter ให้สลับ Play / Pause
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('time-jump-input').blur();
      onTogglePlay(); // กด Enter = Play/Pause
    }
  };

  return (
    <div className="relative font-['Chakra_Petch'] text-gray-800">
      <div className="flex flex-col gap-2 items-end">
        {/* Main Bar (ปรับขนาดให้เล็กลง h-9) */}
        <div className="flex items-center bg-[#e8e2d5] dark:bg-[#313338] rounded-xl p-1 shadow-sm border border-[#d6cfbe] dark:border-[#1E1F22] transition-all duration-300 h-10">
          
          <div className="flex items-center text-gray-700 dark:text-gray-300 bg-[#dcd6c7] dark:bg-[#3F4147] rounded-lg p-1.5 ml-0.5 shadow-inner">
            <ClockIcon />
          </div>
          
          {isTimebarOpen && (
            <>
              <button onClick={onRestart} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg mx-1.5 transition-colors shadow-sm" title="รีสตาร์ทเวลา">
                <RestartIcon />
              </button>
              
              <button onClick={onTogglePlay} className="hover:bg-[#dcd6c7] dark:hover:bg-[#3F4147] text-gray-800 dark:text-gray-300 p-1.5 rounded-lg mr-1.5 transition-colors" title="เล่น/หยุด (Enter)">
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              
              <div className="flex items-center bg-[#dcd6c7] dark:bg-[#3F4147] rounded-lg px-2.5 py-1 text-sm font-semibold gap-2 shadow-inner h-full">
                {[0.1, 0.5, 1, 2, 5, 10].map(speed => (
                  <button 
                    key={speed}
                    onClick={() => onTimeScaleChange(speed)}
                    className={`${timeScale === speed ? 'text-black dark:text-white scale-110 drop-shadow-md font-bold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} transition-all`}
                  >
                    x{speed}
                  </button>
                ))}
              </div>
            </>
          )}

          <button 
            onClick={() => setIsTimebarOpen(!isTimebarOpen)} 
            className="p-1.5 ml-1 hover:bg-[#dcd6c7] dark:hover:bg-[#3F4147] text-gray-800 dark:text-gray-300 rounded-lg transition-colors font-bold"
          >
            {isTimebarOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>
        </div>

        {/* Time Input Pill */}
        {isTimebarOpen && (
          <div className="flex items-center bg-[#e8e2d5] dark:bg-[#313338] text-gray-800 dark:text-gray-200 rounded-xl px-3 py-1 w-max shadow-sm border border-[#d6cfbe] dark:border-[#1E1F22] h-9">
            <span className="text-sm font-bold mr-1 opacity-70">t:</span>
            
            {/* ซ่อนลูกศรเดิมด้วย [appearance:textfield] และ pseudo elements */}
            <input 
              id="time-jump-input"
              type="number" 
              step="0.1"
              min="0"
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="bg-transparent w-12 text-sm font-bold outline-none text-gray-900 dark:text-white placeholder-gray-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm font-bold ml-1 opacity-70">s</span>

            {/* Custom Arrows ของเราเอง */}
            <div className="flex flex-col ml-2 bg-[#dcd6c7] dark:bg-[#3F4147] rounded-md overflow-hidden">
              <button onClick={() => handleStep(0.1)} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 text-gray-600 dark:text-gray-300">
                <ArrowUpIcon />
              </button>
              <button onClick={() => handleStep(-0.1)} className="hover:bg-[#c8c2b4] dark:hover:bg-[#4d5057] p-0.5 text-gray-600 dark:text-gray-300 border-t border-[#d6cfbe] dark:border-[#1E1F22]">
                <ArrowDownIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}