/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terminal colors
        bg: '#050505',
        sidebar: '#0A0A0A',
        surface: '#111111',
        'surface-hover': '#1a1a1a',
        border: '#222222',
        'border-light': '#333333',

        // Accent colors
        cyan: '#00F0FF',
        gold: '#FFD700',
        green: '#00FF94',
        accent: '#FF0055',
        orange: '#FF6B35',

        // Text
        muted: '#666666',
        dim: '#444444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
