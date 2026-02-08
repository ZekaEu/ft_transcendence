/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
        },
        "background-light": "#f0f9ff",
        "background-dark": "#0f172a",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
      },
    },
  },
  plugins: [],
}
