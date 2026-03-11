import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettingsModal({ isOpen, onClose, userPreferences, onSave }) {
  const [theme, setTheme] = useState(userPreferences?.theme || 'light');
  const [lang, setLang] = useState(userPreferences?.lang || 'th');
  
  const [themeOpen, setThemeOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const themeRef = useRef(null);
  const langRef = useRef(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setThemeOpen(false);
      setLangOpen(false);
    } else if (userPreferences) {
      // Sync state when opening
      setTheme(userPreferences.theme || 'light');
      setLang(userPreferences.lang || 'th');
    }
  }, [isOpen, userPreferences]);

  // Close custom dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setThemeOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

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
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()} 
            className="relative w-full max-w-[620px] bg-[#D9CFC7] p-4 rounded-[16px] shadow-2xl flex flex-col"
          >
            {/* Floating Close Button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 w-10 h-10 bg-[#EF4444] text-black rounded-full flex items-center justify-center shadow-lg border-2 border-black hover:bg-red-600 transition-all z-10 cursor-pointer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Inner Box */}
            <div className="bg-[#EFE9E3] rounded-xl flex flex-col p-6 min-h-[380px] shadow-sm">
              
              {/* Real Searchbar */}
              <div className="w-full bg-[#C9B59C] rounded-lg h-10 flex items-center px-3 mb-6 gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#37353E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาการตั้งค่า..."
                  className="flex-1 bg-transparent border-none outline-none text-[#37353E] placeholder-[#37353E]/70 text-[15px] font-medium tracking-wide w-full"
                />
              </div>

              {/* Title */}
              <div className="mb-6">
                <h2 className="text-[22px] font-bold text-[#37353E] tracking-wide">การตั้งค่าโดยรวม</h2>
              </div>

              {/* Settings List */}
              <div className="flex flex-col gap-5">
                
                {/* Theme Option */}
                {showTheme && (
                  <div className="flex items-center justify-between">
                    <span className="text-[17px] font-semibold text-[#37353E] tracking-wide">ธีมของเว็บไซต์</span>
                    <div className="relative" ref={themeRef}>
                      <button 
                        onClick={() => { setThemeOpen(!themeOpen); setLangOpen(false); }}
                        className="flex items-center justify-between gap-3 bg-[#D9CFC7] text-[#37353E] font-bold px-4 py-1.5 rounded-lg hover:bg-[#C9B59C] transition-colors text-sm min-w-[100px] cursor-pointer"
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
                            className="absolute right-0 top-full mt-2 w-[140px] bg-[#EFE9E3] border border-[#D9CFC7] rounded-[16px] shadow-lg overflow-hidden z-50 py-2"
                          >
                            {[
                              { id: 'system', label: 'ระบบ' },
                              { id: 'dark', label: 'มืด' },
                              { id: 'light', label: 'สว่าง' }
                            ].map(option => (
                              <button
                                key={option.id}
                                onClick={() => { setTheme(option.id); setThemeOpen(false); }}
                                className={`mx-1 w-[calc(100%-8px)] text-left px-3 py-2 text-sm font-semibold flex items-center justify-between rounded-lg hover:bg-[#D9CFC7] transition-colors cursor-pointer ${theme === option.id ? 'text-[#37353E] bg-[#D9CFC7]/50' : 'text-[#44444E]'}`}
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
                    <span className="text-[17px] font-semibold text-[#37353E] tracking-wide">ภาษา</span>
                    <div className="relative" ref={langRef}>
                      <button 
                        onClick={() => { setLangOpen(!langOpen); setThemeOpen(false); }}
                        className="flex items-center justify-between gap-3 bg-[#D9CFC7] text-[#37353E] font-bold px-4 py-1.5 rounded-lg hover:bg-[#C9B59C] transition-colors text-sm min-w-[100px] cursor-pointer"
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
                            className="absolute right-0 top-full mt-2 w-[140px] bg-[#EFE9E3] border border-[#D9CFC7] rounded-[16px] shadow-lg overflow-hidden z-50 py-2"
                          >
                            {[
                              { id: 'th', label: 'ไทย' },
                              { id: 'en', label: 'English' }
                            ].map(option => (
                              <button
                                key={option.id}
                                onClick={() => { setLang(option.id); setLangOpen(false); }}
                                className={`mx-1 w-[calc(100%-8px)] text-left px-3 py-2 text-sm font-semibold flex items-center justify-between rounded-lg hover:bg-[#D9CFC7] transition-colors cursor-pointer ${lang === option.id ? 'text-[#37353E] bg-[#D9CFC7]/50' : 'text-[#44444E]'}`}
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
                  <div className="flex flex-col items-center justify-center py-6 px-6 opacity-40">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#37353E] mb-3">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    <p className="text-[15px] font-bold text-[#37353E]">ไม่พบการตั้งค่าที่ค้นหา</p>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-[#D9CFC7] mt-6 mb-4"></div>
              
              <div className="flex-1"></div>

              {/* Save Button */}
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => onSave(theme, lang)}
                  className="bg-[#22C55E] hover:bg-green-600 text-white text-sm font-bold tracking-wide px-6 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
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
