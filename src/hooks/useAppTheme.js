import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export function useAppTheme(myUserId) {
  const [userPreferences, setUserPreferences] = useState({ 
    theme: localStorage.getItem('theme') || 'system', 
    lang: 'th' 
  });

  // Sync Preferences from Firestore
  useEffect(() => {
    if (!myUserId || myUserId.startsWith("guest_")) return;
    
    const fetchPrefs = async () => {
      try {
        const docRef = doc(db, "users", myUserId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().settings) {
          setUserPreferences(docSnap.data().settings);
        }
      } catch(e) {
        console.error("Error fetching preferences:", e);
      }
    };
    fetchPrefs();
  }, [myUserId]);

  // Theme Engine
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = userPreferences?.theme || 'light';

    const applyTheme = (isDark) => {
      if (isDark) root.classList.add('dark');
      else root.classList.remove('dark');
    };

    if (currentTheme === 'system') {
      const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(systemQuery.matches);
      const handleSystemChange = (e) => applyTheme(e.matches);
      systemQuery.addEventListener('change', handleSystemChange);
      return () => systemQuery.removeEventListener('change', handleSystemChange);
    } else {
      applyTheme(currentTheme === 'dark');
    }
  }, [userPreferences?.theme]);

  const handleSaveSettings = async (newTheme, newLang) => {
    const newSettings = { theme: newTheme, lang: newLang };
    setUserPreferences(newSettings);
    localStorage.setItem("theme", newTheme);
    localStorage.setItem("lang", newLang);

    if (myUserId && !myUserId.startsWith("guest_")) {
      try {
        await setDoc(doc(db, "users", myUserId), {
          settings: newSettings,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("บันทึกการตั้งค่าไม่สำเร็จ", err);
      }
    }
  };

  return { userPreferences, handleSaveSettings };
}
