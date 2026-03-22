import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AppearanceSettings({ theme, setTheme, lang, setLang, showTheme, showLang, showNoResults }) {
  const [themeOpen, setThemeOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const themeRef = useRef(null);
  const langRef = useRef(null);

  // Close custom dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Theme Option */}
      {showTheme && (
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-theme-primary tracking-wide">ธีมของเว็บไซต์</span>
          <div className="relative" ref={themeRef}>
            <button 
              onClick={() => { setThemeOpen(!themeOpen); setLangOpen(false); }}
              className="flex items-center justify-between gap-3 bg-theme-main text-theme-primary border border-theme-border font-bold px-4 py-1.5 rounded-lg hover:bg-theme-hover transition-colors text-sm min-w-[100px] cursor-pointer"
            >
              <span>{theme === 'system' ? 'ระบบ' : theme === 'light' ? 'สว่าง' : 'มืด'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Custom Theme Dropdown */}
            <AnimatePresence>
              {themeOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-[140px] bg-theme-panel border border-theme-border rounded-[16px] shadow-lg overflow-hidden z-50 py-2"
                >
                  {[
                    { id: 'system', label: 'ระบบ' },
                    { id: 'dark', label: 'มืด' },
                    { id: 'light', label: 'สว่าง' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setTheme(option.id); setThemeOpen(false); }}
                      className={`mx-1 w-[calc(100%-8px)] text-left px-3 py-2 text-sm font-semibold flex items-center justify-between rounded-lg hover:bg-theme-hover transition-colors cursor-pointer ${theme === option.id ? 'bg-[#FFB65A] text-gray-900' : 'text-theme-primary'}`}
                    >
                      <span>{option.label}</span>
                      {theme === option.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Language Option */}
      {showLang && (
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-theme-primary tracking-wide">ภาษา</span>
          <div className="relative" ref={langRef}>
            <button 
              onClick={() => { setLangOpen(!langOpen); setThemeOpen(false); }}
              className="flex items-center justify-between gap-3 bg-theme-main text-theme-primary border border-theme-border font-bold px-4 py-1.5 rounded-lg hover:bg-theme-hover transition-colors text-sm min-w-[100px] cursor-pointer"
            >
              <span>{lang === 'th' ? 'ไทย' : 'English'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Custom Language Dropdown */}
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-[140px] bg-theme-panel border border-theme-border rounded-[16px] shadow-lg overflow-hidden z-50 py-2"
                >
                  {[
                    { id: 'th', label: 'ไทย' },
                    { id: 'en', label: 'English' }
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setLang(option.id); setLangOpen(false); }}
                      className={`mx-1 w-[calc(100%-8px)] text-left px-3 py-2 text-sm font-semibold flex items-center justify-between rounded-lg hover:bg-theme-hover transition-colors cursor-pointer ${lang === option.id ? 'bg-[#FFB65A] text-gray-900' : 'text-theme-primary'}`}
                    >
                      <span>{option.label}</span>
                      {lang === option.id && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {showNoResults && (
        <div className="flex flex-col items-center justify-center py-6 px-6 opacity-60">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-theme-muted mb-3">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <p className="text-[15px] font-bold text-theme-muted">ไม่พบการตั้งค่าที่ค้นหา</p>
        </div>
      )}
    </div>
  );
}
