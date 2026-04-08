/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          deepest: '#020617',
          surface: '#0f172a',
          elevated: '#1e293b'
        },
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb'
        }
      }
    },
  },
  plugins: [],
}
