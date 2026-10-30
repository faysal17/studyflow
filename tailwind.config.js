/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0a0b0e',
        sidebar: '#12141a',
        surface: '#12141a',
        'surface-hover': '#1a1d26',
        border: '#222634',
        'border-subtle': 'rgba(255, 255, 255, 0.08)',
        zinc: {
          950: '#0a0b0e',
          900: '#12141a',
          850: '#161822',
          800: '#1a1d26',
          700: '#222634',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
          300: '#d4d4d8',
          200: '#e4e4e7',
          100: '#f4f4f5',
          50: '#fafafa',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
