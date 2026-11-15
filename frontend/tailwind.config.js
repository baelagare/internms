/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        subtle: 'var(--color-surface-subtle)',
        ink: 'var(--color-text)',
        muted: 'var(--color-text-secondary)',
        line: 'var(--color-border)',
        control: 'var(--color-border-strong)',
        accent: { DEFAULT: 'var(--color-accent)', hover: 'var(--color-accent-hover)', active: 'var(--color-accent-active)', subtle: 'var(--color-accent-subtle)' },
        success: { DEFAULT: 'var(--color-success)', surface: 'var(--color-success-surface)' },
        warning: { DEFAULT: 'var(--color-warning)', surface: 'var(--color-warning-surface)' },
        danger: { DEFAULT: 'var(--color-danger)', surface: 'var(--color-danger-surface)' },
        // Transitional aliases keep untouched role screens building during gated migration.
        navy: { 950: 'var(--color-text)', 900: 'var(--color-accent-active)', 800: 'var(--color-accent-hover)', 700: 'var(--color-accent)', 100: '#dbeafe', 50: 'var(--color-accent-subtle)' },
        gold: { 800: 'var(--color-text-secondary)', 500: 'var(--color-accent)', 50: 'var(--color-surface-subtle)' }
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-sans)']
      },
      borderRadius: { control: 'var(--radius-control)', panel: 'var(--radius-panel)', overlay: 'var(--radius-overlay)' },
      maxWidth: { content: '75rem', form: '45rem', auth: '27.5rem' },
      boxShadow: { panel: 'none', modal: 'var(--shadow-overlay)' }
    }
  },
  plugins: []
};

