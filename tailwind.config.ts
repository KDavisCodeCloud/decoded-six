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
        // Backgrounds
        void: '#07050d',
        panel: '#100c1a',
        raised: '#18122a',
        // Accents
        flame: '#e6358a',
        ice: '#00d2ff',
        gold: '#ffcc00',
        // Text
        bright: '#f0eef8',
        quiet: '#9b94b8',
        whisper: '#5a5270',
      },
      fontFamily: {
        heading: ['var(--font-rajdhani)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
