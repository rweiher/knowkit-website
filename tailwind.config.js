/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        'primary-light': '#2D5A8E',
        'primary-dark': '#0F2440',
        accent: '#4A90D9',
        'accent-light': '#7BB8F0',
        cream: '#F8FAFC',
        'cream-dark': '#F1F5F9',
        'cream-darker': '#E2E8F0',
        text: '#0F172A',
        'text-muted': '#475569',
        'text-light': '#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        'float': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
        'pulse-soft': { '0%,100%': { opacity: '0.4' }, '50%': { opacity: '1' } },
      }
    }
  },
  plugins: [],
}
