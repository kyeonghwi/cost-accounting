import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          1: 'var(--color-text-1)',
          2: 'var(--color-text-2)',
          3: 'var(--color-text-3)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          dim: 'var(--color-accent-dim)',
          hover: 'var(--color-accent-hover)',
        },
        positive: {
          DEFAULT: 'var(--color-positive)',
          bg: 'var(--color-positive-bg)',
        },
        negative: {
          DEFAULT: 'var(--color-negative)',
          bg: 'var(--color-negative-bg)',
        },
        warn: {
          bg: 'var(--color-warn-bg)',
          border: 'var(--color-warn-border)',
          text: 'var(--color-warn-text)',
        },
      },
    },
  },
  plugins: [],
}

export default config
