/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        base: '#08090D',
        panel: '#0E1017',
        raised: '#141721',
        line: '#20242F',
        'line-strong': '#2C3140',
        fg: '#F1F2F6',
        sub: '#9AA1B4',
        dim: '#666D80',
        accent: '#6366F1',
        'accent-hover': '#7375F5',
        'accent-dim': '#4B4DD4',
        cyan: '#38BDF8',
        ok: '#4ADE80',
        warn: '#FBBF24',
        bad: '#F87171',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        lift: '0 2px 6px rgba(0,0,0,0.45), 0 24px 48px -24px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(99,102,241,0.35), 0 12px 40px -16px rgba(99,102,241,0.55)',
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
    },
  },
  plugins: [],
}
