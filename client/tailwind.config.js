/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forma: {
          50: '#faf6ee',
          100: '#f3ebda',
          200: '#e6d6b5',
          300: '#d7c08f',
          400: '#cbb06d',
          500: '#c5a059', // Official Brand Gold from Logo
          600: '#b38e45',
          700: '#967434',
          800: '#795d2c',
          900: '#4d3b1a',
          950: '#2a1f0a',
        },
        gold: {
          light: '#dfc185',
          DEFAULT: '#c5a059',
          dark: '#967434',
        }
      }
    },
  },
  plugins: [],
}
