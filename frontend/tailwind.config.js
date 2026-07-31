/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          900: '#0f0a2e',
          800: '#1e1b4b',
          700: '#312e81',
        },
        panel: '#1e1b4b',
        lens: {
          violet: '#8b5cf6',
          cyan: '#06b6d4',
          accent: '#a78bfa',
        },
      },
      backgroundImage: {
        'gradient-lens': 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        'gradient-bg': 'linear-gradient(180deg, #0f0a2e 0%, #1e1b4b 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
