/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        torflix: {
          bg: '#0a0a0f',
          surface: '#12121a',
          card: '#1a1a28',
          border: 'rgba(255,255,255,0.05)',
          red: '#E84C3D',
          redHover: '#FF5A4A',
          blue: '#3498DB',
          green: '#2ECC71',
          amber: '#F39C12',
          text: '#E8E8E8',
          muted: '#7F8C8D',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
