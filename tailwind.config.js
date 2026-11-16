/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07080d',
        panel: '#141722',
        mute: '#9aa3b5',
        pulse: '#2ee6a6',
        gold: '#f6c445',
        iris: '#8eaaef',
        coral: '#ff8a5b',
        lilac: '#c3b0ff',
      },
      fontFamily: {
        sans: ['Outfit', 'Avenir Next', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 48px rgba(46, 230, 166, 0.16)',
      },
    },
  },
  plugins: [],
}
