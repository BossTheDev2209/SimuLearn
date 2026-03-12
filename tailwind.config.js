/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        chakra: ['"Chakra Petch"', 'sans-serif'],
      },
      colors: {
        theme: {
          sidebar: 'var(--bg-theme-sidebar, #2B2D31)',
          panel: 'var(--bg-theme-panel, #313338)',
          main: 'var(--bg-theme-main, #1E1F22)',
          primary: 'var(--text-theme-primary, #F2F3F5)',
          muted: 'var(--text-theme-muted, #949BA4)',
          border: 'var(--border-theme-border, #3F4147)',
          hover: 'var(--bg-theme-hover, #3F4147)',
        }
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translate(-50%, 8px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}