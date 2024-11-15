/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'shooting-star': 'shooting-star 6s linear infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: 0.2, transform: 'scale(0.5)' },
          '50%': { opacity: 1, transform: 'scale(1)' },
        },
        'shooting-star': {
          '0%': { transform: 'translateX(0) translateY(0)' },
          '100%': { transform: 'translateX(-100vw) translateY(100vh)' },
        },
      },
      colors: { primary: '#1976d2', // You can customize this color 
      },
    },
  },
  plugins: [],
}