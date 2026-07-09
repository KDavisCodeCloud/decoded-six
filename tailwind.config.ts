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
        // Public site — Design Standard (locked)
        void:    '#0a0a0f',
        panel:   '#0f0f15',
        raised:  '#15151c',
        // Brand gradient solids: pink → purple → cyan
        flame:   '#ec1272',
        purple:  '#7c3aed',
        ice:     '#2fc4e8',
        gold:    '#f0975a',   // sunset/orange — unconfirmed rumor tag only
        // Text scale
        bright:  '#ffffff',
        quiet:   'rgba(255,255,255,0.58)',
        whisper: 'rgba(255,255,255,0.35)',
        // Internal dashboard
        'dash-bg':     '#0D0014',
        'gta-gold':    '#C8A84B',
        'neon-pink':   '#FF2D6B',
        'dash-panel':  '#180025',
        'dash-border': '#2a0040',
      },
      fontFamily: {
        heading:   ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        body:      ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        ibm:       ['var(--font-ibm-plex-mono)', 'monospace'],
        pricedown: ['Pricedown', 'var(--font-archivo)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
