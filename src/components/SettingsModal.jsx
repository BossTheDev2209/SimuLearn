import { useEffect, useState, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import AppearanceSettings from './Settings/AppearanceSettings';

export default function SettingsModal({ isOpen, onClose, userPreferences, onSave }) {
  const [theme, setTheme] = useState(userPreferences?.theme || 'light');
  const [lang, setLang] = useState(userPreferences?.lang || 'th');
  const [searchQuery, setSearchQuery] = useState('');

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen && userPreferences) {
      setTheme(userPreferences.theme || 'light');
      setLang(userPreferences.lang || 'th');
    }
  }

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleClose]);

  const showTheme = searchQuery.trim() === '' || 'ธีมของเว็บไซต์ theme'.toLowerCase().includes(searchQuery.toLowerCase().trim());
  const showLang = searchQuery.trim() === '' || 'ภาษา language'.toLowerCase().includes(searchQuery.toLowerCase().trim());
  const showNoResults = !showTheme && !showLang;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-chakra">
          {/* blur bg */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()} 
            className="relative w-full max-w-[620px] bg-theme-sidebar p-4 rounded-[16px] shadow-2xl flex flex-col border border-theme-border"
          >
            {/* Floating Close Button */}
            <button
              onClick={handleClose}
              className="absolute -top-4 -right-4 w-10 h-10 bg-[#FFB65A] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1E1F22] hover:opacity-90 transition-all z-10 cursor-pointer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Inner Box */}
            <div className="bg-theme-panel rounded-xl flex flex-col p-6 min-h-[380px] shadow-sm">
              
              {/* Real Searchbar */}
              <div className="w-full bg-theme-main rounded-lg h-10 flex items-center px-3 mb-6 gap-2 border border-theme-border focus-within:border-[#C59355] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-theme-muted" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาการตั้งค่า..."
                  className="flex-1 bg-transparent border-none outline-none text-theme-primary placeholder-theme-muted text-[15px] font-medium tracking-wide w-full"
                />
              </div>

              {/* Title */}
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-theme-primary tracking-wide">การตั้งค่าโดยรวม</h2>
              </div>

              {/* Settings List */}
              <AppearanceSettings 
                theme={theme}
                setTheme={setTheme}
                lang={lang}
                setLang={setLang}
                showTheme={showTheme}
                showLang={showLang}
                showNoResults={showNoResults}
              />

              <div className="border-t-2 border-theme-border mt-6 mb-4"></div>
              
              <div className="flex-1"></div>

              {/* Save Button */}
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => onSave(theme, lang)}
                  className="bg-[#FFB65A] hover:bg-[#C59355] text-gray-900 text-sm font-bold tracking-wide px-6 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  บันทึก
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}