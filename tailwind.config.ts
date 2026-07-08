import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Public site
        void: '#07050d',
        panel: '#100c1a',
        raised: '#18122a',
        flame: '#e6358a',
        ice: '#00d2ff',
        gold: '#ffcc00',
        bright: '#f0eef8',
        quiet: '#9b94b8',
        whisper: '#5a5270',
        // Internal dashboard (Vice City surface)
        'dash-bg': '#0D0014',
        'gta-gold': '#C8A84B',
        'neon-pink': '#FF2D6B',
        'dash-panel': '#180025',
        'dash-border': '#2a0040',
      },
      fontFamily: {
        heading: ['var(--font-rajdhani)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        pricedown: ['Pricedown', 'var(--font-rajdhani)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
