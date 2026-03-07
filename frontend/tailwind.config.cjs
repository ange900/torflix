/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sp: { red: '#E84C3D', blue: '#3498DB', darker: '#0D0D0D', dark: '#1A1A2E', surface: '#16162a' },
        cinemax: { red: '#E84C3D', dark: '#141414', darker: '#0D0D0D' },
        primary: { 50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#E84C3D',600:'#dc2626',700:'#b91c1c',800:'#991b1b',900:'#7f1d1d' },
      },
      borderRadius: { sp: '12px' },
      fontFamily: { sans: ['Inter','Plus Jakarta Sans','system-ui','sans-serif'] },
      animation: {
        'hero-fade': 'heroFade 0.6s ease-out',
        'hero-slide-up': 'heroSlideUp 0.6s ease-out both',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        heroFade: { '0%': { opacity:'0', transform:'scale(1.05)' }, '100%': { opacity:'1', transform:'scale(1)' } },
        heroSlideUp: { '0%': { opacity:'0', transform:'translateY(20px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        slideDown: { '0%': { opacity:'0', transform:'translateY(-10px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        fadeIn: { '0%': { opacity:'0' }, '100%': { opacity:'1' } },
      },
    },
  },
  plugins: [],
};
